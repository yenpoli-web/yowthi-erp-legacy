import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceivingOrderDto } from './dto/create-receiving-order.dto';
import { UpdateReceivingOrderDto } from './dto/update-receiving-order.dto';
import { CreateReceivingBatchDto } from './dto/create-receiving-batch.dto';
import { UpdateReceivingBatchDto } from './dto/update-receiving-batch.dto';
import { CreateReceivingDetailDto } from './dto/create-receiving-detail.dto';
import { UpdateReceivingDetailDto } from './dto/update-receiving-detail.dto';

@Injectable()
export class ReceivingService {
  constructor(private prisma: PrismaService) {}

  private fixDate(d: any): string {
    if (!d) return d;
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private fixOrderDate(order: any): any {
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  private async generateOrderId(receivingItemId: string, orderDate: Date): Promise<string> {
    const dateStr = `${orderDate.getUTCFullYear()}${String(orderDate.getUTCMonth()+1).padStart(2,'0')}${String(orderDate.getUTCDate()).padStart(2,'0')}`;
    const last = await this.prisma.receivingOrder.findFirst({
      where: { receivingItemId },
      orderBy: { createdAt: 'desc' },
    });
    const lastN = last ? parseInt(last.id.split('-')[2]) : 0;
    const nextN = lastN >= 4 ? 1 : lastN + 1;
    return `S-${dateStr}-${nextN}`;
  }

  async findAllOrders(itemId?: string, date?: string) {
    const orders = await this.prisma.receivingOrder.findMany({
      where: {
        isDeleted: false,
        ...(itemId && { receivingItemId: itemId }),
        ...(date && { orderDate: new Date(date) }),
      },
      include: {
        receivingItem: { select: { id: true, name: true, imageUrl: true } },
        batches: {
          where: { isDeleted: false },
          include: {
            farmer: { select: { id: true, name: true } },
            details: { where: { isDeleted: false } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(o => this.fixOrderDate(o));
  }

  async findDeletedOrders() {
    const orders = await this.prisma.receivingOrder.findMany({
      where: { isDeleted: true },
      include: {
        receivingItem: { select: { id: true, name: true, imageUrl: true } },
        batches: {
          include: {
            farmer: { select: { id: true, name: true } },
            details: true,
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });
    return orders.map(o => this.fixOrderDate(o));
  }

  async findOneOrder(id: string) {
    const order = await this.prisma.receivingOrder.findFirst({
      where: { id, isDeleted: false },
      include: {
        receivingItem: { select: { id: true, name: true, imageUrl: true } },
        batches: {
          where: { isDeleted: false },
          include: {
            farmer: { select: { id: true, name: true } },
            details: { where: { isDeleted: false } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException(`進貨單 ${id} 不存在`);
    return this.fixOrderDate(order);
  }

  async createOrder(dto: CreateReceivingOrderDto) {
    const [y, m, d] = dto.orderDate.split('-').map(Number);
    const orderDate = new Date(Date.UTC(y, m - 1, d));
    const existing = await this.prisma.receivingOrder.findFirst({
      where: { orderDate, receivingItemId: dto.receivingItemId, isDeleted: false },
    });
    if (existing) {
      throw new ConflictException(`${dto.orderDate} 已有進貨品項 ${dto.receivingItemId} 的進貨單（${existing.id}）`);
    }
    const id = await this.generateOrderId(dto.receivingItemId, orderDate);
    return this.prisma.receivingOrder.create({
      data: { id, orderDate, receivingItemId: dto.receivingItemId },
      include: { receivingItem: { select: { id: true, name: true, imageUrl: true } } },
    });
  }

  async updateOrder(id: string, dto: UpdateReceivingOrderDto) {
    await this.findOneOrder(id);
    return this.prisma.receivingOrder.update({ where: { id }, data: dto });
  }

  async markInSales(id: string, inSales: boolean) {
    const order = await this.prisma.receivingOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`ReceivingOrder ${id} not found`);
    return this.prisma.receivingOrder.update({
      where: { id },
      data: { inSales },
    });
  }

  async markSalesDone(id: string, done: boolean) {
    const order = await this.prisma.receivingOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`ReceivingOrder ${id} not found`);
    return this.prisma.receivingOrder.update({
      where: { id },
      data: { salesDone: done },
    });
  }

  async softDeleteOrder(id: string) {
    await this.findOneOrder(id);
    return this.prisma.receivingOrder.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteOrder(id: string, operatorId: number, ipAddress?: string) {
    const order = await this.prisma.receivingOrder.findUnique({
      where: { id },
      include: {
        batches: { include: { details: true } }
      }
    });
    if (!order) throw new NotFoundException(`進貨單 ${id} 不存在`);

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const batch of order.batches) {
          await tx.receivingDetail.deleteMany({ where: { batchId: batch.id } });
        }
        await tx.receivingBatch.deleteMany({ where: { orderId: id } });
        await tx.receivingOrder.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'receiving_orders',
            targetId: id,
            operatorId,
            ipAddress,
            beforeData: order as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：進貨單 ${id} 仍有相關資料參考`);
      }
      throw e;
    }

    return { message: `進貨單 ${id} 已永久刪除` };
  }

  async findAllBatches(orderId?: string) {
    return this.prisma.receivingBatch.findMany({
      where: { isDeleted: false, ...(orderId && { orderId }) },
      include: {
        farmer: { select: { id: true, name: true } },
        details: { where: { isDeleted: false } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createBatch(dto: CreateReceivingBatchDto) {
    const existing = await this.prisma.receivingBatch.findMany({
      where: { orderId: dto.orderId, farmerId: dto.farmerId },
    });
    const batchNo = existing.length + 1;
    const id = `${dto.orderId}-${dto.farmerId}-${batchNo}`;
    return this.prisma.receivingBatch.create({
      data: { id, orderId: dto.orderId, farmerId: dto.farmerId, batchNo },
      include: { farmer: { select: { id: true, name: true } } },
    });
  }

  async updateBatch(id: string, dto: UpdateReceivingBatchDto) {
    const batch = await this.prisma.receivingBatch.findFirst({ where: { id, isDeleted: false } });
    if (!batch) throw new NotFoundException(`批次 ${id} 不存在`);
    return this.prisma.receivingBatch.update({ where: { id }, data: dto });
  }

  async softDeleteBatch(id: string) {
    const batch = await this.prisma.receivingBatch.findFirst({ where: { id, isDeleted: false } });
    if (!batch) throw new NotFoundException(`批次 ${id} 不存在`);
    await this.prisma.$transaction(async (tx) => {
      await tx.receivingDetail.updateMany({
        where: { batchId: id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      await tx.receivingBatch.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });
    return { message: `批次 ${id} 已刪除` };
  }

  async hardDeleteBatch(id: string, operatorId: number, ipAddress?: string) {
    const batch = await this.prisma.receivingBatch.findUnique({
      where: { id },
      include: { details: true },
    });
    if (!batch) throw new NotFoundException(`批次 ${id} 不存在`);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.receivingDetail.deleteMany({ where: { batchId: id } });
        await tx.receivingBatch.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'receiving_batches',
            targetId: id,
            operatorId,
            ipAddress,
            beforeData: batch as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：批次 ${id} 仍有相關資料參考`);
      }
      throw e;
    }

    return { message: `批次 ${id} 已永久刪除` };
  }

  async findOneOrderWithDeleted(id: string) {
    const order = await this.prisma.receivingOrder.findUnique({
      where: { id },
      include: {
        receivingItem: { select: { id: true, name: true, imageUrl: true } },
        batches: {
          include: {
            farmer: { select: { id: true, name: true } },
            details: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException(`進貨單 ${id} 不存在`);
    return this.fixOrderDate(order);
  }

  async createDetail(dto: CreateReceivingDetailDto) {
    const amount = Math.floor(dto.quantity * dto.unitPrice);
    return this.prisma.receivingDetail.create({
      data: { batchId: dto.batchId, itemId: dto.itemId, farmerId: dto.farmerId, quantity: dto.quantity, unitPrice: dto.unitPrice, amount },
    });
  }

  async updateDetail(id: number, dto: UpdateReceivingDetailDto) {
    const detail = await this.prisma.receivingDetail.findFirst({ where: { id, isDeleted: false } });
    if (!detail) throw new NotFoundException(`明細 ${id} 不存在`);
    const newQty = dto.quantity ?? Number(detail.quantity);
    const newPrice = dto.unitPrice ?? Number(detail.unitPrice);
    const amount = Math.floor(newQty * newPrice);
    return this.prisma.receivingDetail.update({
      where: { id },
      data: { ...(dto.quantity !== undefined && { quantity: dto.quantity }), ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }), amount },
    });
  }

  async softDeleteDetail(id: number) {
    const detail = await this.prisma.receivingDetail.findFirst({ where: { id, isDeleted: false } });
    if (!detail) throw new NotFoundException(`明細 ${id} 不存在`);
    return this.prisma.receivingDetail.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteDetail(id: number, operatorId: number, ipAddress?: string) {
    const detail = await this.prisma.receivingDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`明細 ${id} 不存在`);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.receivingDetail.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'receiving_details',
            targetId: String(id),
            operatorId,
            ipAddress,
            beforeData: detail as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：明細 ${id} 仍有相關資料參考`);
      }
      throw e;
    }

    return { message: `明細 ${id} 已永久刪除` };
  }
}

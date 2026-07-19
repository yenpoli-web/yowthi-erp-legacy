import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreatePurchaseDetailDto } from './dto/create-purchase-detail.dto';
import { UpdatePurchaseDetailDto } from './dto/update-purchase-detail.dto';

@Injectable()
export class PurchaseService {
  constructor(private prisma: PrismaService) {}

  private fixDate(d: any): string {
    if (!d) return d;
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private async generateOrderNo(dateStr: string): Promise<string> {
    const yyyymmdd = dateStr.replace(/-/g, '');
    const prefix = `B-${yyyymmdd}-`;
    const last = await this.prisma.purchaseOrder.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: 'desc' },
    });
    const nextSeq = last ? parseInt(last.id.split('-')[2], 10) + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  }

  private orderInclude() {
    return {
      details: {
        where: { isDeleted: false },
        include: { item: true },
        orderBy: { id: 'asc' as const },
      },
    };
  }

  async findAll() {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { isDeleted: false },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  async findDeleted() {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { isDeleted: true },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  async findOne(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        details: {
          include: { item: true },
          orderBy: { id: 'asc' as const },
        },
      },
    });
    if (!order) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  async create(dto: CreatePurchaseOrderDto) {
    const [yyyy, mm, dd] = dto.orderDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(yyyy, mm - 1, dd));
    const dateStr = this.fixDate(dateObj);
    const id = await this.generateOrderNo(dateStr);
    const order = await this.prisma.purchaseOrder.create({
      data: { id, orderDate: dateObj },
      include: this.orderInclude(),
    });
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  async softDelete(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string, operatorId: number, ip?: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { details: true },
    });
    if (!order) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.purchaseDetail.deleteMany({ where: { orderId: id } });
        await tx.purchaseOrder.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'purchase_orders',
            targetId: id,
            operatorId,
            ipAddress: ip,
            beforeData: order as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：PurchaseOrder ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { success: true, deletedId: id };
  }

  // ── Details ────────────────────────────────────────────────

  async createDetail(dto: CreatePurchaseDetailDto) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException(`PurchaseOrder ${dto.orderId} not found`);
    const amount = Math.floor(Number(dto.quantity) * Number(dto.unitPrice));
    return this.prisma.purchaseDetail.create({
      data: {
        orderId: dto.orderId,
        itemId: dto.itemId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        amount,
        notes: dto.notes ?? null,
      },
      include: { item: true },
    });
  }

  async updateDetail(id: number, dto: UpdatePurchaseDetailDto) {
    const detail = await this.prisma.purchaseDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`PurchaseDetail ${id} not found`);
    const quantity = dto.quantity !== undefined ? dto.quantity : Number(detail.quantity);
    const unitPrice = dto.unitPrice !== undefined ? dto.unitPrice : Number(detail.unitPrice);
    const amount = Math.floor(quantity * unitPrice);
    return this.prisma.purchaseDetail.update({
      where: { id },
      data: {
        ...(dto.itemId !== undefined && { itemId: dto.itemId }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        amount,
      },
      include: { item: true },
    });
  }

  async softDeleteDetail(id: number) {
    const detail = await this.prisma.purchaseDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`PurchaseDetail ${id} not found`);
    return this.prisma.purchaseDetail.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteDetail(id: number, operatorId: number, ip?: string) {
    const detail = await this.prisma.purchaseDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`PurchaseDetail ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.purchaseDetail.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'purchase_details',
            targetId: String(id),
            operatorId,
            ipAddress: ip,
            beforeData: detail as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：PurchaseDetail ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { success: true, deletedId: id };
  }
}

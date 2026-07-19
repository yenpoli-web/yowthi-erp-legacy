import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackagingOrderDto } from './dto/create-packaging-order.dto';
import { UpdatePackagingOrderDto } from './dto/update-packaging-order.dto';
import { CreatePackagingDetailDto } from './dto/create-packaging-detail.dto';
import { UpdatePackagingDetailDto } from './dto/update-packaging-detail.dto';

@Injectable()
export class PackagingService {
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
    const prefix = `P-${yyyymmdd}-`;
    const last = await this.prisma.packagingOrder.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: 'desc' },
    });
    const nextSeq = last ? parseInt(last.id.split('-')[2], 10) + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  }

  async findAvailableReceivingOrders() {
    const orders = await this.prisma.receivingOrder.findMany({
      where: { isDeleted: false, h02Done: true },
      include: { receivingItem: true },
      orderBy: { id: 'desc' },
    });
    return orders.map((o) => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  private orderInclude() {
    return {
      salesOrder: { select: { id: true, orderDate: true, customer: { select: { id: true, name: true } } } },
      receivingOrder: { select: { id: true, orderDate: true, receivingItem: { select: { id: true, name: true } } } },
      details: {
        where: { isDeleted: false },
        include: { employee: true, item: true },
        orderBy: { id: 'asc' as const },
      },
    };
  }

  async findAllOrders() {
    const orders = await this.prisma.packagingOrder.findMany({
      where: { isDeleted: false },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  async findDeletedOrders() {
    const orders = await this.prisma.packagingOrder.findMany({
      where: { isDeleted: true },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  async findOneOrder(id: string) {
    const order = await this.prisma.packagingOrder.findUnique({
      where: { id },
      include: {
        salesOrder: { select: { id: true, orderDate: true, customer: { select: { id: true, name: true } } } },
        receivingOrder: { select: { id: true, orderDate: true, receivingItem: { select: { id: true, name: true } } } },
        details: {
          include: { employee: true, item: true },
          orderBy: { id: 'asc' as const },
        },
      },
    });
    if (!order) throw new NotFoundException(`PackagingOrder ${id} not found`);
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  async createOrder(dto: CreatePackagingOrderDto) {
    const [yyyy, mm, dd] = dto.orderDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(yyyy, mm - 1, dd));
    const dateStr = this.fixDate(dateObj);
    const id = await this.generateOrderNo(dateStr);
    // 空字串視同未填，避免外鍵欄位收到 '' 造成 Prisma 外鍵約束裸錯誤（P2003）
    const salesOrderId = dto.salesOrderId || null;
    const receivingOrderId = dto.receivingOrderId || null;
    try {
      const order = await this.prisma.packagingOrder.create({
        data: {
          id,
          orderDate: dateObj,
          salesOrderId,
          receivingOrderId,
        },
        include: this.orderInclude(),
      });
      return { ...order, orderDate: this.fixDate(order.orderDate) };
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2025') {
        throw new ConflictException('關聯的銷售單或進貨單不存在，請重新選擇');
      }
      throw e;
    }
  }

  async updateOrder(id: string, dto: UpdatePackagingOrderDto) {
    const order = await this.prisma.packagingOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`PackagingOrder ${id} not found`);
    return this.prisma.packagingOrder.update({
      where: { id },
      data: {
        ...(dto.salesOrderId !== undefined && { salesOrderId: dto.salesOrderId }),
        ...(dto.receivingOrderId !== undefined && { receivingOrderId: dto.receivingOrderId }),
      },
      include: this.orderInclude(),
    });
  }

  // ── 包装單 salesDone 手動確認（被標記後會在列表畫面被划入「已完成銷售」存放區，不再顯示在主画面）
  async markSalesDone(id: string, done: boolean) {
    const order = await this.prisma.packagingOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`PackagingOrder ${id} not found`);
    return this.prisma.packagingOrder.update({
      where: { id },
      data: { salesDone: done },
      include: this.orderInclude(),
    });
  }

  async softDeleteOrder(id: string) {
    const order = await this.prisma.packagingOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`PackagingOrder ${id} not found`);
    return this.prisma.packagingOrder.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteOrder(id: string, operatorId: number, ip?: string) {
    const order = await this.prisma.packagingOrder.findUnique({
      where: { id },
      include: { details: true },
    });
    if (!order) throw new NotFoundException(`PackagingOrder ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.packagingDetail.deleteMany({ where: { orderId: id } });
        await tx.packagingOrder.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'packaging_orders',
            targetId: id,
            operatorId,
            ipAddress: ip,
            beforeData: order as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：PackagingOrder ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { success: true, deletedId: id };
  }

  async createDetail(dto: CreatePackagingDetailDto) {
    const order = await this.prisma.packagingOrder.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException(`PackagingOrder ${dto.orderId} not found`);
    const amount = Math.floor(Number(dto.quantity) * Number(dto.wageRate));
    return this.prisma.packagingDetail.create({
      data: {
        orderId: dto.orderId,
        employeeId: dto.employeeId,
        itemId: dto.itemId,
        quantity: dto.quantity,
        wageRate: dto.wageRate,
        amount,
        notes: dto.notes,
      },
      include: { employee: true, item: true },
    });
  }

  async updateDetail(id: number, dto: UpdatePackagingDetailDto) {
    const detail = await this.prisma.packagingDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`PackagingDetail ${id} not found`);
    const quantity = dto.quantity !== undefined ? dto.quantity : Number(detail.quantity);
    const wageRate = dto.wageRate !== undefined ? dto.wageRate : Number(detail.wageRate);
    const amount = Math.floor(Number(quantity) * Number(wageRate));
    return this.prisma.packagingDetail.update({
      where: { id },
      data: {
        ...(dto.itemId && { itemId: dto.itemId }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.wageRate !== undefined && { wageRate: dto.wageRate }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        amount,
      },
      include: { employee: true, item: true },
    });
  }

  async softDeleteDetail(id: number) {
    const detail = await this.prisma.packagingDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`PackagingDetail ${id} not found`);
    return this.prisma.packagingDetail.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteDetail(id: number, operatorId: number, ip?: string) {
    const detail = await this.prisma.packagingDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`PackagingDetail ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.packagingDetail.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'packaging_details',
            targetId: String(id),
            operatorId,
            ipAddress: ip,
            beforeData: detail as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：PackagingDetail ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { success: true, deletedId: id };
  }
}

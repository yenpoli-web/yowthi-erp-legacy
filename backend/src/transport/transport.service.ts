import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransportOrderDto } from './dto/create-transport-order.dto';
import { UpdateTransportOrderDto } from './dto/update-transport-order.dto';

@Injectable()
export class TransportService {
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
    const prefix = `T-${yyyymmdd}-`;
    const last = await this.prisma.transportOrder.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: 'desc' },
    });
    const nextSeq = last ? parseInt(last.id.split('-')[2], 10) + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  }

  private orderInclude() {
    return {
      carrier: { select: { id: true, name: true } },
    };
  }

  async findAll() {
    const orders = await this.prisma.transportOrder.findMany({
      where: { isDeleted: false },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  async findDeleted() {
    const orders = await this.prisma.transportOrder.findMany({
      where: { isDeleted: true },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  async findOne(id: string) {
    const order = await this.prisma.transportOrder.findUnique({
      where: { id },
      include: this.orderInclude(),
    });
    if (!order) throw new NotFoundException(`TransportOrder ${id} not found`);
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  async create(dto: CreateTransportOrderDto) {
    const [yyyy, mm, dd] = dto.orderDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(yyyy, mm - 1, dd));
    const dateStr = this.fixDate(dateObj);
    const id = await this.generateOrderNo(dateStr);
    const amount = Math.floor(Number(dto.quantity) * Number(dto.unitPrice));
    const order = await this.prisma.transportOrder.create({
      data: {
        id,
        orderDate: dateObj,
        carrierId: dto.carrierId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        amount,
        notes: dto.notes ?? null,
      },
      include: this.orderInclude(),
    });
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  async update(id: string, dto: UpdateTransportOrderDto) {
    const order = await this.prisma.transportOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`TransportOrder ${id} not found`);

    const quantity = dto.quantity !== undefined ? dto.quantity : Number(order.quantity);
    const unitPrice = dto.unitPrice !== undefined ? dto.unitPrice : Number(order.unitPrice);
    const amount = Math.floor(quantity * unitPrice);

    return this.prisma.transportOrder.update({
      where: { id },
      data: {
        ...(dto.carrierId !== undefined && { carrierId: dto.carrierId }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        amount,
      },
      include: this.orderInclude(),
    });
  }

  async softDelete(id: string) {
    const order = await this.prisma.transportOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`TransportOrder ${id} not found`);
    return this.prisma.transportOrder.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string, operatorId: number, ip?: string) {
    const order = await this.prisma.transportOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`TransportOrder ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.transportOrder.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'transport_orders',
            targetId: id,
            operatorId,
            ipAddress: ip,
            beforeData: order as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：TransportOrder ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { success: true, deletedId: id };
  }
}

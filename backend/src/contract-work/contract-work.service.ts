import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractWorkOrderDto } from './dto/create-contract-work-order.dto';
import { CreateContractWorkDetailDto } from './dto/create-contract-work-detail.dto';
import { UpdateContractWorkDetailDto } from './dto/update-contract-work-detail.dto';

@Injectable()
export class ContractWorkService {
  constructor(private prisma: PrismaService) {}

  private fixDate(d: any): string {
    if (!d) return d;
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private parseDate(ddmmyyyy: string): Date {
    const [dd, mm, yyyy] = ddmmyyyy.split('-').map(Number);
    return new Date(Date.UTC(yyyy, mm - 1, dd));
  }

  private async generateOrderNo(dateStr: string): Promise<string> {
    const yyyymmdd = dateStr.replace(/-/g, '');
    const prefix = `C-${yyyymmdd}-`;
    const last = await this.prisma.contractWorkOrder.findFirst({
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
        include: { supplier: true, product: true },
        orderBy: { id: 'asc' as const },
      },
    };
  }

  async findAllOrders() {
    const orders = await this.prisma.contractWorkOrder.findMany({
      where: { isDeleted: false },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  async findDeletedOrders() {
    const orders = await this.prisma.contractWorkOrder.findMany({
      where: { isDeleted: true },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  async findOneOrder(id: string) {
    const order = await this.prisma.contractWorkOrder.findUnique({
      where: { id },
      include: {
        details: {
          include: { supplier: true, product: true },
          orderBy: { id: 'asc' as const },
        },
      },
    });
    if (!order) throw new NotFoundException(`ContractWorkOrder ${id} not found`);
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  async createOrder(dto: CreateContractWorkOrderDto) {
    const dateObj = this.parseDate(dto.orderDate);
    const dateStr = this.fixDate(dateObj);
    const id = await this.generateOrderNo(dateStr);
    const order = await this.prisma.contractWorkOrder.create({
      data: { id, orderDate: dateObj },
      include: this.orderInclude(),
    });
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  async softDeleteOrder(id: string) {
    const order = await this.prisma.contractWorkOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`ContractWorkOrder ${id} not found`);
    return this.prisma.contractWorkOrder.update({
      where: { id }, data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteOrder(id: string, operatorId: number, ip?: string) {
    const order = await this.prisma.contractWorkOrder.findUnique({
      where: { id }, include: { details: true },
    });
    if (!order) throw new NotFoundException(`ContractWorkOrder ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.contractWorkDetail.deleteMany({ where: { orderId: id } });
        await tx.inventoryContractOrder.deleteMany({ where: { contractOrderId: id } });
        await tx.contractWorkOrder.delete({ where: { id } });
        await tx.auditLog.create({
          data: { actionType: 'HARD_DELETE', targetTable: 'contract_work_orders', targetId: id, operatorId, ipAddress: ip, beforeData: order as any },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：ContractWorkOrder ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { success: true, deletedId: id };
  }

  async createDetail(dto: CreateContractWorkDetailDto) {
    const order = await this.prisma.contractWorkOrder.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException(`ContractWorkOrder ${dto.orderId} not found`);
    const amount = Math.floor(Number(dto.quantity) * Number(dto.weight) * Number(dto.unitPrice));
    return this.prisma.contractWorkDetail.create({
      data: { orderId: dto.orderId, supplierId: dto.supplierId, productId: dto.productId, quantity: dto.quantity, weight: dto.weight, unitPrice: dto.unitPrice, amount, notes: dto.notes },
      include: { supplier: true, product: true },
    });
  }

  async updateDetail(id: number, dto: UpdateContractWorkDetailDto) {
    const detail = await this.prisma.contractWorkDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`ContractWorkDetail ${id} not found`);
    const quantity = dto.quantity !== undefined ? dto.quantity : Number(detail.quantity);
    const weight = dto.weight !== undefined ? dto.weight : Number(detail.weight);
    const unitPrice = dto.unitPrice !== undefined ? dto.unitPrice : Number(detail.unitPrice);
    const amount = Math.floor(Number(quantity) * Number(weight) * Number(unitPrice));
    return this.prisma.contractWorkDetail.update({
      where: { id },
      data: { ...(dto.supplierId && { supplierId: dto.supplierId }), ...(dto.productId && { productId: dto.productId }), ...(dto.quantity !== undefined && { quantity: dto.quantity }), ...(dto.weight !== undefined && { weight: dto.weight }), ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }), ...(dto.notes !== undefined && { notes: dto.notes }), amount },
      include: { supplier: true, product: true },
    });
  }

  async softDeleteDetail(id: number) {
    const detail = await this.prisma.contractWorkDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`ContractWorkDetail ${id} not found`);
    return this.prisma.contractWorkDetail.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
  }

  async hardDeleteDetail(id: number, operatorId: number, ip?: string) {
    const detail = await this.prisma.contractWorkDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`ContractWorkDetail ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.contractWorkDetail.delete({ where: { id } });
        await tx.auditLog.create({ data: { actionType: 'HARD_DELETE', targetTable: 'contract_work_details', targetId: String(id), operatorId, ipAddress: ip, beforeData: detail as any } });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：ContractWorkDetail ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { success: true, deletedId: id };
  }
}
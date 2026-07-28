import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryOrderDto } from './dto/create-inventory-order.dto';
import { CreateInventoryDetailDto } from './dto/create-inventory-detail.dto';
import { UpdateInventoryDetailDto } from './dto/update-inventory-detail.dto';
import { AddInventoryReceivingOrdersDto } from './dto/add-inventory-receiving-orders.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private async ensureDetailHasNoSalesLinks(id: number) {
    const linkedCount = await this.prisma.salesInventoryDetail.count({
      where: { inventoryDetailId: id },
    });
    if (linkedCount > 0) {
      throw new ConflictException(
        '此入庫明細已綁定銷售單，請先解除銷售關聯再修改或刪除',
      );
    }
  }

  private async ensureOrderHasNoSalesLinks(id: string) {
    const linkedCount = await this.prisma.salesInventoryDetail.count({
      where: { inventoryDetail: { orderId: id } },
    });
    if (linkedCount > 0) {
      throw new ConflictException(
        '此入庫單已有明細綁定銷售單，請先解除全部銷售關聯再刪除',
      );
    }
  }

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
    const prefix = `I-${yyyymmdd}-`;
    const last = await this.prisma.inventoryOrder.findFirst({
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
        include: { product: true },
        orderBy: { id: 'asc' as const },
      },
      receivingOrders: {
        include: {
          receivingOrder: {
            include: { receivingItem: true },
          },
        },
      },
      contractOrders: {
        include: {
          contractOrder: {
            include: {
              details: {
                where: { isDeleted: false },
                include: { product: true, supplier: true },
              },
            },
          },
        },
      },
    };
  }

  // ── 主單 ──────────────────────────────────────────────────

  async findAllOrders() {
    const orders = await this.prisma.inventoryOrder.findMany({
      where: { isDeleted: false },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  async findDeletedOrders() {
    const orders = await this.prisma.inventoryOrder.findMany({
      where: { isDeleted: true },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  async findOneOrder(id: string) {
    const order = await this.prisma.inventoryOrder.findUnique({
      where: { id },
      include: this.orderInclude(),
    });
    if (!order) throw new NotFoundException(`InventoryOrder ${id} not found`);
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  async createOrder(dto: CreateInventoryOrderDto) {
    const dateObj = this.parseDate(dto.orderDate);
    const dateStr = this.fixDate(dateObj);
    const id = await this.generateOrderNo(dateStr);
    const order = await this.prisma.inventoryOrder.create({
      data: { id, orderDate: dateObj, notes: dto.notes },
      include: this.orderInclude(),
    });
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  async softDeleteOrder(id: string) {
    const order = await this.prisma.inventoryOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`InventoryOrder ${id} not found`);
    await this.ensureOrderHasNoSalesLinks(id);
    return this.prisma.inventoryOrder.update({
      where: { id }, data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteOrder(id: string, operatorId: number, ip?: string) {
    const order = await this.prisma.inventoryOrder.findUnique({
      where: { id }, include: { details: true, receivingOrders: true },
    });
    if (!order) throw new NotFoundException(`InventoryOrder ${id} not found`);
    await this.ensureOrderHasNoSalesLinks(id);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.inventoryReceivingOrder.deleteMany({ where: { inventoryOrderId: id } });
        await tx.inventoryContractOrder.deleteMany({ where: { inventoryOrderId: id } });
        await tx.inventoryDetail.deleteMany({ where: { orderId: id } });
        await tx.inventoryOrder.delete({ where: { id } });
        await tx.auditLog.create({
          data: { actionType: 'HARD_DELETE', targetTable: 'inventory_orders', targetId: id, operatorId, ipAddress: ip, beforeData: order as any },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：InventoryOrder ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { success: true, deletedId: id };
  }

  // ── 明細 ──────────────────────────────────────────────────

  async createDetail(dto: CreateInventoryDetailDto) {
    const order = await this.prisma.inventoryOrder.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException(`InventoryOrder ${dto.orderId} not found`);
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);
    const amount = Math.floor(dto.weight * dto.quantity * dto.unitPrice);
    return this.prisma.inventoryDetail.create({
      data: {
        orderId: dto.orderId,
        productId: dto.productId,
        quantity: dto.quantity,
        weight: dto.weight,
        unitPrice: dto.unitPrice,
        amount,
      },
      include: { product: true },
    });
  }

  async updateDetail(id: number, dto: UpdateInventoryDetailDto) {
    const detail = await this.prisma.inventoryDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`InventoryDetail ${id} not found`);
    await this.ensureDetailHasNoSalesLinks(id);
    const nextQuantity = dto.quantity !== undefined ? dto.quantity : detail.quantity;
    const nextWeight = dto.weight !== undefined ? dto.weight : Number(detail.weight);
    const nextUnitPrice = dto.unitPrice !== undefined ? dto.unitPrice : Number(detail.unitPrice);
    const amount = Math.floor(nextWeight * nextQuantity * nextUnitPrice);
    return this.prisma.inventoryDetail.update({
      where: { id },
      data: {
        ...(dto.productId && { productId: dto.productId }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
        amount,
      },
      include: { product: true },
    });
  }

  async softDeleteDetail(id: number) {
    const detail = await this.prisma.inventoryDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`InventoryDetail ${id} not found`);
    await this.ensureDetailHasNoSalesLinks(id);
    return this.prisma.inventoryDetail.update({
      where: { id }, data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteDetail(id: number, operatorId: number, ip?: string) {
    const detail = await this.prisma.inventoryDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`InventoryDetail ${id} not found`);
    await this.ensureDetailHasNoSalesLinks(id);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.inventoryDetail.delete({ where: { id } });
        await tx.auditLog.create({
          data: { actionType: 'HARD_DELETE', targetTable: 'inventory_details', targetId: String(id), operatorId, ipAddress: ip, beforeData: detail as any },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：InventoryDetail ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { success: true, deletedId: id };
  }

  // ── 進貨單關聯 ────────────────────────────────────────────

  async addReceivingOrders(orderId: string, dto: AddInventoryReceivingOrdersDto) {
    const order = await this.prisma.inventoryOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`InventoryOrder ${orderId} not found`);
    const existing = await this.prisma.inventoryReceivingOrder.findMany({ where: { inventoryOrderId: orderId } });
    const existingIds = new Set(existing.map(e => e.receivingOrderId));
    const newIds = dto.receivingOrderIds.filter(id => !existingIds.has(id));
    if (newIds.length === 0) return { added: 0 };
    await this.prisma.inventoryReceivingOrder.createMany({
      data: newIds.map(rid => ({ inventoryOrderId: orderId, receivingOrderId: rid })),
    });
    return { added: newIds.length };
  }

  async removeReceivingOrder(orderId: string, receivingOrderId: string) {
    await this.prisma.inventoryReceivingOrder.delete({
      where: { inventoryOrderId_receivingOrderId: { inventoryOrderId: orderId, receivingOrderId } },
    });
    return { success: true };
  }

  async addContractOrders(orderId: string, contractOrderIds: string[]) {
    const order = await this.prisma.inventoryOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`InventoryOrder ${orderId} not found`);
    const existing = await this.prisma.inventoryContractOrder.findMany({ where: { inventoryOrderId: orderId } });
    const existingIds = new Set(existing.map(e => e.contractOrderId));
    const newIds = contractOrderIds.filter(id => !existingIds.has(id));
    if (newIds.length === 0) return { added: 0 };
    await this.prisma.inventoryContractOrder.createMany({
      data: newIds.map(cid => ({ inventoryOrderId: orderId, contractOrderId: cid })),
    });
    // 標記代工單已轉入庫
    await this.prisma.contractWorkOrder.updateMany({
      where: { id: { in: newIds } },
      data: { inventoryDone: true },
    });
    return { added: newIds.length };
  }

  async removeContractOrder(orderId: string, contractOrderId: string) {
    await this.prisma.inventoryContractOrder.delete({
      where: { inventoryOrderId_contractOrderId: { inventoryOrderId: orderId, contractOrderId } },
    });
    // 回退代工單狀態
    const remaining = await this.prisma.inventoryContractOrder.findFirst({ where: { contractOrderId } });
    if (!remaining) {
      await this.prisma.contractWorkOrder.update({ where: { id: contractOrderId }, data: { inventoryDone: false } });
    }
    return { success: true };
  }

  async findAvailableContractOrders() {
    const orders = await this.prisma.contractWorkOrder.findMany({
      where: { isDeleted: false, inventoryDone: false },
      include: {
        details: {
          where: { isDeleted: false },
          include: { product: true, supplier: true },
        },
      },
      orderBy: { id: 'desc' },
    });
    // 只回傳「所有明細都已鎖定成本」的代工單（逼使用者先去「代工成本鎖定」鎖定完成）
    return orders
      .filter((o) => o.details.length > 0 && o.details.every((d) => d.costLocked))
      .map((o) => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  // ── 可選進貨單（依加工類型篩選 h02Done / h03Done）────────

  async findAvailableReceivingOrders(processingType?: string) {
    const where: any = { isDeleted: false, salesDone: false };
    if (processingType === 'H02') {
      where.h02Done = true;
      where.costLocked = true; // H02出口路徑：進貨單必需先鎖定生產成本才能選去入庫（逼使用者先去「庫存成本分析」鎖定）
    } else if (processingType === 'H03') {
      where.h03Done = true;
    } else {
      where.OR = [{ h02Done: true }, { h03Done: true }];
    }
    const orders = await this.prisma.receivingOrder.findMany({
      where,
      include: { receivingItem: true },
      orderBy: { id: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  // ── 進貨單 salesDone 手動確認 ─────────────────────────────

  async markSalesDone(receivingOrderId: string, done: boolean) {
    const order = await this.prisma.receivingOrder.findUnique({ where: { id: receivingOrderId } });
    if (!order) throw new NotFoundException(`ReceivingOrder ${receivingOrderId} not found`);
    return this.prisma.receivingOrder.update({
      where: { id: receivingOrderId },
      data: { salesDone: done },
    });
  }

  async markContractSalesDone(contractOrderId: string, done: boolean) {
    const order = await this.prisma.contractWorkOrder.findUnique({ where: { id: contractOrderId } });
    if (!order) throw new NotFoundException(`ContractWorkOrder ${contractOrderId} not found`);
    return this.prisma.contractWorkOrder.update({
      where: { id: contractOrderId },
      data: { salesDone: done },
    });
  }

  // ── 庫存統計（依商品統計）────────────────────────────────

  async getStockSummary() {
    const produced = await this.prisma.inventoryDetail.groupBy({
      by: ['productId'],
      where: { isDeleted: false },
      _sum: { quantity: true },
    });

    const soldRaw = await this.prisma.salesInventoryDetail.groupBy({
      by: ['inventoryDetailId'],
      _sum: { quantity: true },
    });

    const detailIds = soldRaw.map(s => s.inventoryDetailId);
    const details = detailIds.length > 0
      ? await this.prisma.inventoryDetail.findMany({ where: { id: { in: detailIds } }, select: { id: true, productId: true } })
      : [];

    const soldByProduct: Record<string, number> = {};
    for (const s of soldRaw) {
      const detail = details.find(d => d.id === s.inventoryDetailId);
      if (detail) {
        soldByProduct[detail.productId] = (soldByProduct[detail.productId] ?? 0) + (s._sum.quantity ?? 0);
      }
    }

    const productIds = [...new Set([...produced.map(p => p.productId), ...Object.keys(soldByProduct)])];
    const products = productIds.length > 0
      ? await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, imageUrl: true } })
      : [];

    return products.map(p => {
      const producedQty = produced.find(pr => pr.productId === p.id)?._sum.quantity ?? 0;
      const soldQty = soldByProduct[p.id] ?? 0;
      return {
        productId: p.id,
        productName: p.name,
        imageUrl: p.imageUrl,
        produced: Number(producedQty),
        sold: Number(soldQty),
        stock: Number(producedQty) - Number(soldQty),
      };
    });
  }

  // ── 可選入庫明細（供銷售系統選取，依商品類型篩選）────────

  async findAvailableInventoryDetails(productType?: string) {
    const where: any = { isDeleted: false };
    if (productType === 'EXPORT' || productType === 'DOMESTIC') {
      where.product = { productType };
    }
    const details = await this.prisma.inventoryDetail.findMany({
      where,
      include: {
        product: true,
        order: {
          include: {
            contractOrders: { select: { contractOrderId: true } },
          },
        },
        salesDetails: { select: { quantity: true } },
      },
      orderBy: { id: 'desc' },
    });

    return details.map(d => {
      const soldQty = d.salesDetails.reduce((s, sd) => s + sd.quantity, 0);
      const availableQty = d.quantity - soldQty;
      const salesStatus = soldQty <= 0
        ? 'NONE'
        : soldQty >= d.quantity
          ? 'DONE'
          : 'IN_SALES';
      const isContract = (d.order as any).contractOrders?.length > 0;
      return {
        id: d.id,
        orderId: d.orderId,
        orderDate: this.fixDate(d.order.orderDate),
        productId: d.productId,
        productName: d.product.name,
        productImageUrl: d.product.imageUrl,
        productType: d.product.productType,
        unitWeight: d.product.unitWeight ? Number(d.product.unitWeight) : null,
        quantity: d.quantity,
        soldQty,
        availableQty,
        salesStatus,
        sourceType: isContract ? 'contract' : 'receiving',
      };
    }).filter(d => d.availableQty > 0);
  }
}

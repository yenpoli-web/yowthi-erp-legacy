import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { CreateSalesDetailDto } from './dto/create-sales-detail.dto';
import { UpdateSalesDetailDto } from './dto/update-sales-detail.dto';
import { AddSalesBatchesDto } from './dto/add-sales-batches.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private readonly linkedInventoryGuardMessage =
    '此銷售商品已有入庫明細關聯，請先移除關聯，修改後再重新選取入庫明細';

  private readonly linkedInventoryOrderDeleteGuardMessage =
    '此銷售單已有入庫明細關聯，請先移除關聯，再刪除銷售單';

  private async assertNoLinkedInventory(
    orderId: string,
    productId: string,
  ): Promise<void> {
    const linkedCount = await this.prisma.salesInventoryDetail.count({
      where: {
        salesOrderId: orderId,
        inventoryDetail: { productId },
      },
    });
    if (linkedCount > 0) {
      throw new ConflictException(this.linkedInventoryGuardMessage);
    }
  }

  private async assertOrderHasNoLinkedInventory(
    orderId: string,
  ): Promise<void> {
    const linkedCount = await this.prisma.salesInventoryDetail.count({
      where: { salesOrderId: orderId },
    });
    if (linkedCount > 0) {
      throw new ConflictException(this.linkedInventoryOrderDeleteGuardMessage);
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

  private fixOrderDate(order: any): any {
    return { ...order, orderDate: this.fixDate(order.orderDate) };
  }

  private parseDate(ddmmyyyy: string): Date {
    const [dd, mm, yyyy] = ddmmyyyy.split('-').map(Number);
    return new Date(Date.UTC(yyyy, mm - 1, dd));
  }

  private async generateOrderNo(dateStr: string): Promise<string> {
    const yyyymmdd = dateStr.replace(/-/g, '');
    const prefix = `O-${yyyymmdd}-`;
    const last = await this.prisma.salesOrder.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: 'desc' },
    });
    let nextSeq = 1;
    if (last) {
      const lastSeq = parseInt(last.id.split('-')[2], 10);
      nextSeq = lastSeq + 1;
    }
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  }

  private orderInclude() {
    return {
      customer: true,
      details: {
        where: { isDeleted: false },
        include: { product: true },
        orderBy: { id: 'asc' as const },
      },
      receivingBatches: {
        include: {
          receivingBatch: {
            include: {
              order: { include: { receivingItem: true } },
              farmer: true,
              details: { where: { isDeleted: false } },
            },
          },
        },
      },
      inventoryDetails: {
        include: {
          inventoryDetail: { include: { product: true, order: true } },
        },
        orderBy: { id: 'asc' as const },
      },
    };
  }

  // ── 主單 CRUD ─────────────────────────────────────────────

  async findAllOrders(customerId?: string, date?: string) {
    const where: any = { isDeleted: false };
    if (customerId) where.customerId = customerId;
    if (date) where.orderDate = new Date(date);
    const orders = await this.prisma.salesOrder.findMany({
      where,
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(this.fixOrderDate.bind(this));
  }

  async findDeletedOrders() {
    const orders = await this.prisma.salesOrder.findMany({
      where: { isDeleted: true },
      include: this.orderInclude(),
      orderBy: { id: 'desc' },
    });
    return orders.map(this.fixOrderDate.bind(this));
  }

  async findOneOrder(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        details: {
          include: { product: true },
          orderBy: { id: 'asc' as const },
        },
        receivingBatches: {
          include: {
            receivingBatch: {
              include: {
                order: { include: { receivingItem: true } },
                farmer: true,
                details: { where: { isDeleted: false } },
              },
            },
          },
        },
        inventoryDetails: {
          include: {
            inventoryDetail: { include: { product: true, order: true } },
          },
          orderBy: { id: 'asc' as const },
        },
      },
    });
    if (!order) throw new NotFoundException(`SalesOrder ${id} not found`);
    return this.fixOrderDate(order);
  }

  async createOrder(dto: CreateSalesOrderDto) {
    const dateObj = this.parseDate(dto.orderDate);
    const dateStr = this.fixDate(dateObj);
    const id = await this.generateOrderNo(dateStr);

    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException(`Customer ${dto.customerId} not found`);

    const order = await this.prisma.salesOrder.create({
      data: { id, orderDate: dateObj, customerId: dto.customerId },
      include: this.orderInclude(),
    });
    return this.fixOrderDate(order);
  }

  async softDeleteOrder(id: string) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`SalesOrder ${id} not found`);
    await this.assertOrderHasNoLinkedInventory(id);
    return this.prisma.salesOrder.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteOrder(id: string, operatorId: number, ip?: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: { details: true, receivingBatches: true },
    });
    if (!order) throw new NotFoundException(`SalesOrder ${id} not found`);
    await this.assertOrderHasNoLinkedInventory(id);

    try {
      await this.prisma.$transaction(async (tx) => {
        const batchIds = order.receivingBatches.map((b) => b.receivingBatchId);
        if (batchIds.length > 0) {
          await tx.salesReceivingBatch.deleteMany({ where: { salesOrderId: id } });
          await tx.receivingBatch.updateMany({
            where: { id: { in: batchIds } },
            data: { salesConfirmed: false },
          });
        }
        await tx.salesInventoryDetail.deleteMany({ where: { salesOrderId: id } });
        await tx.salesDetail.deleteMany({ where: { orderId: id } });
        await tx.salesOrder.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'sales_orders',
            targetId: id,
            operatorId,
            ipAddress: ip,
            beforeData: order as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：SalesOrder ${id} 仍有相關資料參考`);
      }
      throw e;
    }

    return { success: true, deletedId: id };
  }

  // ── 明細 CRUD ─────────────────────────────────────────────

  async createDetail(dto: CreateSalesDetailDto) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException(`SalesOrder ${dto.orderId} not found`);

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    const amount = Math.floor(
      Number(dto.weight) * Number(dto.quantity) * Number(dto.unitPrice),
    );

    return this.prisma.salesDetail.create({
      data: {
        orderId: dto.orderId,
        productId: dto.productId,
        weight: dto.weight,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        amount,
      },
      include: { product: true },
    });
  }

  // 銷售明細與入庫批次採多批次 FIFO，一筆銷售明細可能對應多筆入庫明細。
  // 已有關聯時不得直接改商品、重量或數量；必須先移除關聯、修改，再重新選取入庫明細。
  // 單價只影響銷售收入，不改變庫存分配，因此可直接修改。
  async updateDetail(id: number, dto: UpdateSalesDetailDto) {
    const detail = await this.prisma.salesDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`SalesDetail ${id} not found`);

    const changesInventoryAllocation =
      (dto.productId !== undefined && dto.productId !== detail.productId) ||
      (dto.weight !== undefined && Number(dto.weight) !== Number(detail.weight)) ||
      (dto.quantity !== undefined &&
        Number(dto.quantity) !== Number(detail.quantity));
    if (changesInventoryAllocation) {
      await this.assertNoLinkedInventory(detail.orderId, detail.productId);
    }

    const weight = dto.weight !== undefined ? dto.weight : Number(detail.weight);
    const quantity = dto.quantity !== undefined ? dto.quantity : Number(detail.quantity);
    const unitPrice = dto.unitPrice !== undefined ? dto.unitPrice : Number(detail.unitPrice);
    const amount = Math.floor(Number(weight) * Number(quantity) * Number(unitPrice));

    const updated = await this.prisma.salesDetail.update({
      where: { id },
      data: {
        ...(dto.productId && { productId: dto.productId }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
        amount,
      },
      include: { product: true },
    });

    return updated;
  }

  async softDeleteDetail(id: number) {
    const detail = await this.prisma.salesDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`SalesDetail ${id} not found`);
    await this.assertNoLinkedInventory(detail.orderId, detail.productId);
    return this.prisma.salesDetail.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteDetail(id: number, operatorId: number, ip?: string) {
    const detail = await this.prisma.salesDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`SalesDetail ${id} not found`);
    await this.assertNoLinkedInventory(detail.orderId, detail.productId);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.salesDetail.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'sales_details',
            targetId: String(id),
            operatorId,
            ipAddress: ip,
            beforeData: detail as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：SalesDetail ${id} 仍有相關資料參考`);
      }
      throw e;
    }

    return { success: true, deletedId: id };
  }

  // ── 進貨批次關聯 ──────────────────────────────────────────

  async addBatches(orderId: string, dto: AddSalesBatchesDto) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`SalesOrder ${orderId} not found`);

    const existing = await this.prisma.salesReceivingBatch.findMany({
      where: { salesOrderId: orderId },
    });
    const existingIds = new Set(existing.map((e) => e.receivingBatchId));
    const newIds = dto.receivingBatchIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) return { added: 0 };

    await this.prisma.$transaction(async (tx) => {
      await tx.salesReceivingBatch.createMany({
        data: newIds.map((batchId) => ({ salesOrderId: orderId, receivingBatchId: batchId })),
      });
      await tx.receivingBatch.updateMany({
        where: { id: { in: newIds } },
        data: { salesConfirmed: true },
      });
    });

    return { added: newIds.length };
  }

  async removeBatch(orderId: string, batchId: string) {
    const link = await this.prisma.salesReceivingBatch.findUnique({
      where: { salesOrderId_receivingBatchId: { salesOrderId: orderId, receivingBatchId: batchId } },
    });
    if (!link) throw new NotFoundException(`Batch link not found`);

    await this.prisma.$transaction(async (tx) => {
      await tx.salesReceivingBatch.delete({
        where: { salesOrderId_receivingBatchId: { salesOrderId: orderId, receivingBatchId: batchId } },
      });
      await tx.receivingBatch.update({
        where: { id: batchId },
        data: { salesConfirmed: false },
      });
    });

    return { success: true };
  }

  // ── 入庫明細關聯（出口銷售）─────────────────────────────
  //
  // 核心扣減邏輯（業主指定規則）：
  // 1. 一張銷售單的某商品明細數量，可以跨多筆入庫明細（進貨或代工不拘）拼取
  // 2. 所選入庫明細依「建立時間」由舊到新排序，FIFO 依序扣減，舊的優先被扣完
  // 3. 被扣到歸零的入庫明細 → salesStatus = DONE（已完銷）
  // 4. 被扣但未歸零的 → salesStatus = IN_SALES（銷售中）
  // 5. 選了但輪不到扣減的（前面的舊批次已足以滿足需求）→ 不建立關聯，視為未選中，保持原狀態
  // 6. 現有庫存 = 未銷售(NONE) + 銷售中(IN_SALES)剩餘數量，此部分不變，仍由 stockSummary 統計計算
  async addInventoryDetails(
    orderId: string,
    items: Array<{ inventoryDetailId: number }>,
  ) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: { details: { where: { isDeleted: false } } },
    });
    if (!order) throw new NotFoundException(`SalesOrder ${orderId} not found`);
    if (items.length === 0) return [];

    const ids = items.map((i) => i.inventoryDetailId);

    return this.prisma.$transaction(async (tx) => {
      // 依建立時間由舊到新取得所選入庫明細（FIFO 扣減順序）
      const invDetails = await tx.inventoryDetail.findMany({
        where: { id: { in: ids } },
        include: { product: true },
        orderBy: { createdAt: 'asc' },
      });
      if (invDetails.length !== ids.length) {
        throw new NotFoundException('部分入庫明細不存在');
      }

      // 可能同時選了不同商品，依商品分組，每一組各自独立跑一次 FIFO 扣減
      const byProduct = new Map<string, typeof invDetails>();
      for (const d of invDetails) {
        const arr = byProduct.get(d.productId) ?? [];
        arr.push(d);
        byProduct.set(d.productId, arr);
      }

      const created: any[] = [];
      for (const [productId, group] of byProduct) {
        const matchDetail = order.details.find((d) => d.productId === productId);
        if (!matchDetail) {
          throw new NotFoundException(
            `此銷售單沒有商品「${group[0].product.name}」的銷售明細`,
          );
        }
        const salesUnitPrice = Number(matchDetail.unitPrice);

        // 此商品在這張銷售單已關聯的總量（支援分次加選）
        const existingLinked = await tx.salesInventoryDetail.aggregate({
          where: { salesOrderId: orderId, inventoryDetail: { productId } },
          _sum: { quantity: true },
        });
        const alreadyLinkedQty = Number(existingLinked._sum.quantity ?? 0);
        let remainingRequired = Number(matchDetail.quantity) - alreadyLinkedQty;
        if (remainingRequired <= 0) {
          throw new ConflictException(
            `此銷售單「${group[0].product.name}」的銷售數量已經全數關聯完成，無需再新增`,
          );
        }

        for (const invDetail of group) {
          if (remainingRequired <= 0) break; // 前面舊批次已足以滿足需求，這筆不需要再扣，不建立關聯

          const soldAgg = await tx.salesInventoryDetail.aggregate({
            where: { inventoryDetailId: invDetail.id },
            _sum: { quantity: true },
          });
          const alreadySoldOnThisLot = Number(soldAgg._sum.quantity ?? 0);
          const availableOnThisLot = invDetail.quantity - alreadySoldOnThisLot;
          if (availableOnThisLot <= 0) continue; // 這筆已完銷，跳過

          const allocQty = Math.min(remainingRequired, availableOnThisLot);
          const amount = Math.floor(allocQty * salesUnitPrice);
          // 成本快取：入庫單建立時設定的「預計售價」，關聯建立當下鎖定，之後入庫單價變動不影響此筆
          const costUnitPrice = Number(invDetail.unitPrice);
          const costAmount = Math.floor(allocQty * costUnitPrice);

          const sid = await tx.salesInventoryDetail.create({
            data: {
              salesOrderId: orderId,
              inventoryDetailId: invDetail.id,
              quantity: allocQty,
              unitPrice: salesUnitPrice,
              amount,
              costUnitPrice,
              costAmount,
            },
            include: { inventoryDetail: { include: { product: true } } },
          });
          created.push(sid);

          const newSoldTotal = alreadySoldOnThisLot + allocQty;
          const newStatus = newSoldTotal >= invDetail.quantity ? 'DONE' : 'IN_SALES';
          await tx.inventoryDetail.update({
            where: { id: invDetail.id },
            data: { salesStatus: newStatus as any },
          });

          remainingRequired -= allocQty;
        }

        if (remainingRequired > 0) {
          throw new ConflictException(
            `所選入庫明細庫存不足：「${group[0].product.name}」尚缺 ${remainingRequired} 件，請選擇更多入庫批次`,
          );
        }
      }

      return created;
    });
  }

  async removeSalesInventoryDetail(id: number, operatorId: number, ip?: string) {
    const item = await this.prisma.salesInventoryDetail.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`SalesInventoryDetail ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.salesInventoryDetail.delete({ where: { id } });
        await tx.auditLog.create({
          data: { actionType: 'HARD_DELETE', targetTable: 'sales_inventory_details', targetId: String(id), operatorId, ipAddress: ip, beforeData: item as any },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：SalesInventoryDetail ${id} 仍有相關資料參考`);
      }
      throw e;
    }

    // 移除後重新計算 salesStatus
    const invDetail = await this.prisma.inventoryDetail.findUnique({ where: { id: item.inventoryDetailId } });
    if (invDetail) {
      const soldAgg = await this.prisma.salesInventoryDetail.aggregate({
        where: { inventoryDetailId: item.inventoryDetailId },
        _sum: { quantity: true },
      });
      const soldTotal = Number(soldAgg._sum.quantity ?? 0);
      const newStatus = soldTotal <= 0 ? 'NONE' : soldTotal >= invDetail.quantity ? 'DONE' : 'IN_SALES';
      await this.prisma.inventoryDetail.update({
        where: { id: item.inventoryDetailId },
        data: { salesStatus: newStatus as any },
      });
    }

    return { success: true };
  }

  // ── 可選批次查詢（processingType 篩選）───────────────────

  async findAvailableBatches(processingType?: string, receivingItemId?: string) {
    const batchWhere: any = { salesConfirmed: false, isDeleted: false };
    if (processingType === 'H01') batchWhere.processingDone = true;
    const orderWhere: any = {};
    if (processingType === 'H02') orderWhere.h02Done = true;
    if (processingType === 'H03') orderWhere.h03Done = true;
    if (receivingItemId) orderWhere.receivingItemId = receivingItemId;
    if (Object.keys(orderWhere).length > 0) batchWhere.order = orderWhere;

    const batches = await this.prisma.receivingBatch.findMany({
      where: batchWhere,
      include: {
        order: { include: { receivingItem: true } },
        farmer: true,
        details: { where: { isDeleted: false } },
      },
      orderBy: { id: 'asc' },
    });

    return batches.map((b) => ({
      ...b,
      order: { ...b.order, orderDate: this.fixDate(b.order.orderDate) },
    }));
  }

  // ── 可選進貨單查詢（processingType 篩選）─────────────────

  async findAvailableOrders(processingType?: string, receivingItemId?: string) {
    const batchWhere: any = { salesConfirmed: false, isDeleted: false };
    if (processingType === 'H01') batchWhere.processingDone = true;
    const orderWhere: any = { isDeleted: false, batches: { some: batchWhere } };
    if (processingType === 'H02') orderWhere.h02Done = true;
    if (processingType === 'H03') orderWhere.h03Done = true;
    if (receivingItemId) orderWhere.receivingItemId = receivingItemId;

    const orders = await this.prisma.receivingOrder.findMany({
      where: orderWhere,
      include: {
        receivingItem: true,
        batches: {
          where: batchWhere,
          include: {
            farmer: true,
            details: { where: { isDeleted: false } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    return orders.map((o) => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  // ── 下一個序號預覽 ────────────────────────────────────────

  async getNextOrderNo(dateStr: string) {
    const no = await this.generateOrderNo(dateStr);
    return { orderNo: no };
  }

  async togglePackagingDone(id: string, packagingDone: boolean) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`SalesOrder ${id} not found`);
    return this.prisma.salesOrder.update({
      where: { id },
      data: { packagingDone },
      select: { id: true, packagingDone: true },
    });
  }
}

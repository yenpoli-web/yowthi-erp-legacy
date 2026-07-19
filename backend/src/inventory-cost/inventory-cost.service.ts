import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  InventoryCostQueryDto,
  InventoryCostOrderResult,
  InventoryCostOrderDetailResult,
  LockCostDto,
  ContractCostDetailResult,
} from './dto/inventory-cost.dto';

// 包裝項目是否歸屬「進貨單來源」，一律以 PackagingItem.applicableTo 為準（見 isReceivingLinked），不硬編 ID 清單。
// 2026-07-04：K04（收集檳榔葉）改歸類 SALES_ORDER，目前進貨單真實成本只包含 K01/K02。

@Injectable()
export class InventoryCostService {
  constructor(private prisma: PrismaService) {}

  private batchInclude() {
    return {
      where: { isDeleted: false } as const,
      include: {
        details: { where: { isDeleted: false } }, // 進貨明細（付給農民的金額）
        processingDetails: { where: { isDeleted: false } }, // H01 加工明細
      },
    };
  }

  async findAll(query: InventoryCostQueryDto): Promise<InventoryCostOrderResult[]> {
    const where: any = { isDeleted: false, h02Done: true };

    if (query.startDate || query.endDate) {
      where.orderDate = {};
      if (query.startDate) where.orderDate.gte = new Date(query.startDate);
      if (query.endDate) where.orderDate.lte = new Date(query.endDate);
    }
    if (query.receivingItemId) {
      where.receivingItemId = query.receivingItemId;
    }
    if (query.status === 'LOCKED') where.costLocked = true;
    if (query.status === 'UNLOCKED') where.costLocked = false;

    const orders = await this.prisma.receivingOrder.findMany({
      where,
      orderBy: { orderDate: 'desc' },
      include: {
        receivingItem: true,
        costLockedByUser: true,
        batches: this.batchInclude(),
        processingDetails: { where: { isDeleted: false }, include: { item: true } },
        packagingOrders: {
          where: { isDeleted: false },
          include: { details: { where: { isDeleted: false }, include: { item: true } } },
        },
      },
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async findOne(orderId: string): Promise<InventoryCostOrderDetailResult> {
    const order = await this.prisma.receivingOrder.findUnique({
      where: { id: orderId },
      include: {
        receivingItem: true,
        costLockedByUser: true,
        batches: this.batchInclude(),
        processingDetails: {
          where: { isDeleted: false },
          include: { item: true, employee: true },
        },
        packagingOrders: {
          where: { isDeleted: false },
          include: {
            details: {
              where: { isDeleted: false },
              include: { item: true, employee: true },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('進貨單不存在');

    const base = this.mapOrder(order);

    const receivingRows = order.batches.flatMap((b: any) =>
      b.details.map((d: any) => ({
        id: d.id,
        itemType: '進貨' as const,
        employeeName: '—',
        outputQty: Number(d.quantity),
        amount: d.amount,
      })),
    );

    const h01h02 = order.processingDetails.filter(
      (p: any) => p.item?.type === 'H01' || p.item?.type === 'H02',
    );
    const processingDetails = [
      ...receivingRows,
      ...h01h02.map((p: any) => ({
        id: p.id,
        itemType: p.item.type,
        employeeName: p.employee.name,
        outputQty: Number(p.outputQty),
        amount: p.amount,
      })),
    ];

    const packagingDetails = order.packagingOrders
      .flatMap((po: any) => po.details)
      .filter((d: any) => this.isReceivingLinked(d.item))
      .map((d: any) => ({
        id: d.id,
        itemId: d.item.id,
        itemName: d.item.name,
        employeeName: d.employee.name,
        quantity: Number(d.quantity),
        wageRate: Number(d.wageRate),
        amount: d.amount,
        workTime: d.workTime,
      }))

    return { ...base, processingDetails, packagingDetails };
  }

  async lock(orderId: string, dto: LockCostDto, userId: number) {
    const order = await this.prisma.receivingOrder.findUnique({
      where: { id: orderId },
      include: {
        processingDetails: { where: { isDeleted: false }, include: { item: true } },
        batches: this.batchInclude(),
      },
    });
    if (!order) throw new NotFoundException('進貨單不存在');
    if (!order.h02Done) throw new ConflictException('該進貨單尚未完成 H02 加工，無法鎖定成本');
    if (order.costLocked) throw new ConflictException('該進貨單已鎖定成本，請先解除鎖定再重新計算');

    const { totalCostAmount, totalH02OutputWeight } = this.computeBase(order);
    if (totalH02OutputWeight <= 0) {
      throw new ConflictException('該進貨單尚無 H02 完成品重量，無法計算單位成本');
    }

    const costUnitPrice = totalCostAmount / totalH02OutputWeight;
    const estPackagingCost = dto.estBasketQty * 80 + dto.estBoxQty * 40;
    const costUnitPriceEst = costUnitPrice + estPackagingCost / totalH02OutputWeight;

    await this.prisma.receivingOrder.update({
      where: { id: orderId },
      data: {
        costLocked: true,
        costUnitPrice,
        costUnitPriceEst,
        costEstBasketQty: dto.estBasketQty,
        costEstBoxQty: dto.estBoxQty,
        costLockedAt: new Date(),
        costLockedBy: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actionType: 'LOCK_COST',
        targetTable: 'receiving_orders',
        targetId: orderId,
        operatorId: userId,
        notes: `鎖定生產成本：基礎成本/kg=${costUnitPrice.toFixed(2)}，預估成本/kg=${costUnitPriceEst.toFixed(2)}`,
      },
    });

    return this.findOne(orderId);
  }

  async unlock(orderId: string, userId: number) {
    const order = await this.prisma.receivingOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('進貨單不存在');
    if (!order.costLocked) throw new ConflictException('該進貨單尚未鎖定成本');

    const beforeData = {
      costUnitPrice: order.costUnitPrice,
      costUnitPriceEst: order.costUnitPriceEst,
      costEstBasketQty: order.costEstBasketQty,
      costEstBoxQty: order.costEstBoxQty,
      costLockedAt: order.costLockedAt,
      costLockedBy: order.costLockedBy,
    };

    await this.prisma.receivingOrder.update({
      where: { id: orderId },
      data: {
        costLocked: false,
        costUnitPrice: null,
        costUnitPriceEst: null,
        costEstBasketQty: null,
        costEstBoxQty: null,
        costLockedAt: null,
        costLockedBy: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actionType: 'UNLOCK_COST',
        targetTable: 'receiving_orders',
        targetId: orderId,
        operatorId: userId,
        beforeData,
        notes: '解除生產成本鎖定',
      },
    });

    return this.findOne(orderId);
  }

  /**
   * 代工成本鎖定（2026-06-30）
   * 以「代工明細」為單位（不是整張代工單），因為同一張代工單下不同商品明細可能單位成本不一樣。
   * 鎖定公式直接用該明細現有的 amount ÷ (quantity × weight)，不需要預估包裝欄位（代工成品不需要再裝籃/裝箱）。
   */
  async findAllContracts(status?: 'ALL' | 'LOCKED' | 'UNLOCKED'): Promise<ContractCostDetailResult[]> {
    const where: any = { isDeleted: false };
    if (status === 'LOCKED') where.costLocked = true;
    if (status === 'UNLOCKED') where.costLocked = false;

    const details = await this.prisma.contractWorkDetail.findMany({
      where,
      include: { order: true, supplier: true, product: true, costLockedByUser: true },
      orderBy: { id: 'desc' },
    });

    return details.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      orderDate: d.order.orderDate,
      supplierName: d.supplier.name,
      productName: d.product.name,
      quantity: Number(d.quantity),
      weight: Number(d.weight),
      unitPrice: Number(d.unitPrice),
      amount: d.amount,
      costLocked: d.costLocked,
      costUnitPrice: d.costUnitPrice !== null ? Number(d.costUnitPrice) : null,
      costLockedAt: d.costLockedAt,
      costLockedByUsername: d.costLockedByUser?.username ?? null,
    }));
  }

  async lockContractDetail(detailId: number, userId: number): Promise<ContractCostDetailResult> {
    const detail = await this.prisma.contractWorkDetail.findUnique({ where: { id: detailId } });
    if (!detail) throw new NotFoundException('代工明細不存在');
    if (detail.costLocked) throw new ConflictException('該代工明細已鎖定成本，請先解除鎖定再重新計算');

    const denom = Number(detail.quantity) * Number(detail.weight);
    if (denom <= 0) {
      throw new ConflictException('該代工明細數量或重量為 0，無法計算單位成本');
    }
    const costUnitPrice = detail.amount / denom;

    await this.prisma.contractWorkDetail.update({
      where: { id: detailId },
      data: {
        costLocked: true,
        costUnitPrice,
        costLockedAt: new Date(),
        costLockedBy: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actionType: 'LOCK_COST',
        targetTable: 'contract_work_details',
        targetId: String(detailId),
        operatorId: userId,
        notes: `鎖定代工成本：單位成本=${costUnitPrice.toFixed(2)}`,
      },
    });

    const [result] = await this.findAllContracts('ALL').then((rows) => rows.filter((r) => r.id === detailId));
    return result;
  }

  async unlockContractDetail(detailId: number, userId: number): Promise<ContractCostDetailResult> {
    const detail = await this.prisma.contractWorkDetail.findUnique({ where: { id: detailId } });
    if (!detail) throw new NotFoundException('代工明細不存在');
    if (!detail.costLocked) throw new ConflictException('該代工明細尚未鎖定成本');

    const beforeData = {
      costUnitPrice: detail.costUnitPrice,
      costLockedAt: detail.costLockedAt,
      costLockedBy: detail.costLockedBy,
    };

    await this.prisma.contractWorkDetail.update({
      where: { id: detailId },
      data: {
        costLocked: false,
        costUnitPrice: null,
        costLockedAt: null,
        costLockedBy: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actionType: 'UNLOCK_COST',
        targetTable: 'contract_work_details',
        targetId: String(detailId),
        operatorId: userId,
        beforeData,
        notes: '解除代工成本鎖定',
      },
    });

    const [result] = await this.findAllContracts('ALL').then((rows) => rows.filter((r) => r.id === detailId));
    return result;
  }

  /**
   * 計算欄位1所需的基礎數字：
   * totalCostAmount = 進貨金額（付給農民）+ H01 加工金額 + H02 加工金額
   * totalH02OutputWeight = H02 完成品總重量
   */
  private computeBase(order: any): { totalCostAmount: number; totalH02OutputWeight: number } {
    const receivingDetails = order.batches.flatMap((b: any) => b.details);
    const h01Details = order.batches.flatMap((b: any) => b.processingDetails);
    const h02Details = order.processingDetails.filter((p: any) => p.item?.type === 'H02');

    const receivingAmount = receivingDetails.reduce((s: number, d: any) => s + d.amount, 0);
    const h01Amount = h01Details.reduce((s: number, p: any) => s + p.amount, 0);
    const h02Amount = h02Details.reduce((s: number, p: any) => s + p.amount, 0);
    const totalH02OutputWeight = h02Details.reduce(
      (s: number, p: any) => s + Number(p.outputQty),
      0,
    );

    return { totalCostAmount: receivingAmount + h01Amount + h02Amount, totalH02OutputWeight };
  }

  /**
   * 判斷一筆包裝明細是否歸屬「進貨單來源」類型，一律以 PackagingItem.applicableTo 為準（資料驅動，不遠硬編 ID 清單）。
   * 2026-07-04 修正：K04（收集檳榔葉）改歸類 SALES_ORDER，不再納入進貨單真實成本計算。
   */
  private isReceivingLinked(item: { applicableTo?: string }): boolean {
    return item?.applicableTo === 'RECEIVING_ORDER';
  }

  private mapOrder(order: any): InventoryCostOrderResult {
    const { totalCostAmount, totalH02OutputWeight } = this.computeBase(order);

    const realPackagingAmount = order.packagingOrders
      .flatMap((po: any) => po.details)
      .filter((d: any) => this.isReceivingLinked(d.item))
      .reduce((s: number, d: any) => s + d.amount, 0);

    const baseUnitPrice = totalH02OutputWeight > 0 ? totalCostAmount / totalH02OutputWeight : null;
    const realUnitPrice =
      baseUnitPrice !== null
        ? baseUnitPrice + (totalH02OutputWeight > 0 ? realPackagingAmount / totalH02OutputWeight : 0)
        : null;

    return {
      orderId: order.id,
      orderDate: order.orderDate,
      receivingItem: {
        id: order.receivingItem.id,
        name: order.receivingItem.name,
        imageUrl: order.receivingItem.imageUrl,
      },
      h02Done: order.h02Done,
      totalH01H02Amount: totalCostAmount,
      totalH02OutputWeight,
      costLocked: order.costLocked,
      costUnitPrice: order.costUnitPrice !== null ? Number(order.costUnitPrice) : null,
      costUnitPriceEst: order.costUnitPriceEst !== null ? Number(order.costUnitPriceEst) : null,
      costEstBasketQty: order.costEstBasketQty,
      costEstBoxQty: order.costEstBoxQty,
      costLockedAt: order.costLockedAt,
      costLockedByUsername: order.costLockedByUser?.username ?? null,
      realPackagingAmount,
      realUnitPrice,
    };
  }
}

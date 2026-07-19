import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnomaliesSummaryResult,
  UnlinkedSalesRow,
  UnlinkedPackagingRow,
  UnlinkedInventoryRow,
  StaleProcessingRow,
} from './dto/anomalies-summary.dto';

const STALE_DAYS_THRESHOLD = 7;

@Injectable()
export class AnomaliesService {
  constructor(private prisma: PrismaService) {}

  async getSummary(): Promise<AnomaliesSummaryResult> {
    const [unlinkedSales, unlinkedPackaging, unlinkedInventory, staleProcessing] =
      await Promise.all([
        this.getUnlinkedSales(),
        this.getUnlinkedPackaging(),
        this.getUnlinkedInventory(),
        this.getStaleProcessing(),
      ]);

    return { unlinkedSales, unlinkedPackaging, unlinkedInventory, staleProcessing };
  }

  // 銷售單有銷售明細，但完全沒有任何 SalesInventoryDetail 關聯
  private async getUnlinkedSales(): Promise<UnlinkedSalesRow[]> {
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        isDeleted: false,
        details: { some: { isDeleted: false } },
        inventoryDetails: { none: {} },
      },
      include: { customer: true, details: { where: { isDeleted: false } } },
      orderBy: { orderDate: 'desc' },
    });
    return orders.map((o) => ({
      id: o.id,
      orderDate: o.orderDate,
      customerName: o.customer?.name ?? '',
      totalAmount: o.details.reduce((s, d) => s + d.amount, 0),
    }));
  }

  // 包裝單未關聯銷售單（只檢查 SALES_ORDER 類型的包裝項目，2026-06-30 改版後 K01/K02/K04 改綁進貨單，不再需要關聯銷售單，不訂為異常）
  private async getUnlinkedPackaging(): Promise<UnlinkedPackagingRow[]> {
    const orders = await this.prisma.packagingOrder.findMany({
      where: { isDeleted: false, salesOrderId: null, receivingOrderId: null },
      include: { details: { where: { isDeleted: false }, include: { item: true } } },
      orderBy: { orderDate: 'desc' },
    });
    return orders
      .filter((o) => o.details.length > 0 && o.details.some((d) => d.item.applicableTo === 'SALES_ORDER'))
      .map((o) => ({
        id: o.id,
        orderDate: o.orderDate,
        totalAmount: o.details.reduce((s, d) => s + d.amount, 0),
      }));
  }

  // 入庫單有明細，但完全沒有任何進貨/代工來源關聯
  private async getUnlinkedInventory(): Promise<UnlinkedInventoryRow[]> {
    const orders = await this.prisma.inventoryOrder.findMany({
      where: {
        isDeleted: false,
        details: { some: { isDeleted: false } },
        receivingOrders: { none: {} },
        contractOrders: { none: {} },
      },
      include: { details: { where: { isDeleted: false } } },
      orderBy: { orderDate: 'desc' },
    });
    return orders.map((o) => ({
      id: o.id,
      orderDate: o.orderDate,
      totalQty: o.details.reduce((s, d) => s + d.quantity, 0),
    }));
  }

  // 進貨單 H02/H03 長期未完成（超過門檻天數）
  private async getStaleProcessing(): Promise<StaleProcessingRow[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - STALE_DAYS_THRESHOLD);

    const orders = await this.prisma.receivingOrder.findMany({
      where: {
        isDeleted: false,
        orderDate: { lt: threshold },
        OR: [{ h02Done: false }, { h03Done: false }],
      },
      include: { receivingItem: true },
      orderBy: { orderDate: 'asc' },
    });

    const now = new Date();
    return orders.map((o) => {
      const days = Math.floor((now.getTime() - o.orderDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: o.id,
        orderDate: o.orderDate,
        receivingItemName: o.receivingItem?.name ?? '',
        daysSince: days,
        h02Done: o.h02Done,
        h03Done: o.h03Done,
      };
    });
  }
}

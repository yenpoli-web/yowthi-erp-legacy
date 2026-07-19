import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MonitoringQueryDto,
  MonitoringOrderResult,
  MonitoringBatchResult,
  MonitoringTypeStats,
  MonitoringH01Stats,
} from './dto/monitoring-query.dto';

@Injectable()
export class MonitoringService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: MonitoringQueryDto): Promise<MonitoringOrderResult[]> {
    const where: any = { isDeleted: false };

    if (query.startDate || query.endDate) {
      where.orderDate = {};
      if (query.startDate) where.orderDate.gte = new Date(query.startDate);
      if (query.endDate) where.orderDate.lte = new Date(query.endDate);
    }
    if (query.receivingItemId) {
      where.receivingItemId = query.receivingItemId;
    }

    const orders = await this.prisma.receivingOrder.findMany({
      where,
      orderBy: { orderDate: 'desc' },
      include: {
        receivingItem: true,
        batches: {
          where: { isDeleted: false },
          include: {
            farmer: true,
            details: { where: { isDeleted: false } },
            processingDetails: { where: { isDeleted: false } },
          },
        },
        processingDetails: { where: { isDeleted: false }, include: { item: true } },
      },
    });

    const mapped = orders.map((order) => this.mapOrder(order));

    // H01/H02/H03 全部完成的進貨單，預設與 PENDING 都不出現；只有明確查詢 DONE 時才顯示
    if (query.status === 'DONE') {
      return mapped.filter((o) => this.isFullyDone(o));
    }
    return mapped.filter((o) => !this.isFullyDone(o));
  }

  private isFullyDone(order: MonitoringOrderResult): boolean {
    return (
      order.h02Done === true &&
      order.h03Done === true &&
      order.batches.length > 0 &&
      order.batches.every((b) => b.processingDone === true)
    );
  }

  async findOne(orderId: string): Promise<MonitoringOrderResult | null> {
    const order = await this.prisma.receivingOrder.findUnique({
      where: { id: orderId },
      include: {
        receivingItem: true,
        batches: {
          where: { isDeleted: false },
          include: {
            farmer: true,
            details: { where: { isDeleted: false } },
            processingDetails: { where: { isDeleted: false } },
          },
        },
        processingDetails: { where: { isDeleted: false }, include: { item: true } },
      },
    });
    if (!order) return null;
    return this.mapOrder(order);
  }

  private mapOrder(order: any): MonitoringOrderResult {
    let totalInputQty = 0;
    let totalAmount = 0;
    let totalH01Output = 0;
    let totalH01Defect = 0;
    let totalH01Amount = 0;

    const batches: MonitoringBatchResult[] = order.batches.map((batch: any) => {
      const inputQty = batch.details.reduce(
        (sum: number, d: any) => sum + Number(d.quantity),
        0,
      );

      const h01Details = batch.processingDetails;
      const h01Output = h01Details.length
        ? h01Details.reduce((s: number, p: any) => s + Number(p.outputQty), 0)
        : null;
      const h01Defect = h01Details.length
        ? h01Details.reduce((s: number, p: any) => s + Number(p.defectQty), 0)
        : null;
      const h01Amount = h01Details.length
        ? h01Details.reduce((s: number, p: any) => s + p.amount, 0)
        : null;

      const loss =
        h01Output !== null && h01Defect !== null
          ? inputQty - h01Output - h01Defect
          : null;
      const lossRate = loss !== null && inputQty > 0 ? (loss / inputQty) * 100 : null;
      const completionRate =
        h01Output !== null && inputQty > 0 ? (h01Output / inputQty) * 100 : null;

      totalInputQty += inputQty;
      if (h01Amount) {
        totalAmount += h01Amount;
        totalH01Amount += h01Amount;
      }
      if (h01Output !== null) totalH01Output += h01Output;
      if (h01Defect !== null) totalH01Defect += h01Defect;

      return {
        batchId: batch.id,
        farmer: { id: batch.farmer.id, name: batch.farmer.name },
        inputQty,
        processingDone: batch.processingDone,
        h01Output,
        h01Defect,
        h01Amount,
        loss,
        lossRate,
        completionRate,
      };
    });

    const orderLevelAmount = order.processingDetails.reduce(
      (s: number, p: any) => s + p.amount,
      0,
    );
    totalAmount += orderLevelAmount;

    const h02Details = order.processingDetails.filter((p: any) => p.item?.type === 'H02');
    const h03Details = order.processingDetails.filter((p: any) => p.item?.type === 'H03');

    const buildTypeStats = (details: any[], totalQty: number): MonitoringTypeStats => {
      const outputQty = details.reduce((s: number, p: any) => s + Number(p.outputQty), 0);
      const amount = details.reduce((s: number, p: any) => s + p.amount, 0);
      const completionRate = totalQty > 0 ? (outputQty / totalQty) * 100 : null;
      return { totalQty, outputQty, amount, completionRate };
    };

    const h01Stats: MonitoringH01Stats = {
      outputQty: totalH01Output,
      defectQty: totalH01Defect,
      amount: totalH01Amount,
    };
    const h02Stats = buildTypeStats(h02Details, totalH01Output);
    const h03Stats = buildTypeStats(h03Details, totalH01Defect);

    return {
      orderId: order.id,
      orderDate: order.orderDate,
      receivingItem: {
        id: order.receivingItem.id,
        name: order.receivingItem.name,
        imageUrl: order.receivingItem.imageUrl,
      },
      h02Done: order.h02Done,
      h03Done: order.h03Done,
      totalInputQty,
      totalAmount,
      h01Stats,
      h02Stats,
      h03Stats,
      batches,
    };
  }
}

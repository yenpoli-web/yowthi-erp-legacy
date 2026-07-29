import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReceivingInquiryQueryDto,
  ReceivingInquiryResult,
} from './dto/receiving-inquiry.dto';
import {
  ReceivingVolumeInquiryQueryDto,
  ReceivingVolumeInquiryResult,
} from './dto/receiving-volume-inquiry.dto';
import {
  ProcessingWageInquiryQueryDto,
  ProcessingWageInquiryResult,
} from './dto/processing-wage-inquiry.dto';
import {
  EmployeeWageSummaryInquiryQueryDto,
  EmployeeWageSummaryInquiryResult,
  EmployeeWageSummaryInquiryRow,
} from './dto/employee-wage-summary-inquiry.dto';
import {
  FarmerProcessingInquiryQueryDto,
  FarmerProcessingInquiryResult,
} from './dto/farmer-processing-inquiry.dto';
import {
  H02ProcessingInquiryQueryDto,
  H02ProcessingInquiryResult,
} from './dto/h02-processing-inquiry.dto';
import {
  H03ProcessingInquiryQueryDto,
  H03ProcessingInquiryResult,
} from './dto/h03-processing-inquiry.dto';
import {
  PackagingInquiryQueryDto,
  PackagingInquiryResult,
} from './dto/packaging-inquiry.dto';
import {
  ContractWorkInquiryQueryDto,
  ContractWorkInquiryResult,
} from './dto/contract-work-inquiry.dto';
import {
  TransportInquiryQueryDto,
  TransportInquiryResult,
} from './dto/transport-inquiry.dto';
import {
  PurchaseInquiryQueryDto,
  PurchaseInquiryResult,
} from './dto/purchase-inquiry.dto';
import {
  SalesInquiryQueryDto,
  SalesInquiryResult,
} from './dto/sales-inquiry.dto';
import {
  CostAnalysisQueryDto,
  CostAnalysisResult,
  CostAnalysisExportResult,
  CostAnalysisDomesticResult,
  SalesOrdersForCostQueryDto,
  SalesOrderForCostRow,
} from './dto/cost-analysis.dto';
import {
  addCosts,
  calculateAllocatedCost,
  calculateReceivingTrueUnitCost,
  roundCost,
} from './cost-analysis.calculator';

@Injectable()
export class InquiryService {
  constructor(private prisma: PrismaService) {}

  async receivingInquiry(
    query: ReceivingInquiryQueryDto,
  ): Promise<ReceivingInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.receivingItemId) {
      where.itemId = query.receivingItemId;
    }
    if (query.farmerIds) {
      const ids = query.farmerIds.split(',').filter(Boolean);
      if (ids.length) where.farmerId = { in: ids };
    }
    if (query.startDate || query.endDate) {
      where.batch = {
        order: {
          orderDate: {
            ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
            ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
          },
        },
      };
    }

    const details = await this.prisma.receivingDetail.findMany({
      where,
      include: {
        farmer: true,
        item: true,
        batch: { include: { order: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = details.map((d) => ({
      orderId: d.batch.orderId,
      date: d.batch.order.orderDate,
      farmerId: d.farmer.id,
      farmerName: d.farmer.name,
      itemId: d.item.id,
      itemName: d.item.name,
      quantity: Number(d.quantity),
      unitPrice: Number(d.unitPrice),
      amount: d.amount,
    }));

    const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
    const avgUnitPrice = totalQuantity > 0 ? totalAmount / totalQuantity : 0;

    return {
      rows,
      summary: { totalQuantity, totalAmount, avgUnitPrice },
    };
  }

  async receivingVolumeInquiry(
    query: ReceivingVolumeInquiryQueryDto,
  ): Promise<ReceivingVolumeInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.receivingItemId) {
      where.receivingItemId = query.receivingItemId;
    }
    if (query.startDate || query.endDate) {
      where.orderDate = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const orders = await this.prisma.receivingOrder.findMany({
      where,
      include: {
        batches: {
          where: { isDeleted: false },
          include: { details: { where: { isDeleted: false } } },
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    const rows = orders.map((order) => {
      const details = order.batches.flatMap((b) => b.details);
      const quantity = details.reduce((s, d) => s + Number(d.quantity), 0);
      const amount = details.reduce((s, d) => s + d.amount, 0);
      const avgPrice = quantity > 0 ? amount / quantity : 0;
      return {
        date: order.orderDate,
        orderId: order.id,
        quantity,
        avgPrice,
        amount,
      };
    });

    const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
    const avgUnitPrice = totalQuantity > 0 ? totalAmount / totalQuantity : 0;

    return {
      rows,
      summary: { totalQuantity, totalAmount, avgUnitPrice },
    };
  }

  async processingWageInquiry(
    query: ProcessingWageInquiryQueryDto,
  ): Promise<ProcessingWageInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.startDate || query.endDate) {
      where.order = {
        orderDate: {
          ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
          ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
        },
      };
    }

    const details = await this.prisma.processingDetail.findMany({
      where,
      include: { employee: true, item: true, order: true, farmer: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows = details.map((d) => ({
      date: d.order.orderDate,
      employeeId: d.employee.id,
      employeeName: d.employee.name,
      farmerId: d.farmer?.id ?? null,
      farmerName: d.farmer?.name ?? null,
      itemType: d.item.type,
      itemName: d.item.name,
      outputQty: Number(d.outputQty),
      wageRate: Number(d.wageRate),
      amount: d.amount,
    }));

    const totalOutputQty = rows.reduce((s, r) => s + r.outputQty, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

    return {
      rows,
      summary: { totalOutputQty, totalAmount },
    };
  }

  /**
   * 員工薪資查詢的「限定日期範圍內有加工明細」員工清單
   * 未提供日期時回傳空陣列，前端有快捷判斷、不套用這個限定、改為顯示全部員工
   * 改用 JS 自行去重（不用 Prisma distinct），避免 distinct 搭配巢狀 select 關聯可能不相容的問題
   */
  /**
   * 員工薪資總表：僅統計加工（H01/H02/H03）金額，不包含包裝
   * 每日、每員工、每加工項目合併一列
   */
  async employeeWageSummaryInquiry(
    query: EmployeeWageSummaryInquiryQueryDto,
  ): Promise<EmployeeWageSummaryInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.startDate || query.endDate) {
      where.order = {
        orderDate: {
          ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
          ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
        },
      };
    }

    const details = await this.prisma.processingDetail.findMany({
      where,
      include: { employee: true, item: true, order: true },
      orderBy: { createdAt: 'desc' },
    });

    // 以「日期 + 員工ID + 加工項目」合併，避免不同加工項目的薪資互相混合
    const grouped = new Map<string, EmployeeWageSummaryInquiryRow>();
    for (const d of details) {
      const dateKey = d.order.orderDate.toISOString().slice(0, 10);
      const key = JSON.stringify([dateKey, d.employeeId, d.itemId]);
      const existing = grouped.get(key);
      if (existing) {
        existing.amount += d.amount;
      } else {
        grouped.set(key, {
          date: d.order.orderDate,
          employeeId: d.employee.id,
          employeeName: d.employee.name,
          processingItemId: d.item.id,
          processingItemType: d.item.type,
          processingItemName: d.item.name,
          amount: d.amount,
        });
      }
    }

    const rows = Array.from(grouped.values()).sort(
      (a, b) =>
        b.date.getTime() - a.date.getTime() ||
        a.employeeId.localeCompare(b.employeeId) ||
        a.processingItemId.localeCompare(b.processingItemId),
    );
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

    return {
      rows,
      summary: { totalAmount },
    };
  }

  async processingWageEmployees(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return [];

    const details = await this.prisma.processingDetail.findMany({
      where: {
        isDeleted: false,
        order: {
          orderDate: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        },
      },
      include: { employee: true },
    });

    const seen = new Map<
      string,
      { id: string; name: string; imageUrl: string | null }
    >();
    for (const d of details) {
      if (d.employee && !seen.has(d.employee.id)) {
        seen.set(d.employee.id, {
          id: d.employee.id,
          name: d.employee.name,
          imageUrl: d.employee.imageUrl,
        });
      }
    }

    return Array.from(seen.values()).sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  async farmerProcessingInquiry(
    query: FarmerProcessingInquiryQueryDto,
  ): Promise<FarmerProcessingInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.farmerIds) {
      const ids = query.farmerIds.split(',').filter(Boolean);
      if (ids.length) where.farmerId = { in: ids };
    }
    if (query.startDate || query.endDate) {
      where.order = {
        orderDate: {
          ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
          ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
        },
      };
    }

    const batches = await this.prisma.receivingBatch.findMany({
      where,
      include: {
        farmer: true,
        order: true,
        details: { where: { isDeleted: false } },
        processingDetails: { where: { isDeleted: false } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = batches.map((batch) => {
      const inputQty = batch.details.reduce(
        (s, d) => s + Number(d.quantity),
        0,
      );
      const h01 = batch.processingDetails;
      const processingInputQty = h01.reduce(
        (s, p) => s + Number(p.inputQty),
        0,
      );
      const outputQty = h01.reduce((s, p) => s + Number(p.outputQty), 0);
      const defectQty = h01.reduce((s, p) => s + Number(p.defectQty), 0);
      const amount = h01.reduce((s, p) => s + p.amount, 0);
      const loss = inputQty - outputQty - defectQty;
      const lossRate = inputQty > 0 ? (loss / inputQty) * 100 : null;
      const completionRate = inputQty > 0 ? (outputQty / inputQty) * 100 : null;

      return {
        date: batch.order.orderDate,
        farmerId: batch.farmer.id,
        farmerName: batch.farmer.name,
        inputQty,
        processingInputQty,
        outputQty,
        defectQty,
        loss,
        lossRate,
        completionRate,
        amount,
      };
    });

    const totalInputQty = rows.reduce((s, r) => s + r.inputQty, 0);
    const totalProcessingInputQty = rows.reduce(
      (s, r) => s + r.processingInputQty,
      0,
    );
    const totalOutputQty = rows.reduce((s, r) => s + r.outputQty, 0);
    const totalDefectQty = rows.reduce((s, r) => s + r.defectQty, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

    return {
      rows,
      summary: {
        totalInputQty,
        totalProcessingInputQty,
        totalOutputQty,
        totalDefectQty,
        totalAmount,
      },
    };
  }

  async h02ProcessingInquiry(
    query: H02ProcessingInquiryQueryDto,
  ): Promise<H02ProcessingInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.receivingItemId) {
      where.receivingItemId = query.receivingItemId;
    }
    if (query.startDate || query.endDate) {
      where.orderDate = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const orders = await this.prisma.receivingOrder.findMany({
      where,
      include: {
        receivingItem: true,
        batches: {
          where: { isDeleted: false },
          include: {
            details: { where: { isDeleted: false } },
            processingDetails: { where: { isDeleted: false } },
          },
        },
        processingDetails: {
          where: { isDeleted: false },
          include: { item: true },
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    const rows = orders.map((order) => {
      const inputQty = order.batches.reduce(
        (s, b) => s + b.details.reduce((s2, d) => s2 + Number(d.quantity), 0),
        0,
      );
      const h01Output = order.batches.reduce(
        (s, b) =>
          s +
          b.processingDetails.reduce((s2, p) => s2 + Number(p.outputQty), 0),
        0,
      );
      const h02Details = order.processingDetails.filter(
        (p) => p.item.type === 'H02',
      );
      const h02Output = h02Details.reduce((s, p) => s + Number(p.outputQty), 0);
      const amount = h02Details.reduce((s, p) => s + p.amount, 0);
      const h01CompletionRate =
        inputQty > 0 ? (h01Output / inputQty) * 100 : null;
      const h02CompletionRate =
        inputQty > 0 ? (h02Output / inputQty) * 100 : null;

      return {
        date: order.orderDate,
        orderId: order.id,
        receivingItemName: order.receivingItem.name,
        inputQty,
        h01Output,
        h02Output,
        h01CompletionRate,
        h02CompletionRate,
        amount,
      };
    });

    const totalH01Output = rows.reduce((s, r) => s + r.h01Output, 0);
    const totalH02Output = rows.reduce((s, r) => s + r.h02Output, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

    return {
      rows,
      summary: { totalH01Output, totalH02Output, totalAmount },
    };
  }

  async h03ProcessingInquiry(
    query: H03ProcessingInquiryQueryDto,
  ): Promise<H03ProcessingInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.receivingItemId) {
      where.receivingItemId = query.receivingItemId;
    }
    if (query.startDate || query.endDate) {
      where.orderDate = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const orders = await this.prisma.receivingOrder.findMany({
      where,
      include: {
        receivingItem: true,
        batches: {
          where: { isDeleted: false },
          include: { processingDetails: { where: { isDeleted: false } } },
        },
        processingDetails: {
          where: { isDeleted: false },
          include: { item: true },
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    const rows = orders.map((order) => {
      const h01Defect = order.batches.reduce(
        (s, b) =>
          s +
          b.processingDetails.reduce((s2, p) => s2 + Number(p.defectQty), 0),
        0,
      );
      const h03Details = order.processingDetails.filter(
        (p) => p.item.type === 'H03',
      );
      const h03Output = h03Details.reduce((s, p) => s + Number(p.outputQty), 0);
      const amount = h03Details.reduce((s, p) => s + p.amount, 0);

      return {
        date: order.orderDate,
        orderId: order.id,
        receivingItemName: order.receivingItem.name,
        h01Defect,
        h03Output,
        amount,
      };
    });

    const totalH01Defect = rows.reduce((s, r) => s + r.h01Defect, 0);
    const totalH03Output = rows.reduce((s, r) => s + r.h03Output, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

    return {
      rows,
      summary: { totalH01Defect, totalH03Output, totalAmount },
    };
  }

  async packagingInquiry(
    query: PackagingInquiryQueryDto,
  ): Promise<PackagingInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.packagingItemIds) {
      const ids = query.packagingItemIds.split(',').filter(Boolean);
      if (ids.length) where.itemId = { in: ids };
    }
    if (query.startDate || query.endDate) {
      where.order = {
        orderDate: {
          ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
          ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
        },
      };
    }

    const details = await this.prisma.packagingDetail.findMany({
      where,
      include: { employee: true, item: true, order: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows = details.map((d) => ({
      date: d.order.orderDate,
      employeeId: d.employee.id,
      employeeName: d.employee.name,
      itemId: d.item.id,
      itemName: d.item.name,
      quantity: Number(d.quantity),
      wageRate: Number(d.wageRate),
      amount: d.amount,
    }));

    const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

    return {
      rows,
      summary: { totalQuantity, totalAmount },
    };
  }

  async contractWorkInquiry(
    query: ContractWorkInquiryQueryDto,
  ): Promise<ContractWorkInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.supplierIds) {
      const ids = query.supplierIds.split(',').filter(Boolean);
      if (ids.length) where.supplierId = { in: ids };
    }
    if (query.productIds) {
      const ids = query.productIds.split(',').filter(Boolean);
      if (ids.length) where.productId = { in: ids };
    }
    if (query.startDate || query.endDate) {
      where.order = {
        orderDate: {
          ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
          ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
        },
      };
    }

    const details = await this.prisma.contractWorkDetail.findMany({
      where,
      include: { supplier: true, product: true, order: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows = details.map((d) => ({
      date: d.order.orderDate,
      supplierId: d.supplier.id,
      supplierName: d.supplier.name,
      productId: d.product.id,
      productName: d.product.name,
      quantity: Number(d.quantity),
      weight: Number(d.weight),
      unitPrice: Number(d.unitPrice),
      amount: d.amount,
    }));

    const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
    const totalWeight = rows.reduce((s, r) => s + r.weight, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

    return {
      rows,
      summary: { totalQuantity, totalWeight, totalAmount },
    };
  }

  async transportInquiry(
    query: TransportInquiryQueryDto,
  ): Promise<TransportInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.carrierIds) {
      const ids = query.carrierIds.split(',').filter(Boolean);
      if (ids.length) where.carrierId = { in: ids };
    }
    if (query.startDate || query.endDate) {
      where.orderDate = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const orders = await this.prisma.transportOrder.findMany({
      where,
      include: { carrier: true },
      orderBy: { orderDate: 'desc' },
    });

    const rows = orders.map((o) => ({
      date: o.orderDate,
      carrierId: o.carrier.id,
      carrierName: o.carrier.name,
      quantity: Number(o.quantity),
      unitPrice: Number(o.unitPrice),
      amount: o.amount,
    }));

    const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

    return {
      rows,
      summary: { totalQuantity, totalAmount },
    };
  }

  async purchaseInquiry(
    query: PurchaseInquiryQueryDto,
  ): Promise<PurchaseInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.startDate || query.endDate) {
      where.order = {
        orderDate: {
          ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
          ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
        },
      };
    }

    const details = await this.prisma.purchaseDetail.findMany({
      where,
      include: { item: true, order: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows = details.map((d) => ({
      date: d.order.orderDate,
      itemId: d.item.id,
      itemName: d.item.name,
      quantity: Number(d.quantity),
      unitPrice: Number(d.unitPrice),
      amount: d.amount,
    }));

    const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

    return {
      rows,
      summary: { totalQuantity, totalAmount },
    };
  }

  async salesInquiry(query: SalesInquiryQueryDto): Promise<SalesInquiryResult> {
    const where: any = { isDeleted: false };

    if (query.customerIds) {
      const ids = query.customerIds.split(',').filter(Boolean);
      if (ids.length)
        where.order = { ...(where.order ?? {}), customerId: { in: ids } };
    }
    if (query.startDate || query.endDate) {
      where.order = {
        ...(where.order ?? {}),
        orderDate: {
          ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
          ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
        },
      };
    }

    const details = await this.prisma.salesDetail.findMany({
      where,
      include: { product: true, order: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = details.map((d) => ({
      date: d.order.orderDate,
      customerId: d.order.customer.id,
      customerName: d.order.customer.name,
      productId: d.product.id,
      productName: d.product.name,
      weight: Number(d.weight),
      quantity: Number(d.quantity),
      unitPrice: Number(d.unitPrice),
      amount: d.amount,
    }));

    const totalWeight = rows.reduce((s, r) => s + r.weight, 0);
    const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

    return {
      rows,
      summary: { totalWeight, totalQuantity, totalAmount },
    };
  }

  async getSalesOrdersForCost(
    query: SalesOrdersForCostQueryDto,
  ): Promise<SalesOrderForCostRow[]> {
    const dateRange = {
      ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
      ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
    };
    const hasRange = Object.keys(dateRange).length > 0;
    const channel = query.channel === 'DOMESTIC' ? 'DOMESTIC' : 'EXPORT';

    const details = await this.prisma.salesDetail.findMany({
      where: {
        isDeleted: false,
        product: { productType: channel },
        order: {
          isDeleted: false,
          ...(hasRange ? { orderDate: dateRange } : {}),
        },
      },
      include: { order: { include: { customer: true } } },
    });

    const byOrder = new Map<string, SalesOrderForCostRow>();
    for (const d of details) {
      const existing = byOrder.get(d.orderId);
      if (existing) {
        existing.amount += d.amount;
      } else {
        byOrder.set(d.orderId, {
          id: d.orderId,
          orderDate: d.order.orderDate,
          customerName: d.order.customer?.name ?? '',
          amount: d.amount,
        });
      }
    }
    return Array.from(byOrder.values()).sort((a, b) => (a.id < b.id ? 1 : -1));
  }

  /**
   * 檢查一批成本來源是否可安全計入這次所選銷售單集合的成本，並認列。
   * 目前只在「境內(H03)」這條線使用——出口(EXPORT)側已改用入庫時鎖定的單位成本直接乘以賣出數量，
   * 不再需要這套認列機制（天然不會重複也不會漏算）。
   */
  private async resolveClaimableSources(
    sourceType: 'RECEIVING_H03',
    sourceIds: string[],
    selectedSalesOrderIds: string[],
    sourceRelevantOrders?: Map<string, Set<string>>,
  ): Promise<{ includable: string[]; excluded: string[] }> {
    if (sourceIds.length === 0) return { includable: [], excluded: [] };

    const claims = await this.prisma.costClaim.findMany({
      where: { sourceType, sourceId: { in: sourceIds } },
    });

    const claimsBySource = new Map<string, Set<string>>();
    for (const c of claims) {
      if (!claimsBySource.has(c.sourceId))
        claimsBySource.set(c.sourceId, new Set());
      claimsBySource.get(c.sourceId)!.add(c.salesOrderId);
    }

    const selectedSet = new Set(selectedSalesOrderIds);
    const includable: string[] = [];
    const excluded: string[] = [];

    for (const id of sourceIds) {
      const existing = claimsBySource.get(id);
      const isSubset =
        !existing || [...existing].every((s) => selectedSet.has(s));
      if (isSubset) includable.push(id);
      else excluded.push(id);
    }

    if (includable.length > 0) {
      const rows: {
        sourceType: string;
        sourceId: string;
        salesOrderId: string;
      }[] = [];
      for (const id of includable) {
        const relevant = sourceRelevantOrders?.get(id) ?? selectedSet;
        for (const salesOrderId of relevant) {
          rows.push({ sourceType, sourceId: id, salesOrderId });
        }
      }
      if (rows.length > 0) {
        await this.prisma.costClaim.createMany({
          data: rows,
          skipDuplicates: true,
        });
      }
    }

    return { includable, excluded };
  }

  async costAnalysis(query: CostAnalysisQueryDto): Promise<CostAnalysisResult> {
    const exportOrderIds = query.exportOrderIds
      ? query.exportOrderIds.split(',').filter(Boolean)
      : [];
    const domesticOrderIds = query.domesticOrderIds
      ? query.domesticOrderIds.split(',').filter(Boolean)
      : [];

    let exportResult: CostAnalysisExportResult | null = null;
    let domesticResult: CostAnalysisDomesticResult | null = null;

    if (exportOrderIds.length > 0) {
      const salesAgg = await this.prisma.salesDetail.aggregate({
        where: {
          isDeleted: false,
          orderId: { in: exportOrderIds },
          product: { productType: 'EXPORT' },
        },
        _sum: { amount: true },
      });
      const totalSales = salesAgg._sum.amount ?? 0;

      // 每張來源進貨單分開計算真實單位成本，再按各銷售單實際使用公斤數分攤。
      const salesInvLinks = await this.prisma.salesInventoryDetail.findMany({
        where: {
          salesOrderId: { in: exportOrderIds },
          salesOrder: { isDeleted: false },
          inventoryDetail: {
            isDeleted: false,
            order: { isDeleted: false },
            product: { productType: 'EXPORT' },
          },
        },
        select: {
          quantity: true,
          costUnitPrice: true,
          inventoryDetail: { select: { orderId: true, weight: true } },
        },
      });

      const inventoryOrderIds = Array.from(
        new Set(salesInvLinks.map((link) => link.inventoryDetail.orderId)),
      );
      const receivingSources =
        inventoryOrderIds.length > 0
          ? await this.prisma.inventoryReceivingOrder.findMany({
              where: { inventoryOrderId: { in: inventoryOrderIds } },
              include: {
                receivingOrder: {
                  include: {
                    batches: {
                      where: { isDeleted: false },
                      include: {
                        details: { where: { isDeleted: false } },
                        processingDetails: {
                          where: { isDeleted: false, item: { type: 'H01' } },
                        },
                      },
                    },
                    processingDetails: {
                      where: { isDeleted: false, item: { type: 'H02' } },
                    },
                    packagingOrders: {
                      where: { isDeleted: false },
                      include: {
                        details: {
                          where: {
                            isDeleted: false,
                            item: { applicableTo: 'RECEIVING_ORDER' },
                          },
                        },
                      },
                    },
                    inventoryOrderLinks: {
                      include: {
                        inventoryOrder: {
                          include: {
                            details: {
                              where: {
                                isDeleted: false,
                                product: { productType: 'EXPORT' },
                              },
                            },
                            receivingOrders: true,
                            contractOrders: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            })
          : [];
      const contractSources =
        inventoryOrderIds.length > 0
          ? await this.prisma.inventoryContractOrder.findMany({
              where: { inventoryOrderId: { in: inventoryOrderIds } },
              select: { inventoryOrderId: true, contractOrderId: true },
            })
          : [];

      const receivingByInventoryOrder = new Map<
        string,
        typeof receivingSources
      >();
      for (const source of receivingSources) {
        const rows =
          receivingByInventoryOrder.get(source.inventoryOrderId) ?? [];
        rows.push(source);
        receivingByInventoryOrder.set(source.inventoryOrderId, rows);
      }
      const contractsByInventoryOrder = new Map<
        string,
        typeof contractSources
      >();
      for (const source of contractSources) {
        const rows =
          contractsByInventoryOrder.get(source.inventoryOrderId) ?? [];
        rows.push(source);
        contractsByInventoryOrder.set(source.inventoryOrderId, rows);
      }

      const receivingUnitCostByOrder = new Map<string, number>();
      let totalRealCost = 0;
      let totalContractCost = 0;

      for (const link of salesInvLinks) {
        const inventoryOrderId = link.inventoryDetail.orderId;
        const receivingRows =
          receivingByInventoryOrder.get(inventoryOrderId) ?? [];
        const contractRows =
          contractsByInventoryOrder.get(inventoryOrderId) ?? [];
        const soldWeightKg = Number(link.inventoryDetail.weight);

        if (receivingRows.length === 1 && contractRows.length === 0) {
          const receivingOrder = receivingRows[0].receivingOrder;
          let unitCost = receivingUnitCostByOrder.get(receivingOrder.id);

          if (unitCost === undefined) {
            const receivingAmount = receivingOrder.batches
              .flatMap((batch) => batch.details)
              .reduce((sum, detail) => sum + detail.amount, 0);
            const h01Wage = receivingOrder.batches
              .flatMap((batch) => batch.processingDetails)
              .reduce((sum, detail) => sum + detail.amount, 0);
            const h02Wage = receivingOrder.processingDetails.reduce(
              (sum, detail) => sum + detail.amount,
              0,
            );
            const k01k02Wage = receivingOrder.packagingOrders
              .flatMap((order) => order.details)
              .reduce((sum, detail) => sum + detail.amount, 0);
            const activeInventoryOrders = receivingOrder.inventoryOrderLinks
              .map((source) => source.inventoryOrder)
              .filter((order) => !order.isDeleted);

            const hasAmbiguousInventorySource = activeInventoryOrders.some(
              (order) =>
                order.receivingOrders.length !== 1 ||
                order.receivingOrders[0].receivingOrderId !==
                  receivingOrder.id ||
                order.contractOrders.length > 0,
            );
            if (hasAmbiguousInventorySource) {
              throw new ConflictException(
                `進貨單 ${receivingOrder.id} 關聯的入庫單含有多重或代工來源，無法計算真實成本`,
              );
            }

            const exportInventoryKg = activeInventoryOrders
              .flatMap((order) => order.details)
              .reduce(
                (sum, detail) => sum + detail.quantity * Number(detail.weight),
                0,
              );

            try {
              unitCost = calculateReceivingTrueUnitCost({
                receivingAmount,
                h01Wage,
                h02Wage,
                k01k02Wage,
                exportInventoryKg,
              });
            } catch {
              throw new ConflictException(
                `進貨單 ${receivingOrder.id} 沒有有效的出口入庫總公斤數，無法計算真實成本`,
              );
            }
            receivingUnitCostByOrder.set(receivingOrder.id, unitCost);
          }

          totalRealCost = addCosts(
            totalRealCost,
            calculateAllocatedCost(link.quantity, soldWeightKg, unitCost),
          );
          continue;
        }

        if (receivingRows.length === 0 && contractRows.length >= 1) {
          totalContractCost = addCosts(
            totalContractCost,
            calculateAllocatedCost(
              link.quantity,
              soldWeightKg,
              Number(link.costUnitPrice),
            ),
          );
          continue;
        }

        throw new ConflictException(
          `入庫單 ${inventoryOrderId} 的成本來源缺失或同時連結多種來源，請先確認資料`,
        );
      }

      // K01/K02 已納入進貨來源真實成本；此處只扣除銷售端包裝費。
      const packagingAgg = await this.prisma.packagingDetail.aggregate({
        where: {
          isDeleted: false,
          item: { applicableTo: 'SALES_ORDER' },
          order: { isDeleted: false, salesOrderId: { in: exportOrderIds } },
        },
        _sum: { amount: true },
      });
      const totalPackaging = packagingAgg._sum.amount ?? 0;

      const grossProfit = roundCost(
        totalSales - totalRealCost - totalContractCost - totalPackaging,
      );

      exportResult = {
        totalSales,
        totalRealCost,
        totalContractCost,
        totalPackaging,
        grossProfit,
      };
    }

    if (domesticOrderIds.length > 0) {
      const salesAgg = await this.prisma.salesDetail.aggregate({
        where: {
          isDeleted: false,
          orderId: { in: domesticOrderIds },
          product: { productType: 'DOMESTIC' },
        },
        _sum: { amount: true },
      });
      const totalSales = salesAgg._sum.amount ?? 0;

      // 追溯 H03 加工工資：銷售明細 → 入庫明細 → 入庫主單 → 關聯進貨單 → 對應 H03 加工明細
      // （境內目前未納入單位成本鎖定機制，維持原追溯+認列邏輯，避免跨次查詢重複計入）
      const salesInvLinks = await this.prisma.salesInventoryDetail.findMany({
        where: {
          salesOrderId: { in: domesticOrderIds },
          inventoryDetail: { product: { productType: 'DOMESTIC' } },
        },
        select: { inventoryDetailId: true },
      });
      const inventoryDetailIds = Array.from(
        new Set(salesInvLinks.map((l) => l.inventoryDetailId)),
      );

      let totalH03Wage = 0;

      if (inventoryDetailIds.length > 0) {
        const invDetails = await this.prisma.inventoryDetail.findMany({
          where: { id: { in: inventoryDetailIds } },
          include: { salesDetails: { select: { salesOrderId: true } } },
        });
        const inventoryOrderIds = Array.from(
          new Set(invDetails.map((d) => d.orderId)),
        );

        const receivingLinks =
          await this.prisma.inventoryReceivingOrder.findMany({
            where: { inventoryOrderId: { in: inventoryOrderIds } },
          });
        const receivingOrderIds = Array.from(
          new Set(receivingLinks.map((l) => l.receivingOrderId)),
        );

        if (receivingOrderIds.length > 0) {
          const invDetailsByOrderId = new Map<string, string[]>();
          const invDetailRelevantOrders = new Map<string, Set<string>>();
          for (const d of invDetails) {
            if (!invDetailsByOrderId.has(d.orderId))
              invDetailsByOrderId.set(d.orderId, []);
            invDetailsByOrderId.get(d.orderId)!.push(String(d.id));
            invDetailRelevantOrders.set(
              String(d.id),
              new Set(
                d.salesDetails
                  .filter((sd) => domesticOrderIds.includes(sd.salesOrderId))
                  .map((sd) => sd.salesOrderId),
              ),
            );
          }
          const receivingRelevantOrders = new Map<string, Set<string>>();
          for (const rId of receivingOrderIds) {
            const result = new Set<string>();
            const invOrderIdsForThisReceiving = receivingLinks
              .filter((l) => l.receivingOrderId === rId)
              .map((l) => l.inventoryOrderId);
            for (const invOrderId of invOrderIdsForThisReceiving) {
              for (const detailId of invDetailsByOrderId.get(invOrderId) ??
                []) {
                for (const so of invDetailRelevantOrders.get(detailId) ?? [])
                  result.add(so);
              }
            }
            receivingRelevantOrders.set(rId, result);
          }

          const { includable: claimableReceivingIds } =
            await this.resolveClaimableSources(
              'RECEIVING_H03',
              receivingOrderIds,
              domesticOrderIds,
              receivingRelevantOrders,
            );
          if (claimableReceivingIds.length > 0) {
            const h03Agg = await this.prisma.processingDetail.aggregate({
              where: {
                isDeleted: false,
                item: { type: 'H03' },
                receivingOrderId: { in: claimableReceivingIds },
              },
              _sum: { amount: true },
            });
            totalH03Wage = h03Agg._sum.amount ?? 0;
          }
        }
      }

      domesticResult = {
        totalSales,
        totalH03Wage,
        grossProfit: totalSales - totalH03Wage,
      };
    }

    const combinedGrossProfit =
      (exportResult?.grossProfit ?? 0) + (domesticResult?.grossProfit ?? 0);

    return { exportResult, domesticResult, combinedGrossProfit };
  }
}

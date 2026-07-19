import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessingOrderDto } from './dto/create-processing-order.dto';
import { CreateProcessingDetailDto } from './dto/create-processing-detail.dto';
import { UpdateProcessingDetailDto } from './dto/update-processing-detail.dto';
import { UpdateOrderDateDto } from './dto/update-order-date.dto';
import { format } from 'date-fns';

@Injectable()
export class ProcessingService {
  constructor(private readonly prisma: PrismaService) {}

  private fixDate(d: any): string {
    if (!d) return d;
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ── 主單列表 ──────────────────────────────────────────────────────
  async findAllOrders(itemId?: string, date?: string) {
    const orders = await this.prisma.processingOrder.findMany({
      where: {
        isDeleted: false,
        ...(itemId ? { receivingItemId: itemId } : {}),
        ...(date ? { orderDate: new Date(date) } : {}),
      },
      include: {
        receivingItem: { select: { id: true, name: true, imageUrl: true } },
        details: {
          where: { isDeleted: false },
          orderBy: { id: 'asc' },
          include: {
            item: true,
            employee: { select: { id: true, name: true } },
            batch: { select: { id: true, orderId: true, farmerId: true, processingDone: true } },
            farmer: { select: { id: true, name: true } },
            receivingOrder: { select: { id: true, h02Done: true, h03Done: true } },
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    });
    return orders.map(o => ({ ...o, orderDate: this.fixDate(o.orderDate) }));
  }

  findDeletedOrders() {
    return this.prisma.processingOrder.findMany({
      where: { isDeleted: true },
      include: {
        receivingItem: { select: { id: true, name: true, imageUrl: true } },
        details: true,
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOneOrder(id: string, includeDeleted = false) {
    const order = await this.prisma.processingOrder.findUnique({
      where: { id },
      include: {
        receivingItem: { select: { id: true, name: true, imageUrl: true } },
        details: {
          where: includeDeleted ? {} : { isDeleted: false },
          orderBy: { id: 'asc' },
          include: {
            item: true,
            employee: { select: { id: true, name: true } },
            batch: { select: { id: true, orderId: true, farmerId: true, processingDone: true } },
            farmer: { select: { id: true, name: true } },
            receivingOrder: { select: { id: true, h02Done: true, h03Done: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException(`加工單 ${id} 不存在`);
    return order;
  }

  // ── 建立主單（當日+品項已有則回傳現有）────────────────────────────
  async findOrCreateOrder(dto: CreateProcessingOrderDto) {
    const orderDate = new Date(dto.orderDate);
    const existing = await this.prisma.processingOrder.findFirst({
      where: {
        orderDate,
        receivingItemId: dto.receivingItemId,
        isDeleted: false,
      },
    });
    if (existing) return existing;

    // 產生序號 PO-YYYYMMDD-XXX
    const dateStr = format(orderDate, 'yyyyMMdd');
    const count = await this.prisma.processingOrder.count({
      where: { orderNo: { startsWith: `PO-${dateStr}-` } },
    });
    const orderNo = `PO-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.processingOrder.create({
      data: {
        orderNo,
        orderDate,
        receivingItemId: dto.receivingItemId,
        sourceType: dto.sourceType,
      },
    });
  }

  async updateOrderDate(id: string, dto: UpdateOrderDateDto) {
    const order = await this.prisma.processingOrder.findFirst({ where: { id, isDeleted: false } });
    if (!order) throw new NotFoundException(`加工單 ${id} 不存在`);

    const newDate = new Date(dto.orderDate);
    const conflict = await this.prisma.processingOrder.findFirst({
      where: {
        orderDate: newDate,
        receivingItemId: order.receivingItemId,
        isDeleted: false,
        NOT: { id },
      },
    });
    if (conflict) {
      throw new ConflictException(`該日期已有同品項的加工單 ${conflict.orderNo}，無法修改`);
    }

    return this.prisma.processingOrder.update({
      where: { id },
      data: { orderDate: newDate },
    });
  }

  async softDeleteOrder(id: string) {
    const order = await this.prisma.processingOrder.findFirst({ where: { id, isDeleted: false } });
    if (!order) throw new NotFoundException(`加工單 ${id} 不存在`);
    return this.prisma.processingOrder.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteOrder(id: string, operatorId: number) {
    const order = await this.prisma.processingOrder.findUnique({
      where: { id },
      include: { details: true },
    });
    if (!order) throw new NotFoundException(`加工單 ${id} 不存在`);
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const detail of order.details) {
          await tx.defectPool.deleteMany({ where: { sourceBatchId: detail.batchCode } });
        }
        for (const detail of order.details) {
          await tx.auditLog.deleteMany({ where: { processingDetailId: detail.id } });
        }
        await tx.processingDetail.deleteMany({ where: { orderId: id } });
        await tx.processingOrder.delete({ where: { id } });
        await tx.auditLog.create({
          data: { actionType: 'HARD_DELETE', targetTable: 'processing_orders', targetId: id, operatorId, beforeData: order as any },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：加工單 ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { message: `加工單 ${id} 已永久刪除` };
  }

  // ── 可用資料查詢（新增明細用）────────────────────────────────────
  async getAvailableBatches(farmerId: string) {
    return this.prisma.receivingBatch.findMany({
      where: { farmerId, processingDone: false, isDeleted: false },
      include: {
        order: { include: { receivingItem: { select: { id: true, name: true, imageUrl: true } } } },
        details: { where: { isDeleted: false } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAvailableOrdersForH02(receivingItemId?: string) {
    return this.prisma.receivingOrder.findMany({
      where: {
        h02Done: false,
        isDeleted: false,
        ...(receivingItemId ? { receivingItemId } : {}),
      },
      include: {
        receivingItem: { select: { id: true, name: true, imageUrl: true } },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  async getAvailableOrdersForH03(receivingItemId?: string) {
    return this.prisma.receivingOrder.findMany({
      where: {
        h03Done: false,
        isDeleted: false,
        ...(receivingItemId ? { receivingItemId } : {}),
      },
      include: {
        receivingItem: { select: { id: true, name: true, imageUrl: true } },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  async getAvailableDefectPool() {
    return this.prisma.defectPool.findMany({
      where: { remainingQuantity: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── 今日明細（Thailand UTC+7）────────────────────────────────────
  async getTodayDetails() {
    const nowThai = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const todayStr = nowThai.toISOString().slice(0, 10);
    const startOfDay = new Date(todayStr + 'T00:00:00.000Z');
    const endOfDay = new Date(todayStr + 'T23:59:59.999Z');

    const details = await this.prisma.processingDetail.findMany({
      where: {
        isDeleted: false,
        order: { orderDate: { gte: startOfDay, lte: endOfDay }, isDeleted: false },
      },
      include: {
        employee: { select: { id: true, name: true } },
        item: { select: { id: true } },
        order: { select: { orderNo: true, orderDate: true } },
      },
      orderBy: { id: 'desc' },
    });
    return details.map(d => ({
      ...d,
      order: d.order ? { ...d.order, orderDate: this.fixDate(d.order.orderDate) } : d.order,
    }));
  }

  // ── 新增明細（核心邏輯）──────────────────────────────────────────
  async createDetail(dto: CreateProcessingDetailDto) {
    const { itemId, inputQty, outputQty, defectQty = 0, wasteQty = 0, wageRate } = dto;

    // 失重驗證
    let loss: number;
    if (itemId === 'H01') {
      loss = inputQty - outputQty - defectQty;
    } else {
      loss = inputQty - outputQty - wasteQty;
    }
    if (loss < -0.001) throw new BadRequestException(`失重計算異常：loss = ${loss}，禁止儲存`);

    const amount = Math.floor(outputQty * wageRate);
    const batchCode = `${dto.orderId}-${itemId}-${Date.now()}`;
    const workTime = dto.workTime ? new Date(dto.workTime) : new Date();

    const detail = await this.prisma.$transaction(async (tx) => {
      const created = await tx.processingDetail.create({
        data: {
          batchCode,
          orderId: dto.orderId,
          itemId,
          employeeId: dto.employeeId,
          ...(dto.batchId ? { batchId: dto.batchId } : {}),
          ...(dto.farmerId ? { farmerId: dto.farmerId } : {}),
          ...(dto.receivingOrderId ? { receivingOrderId: dto.receivingOrderId } : {}),
          ...(dto.defectPoolId ? { defectPoolId: dto.defectPoolId } : {}),
          inputQty: inputQty.toString(),
          outputQty: outputQty.toString(),
          defectQty: defectQty.toString(),
          wasteQty: wasteQty.toString(),
          wageRate: wageRate.toString(),
          amount,
          workTime,
          ...(dto.notes ? { notes: dto.notes } : {}),
        },
      });

      // H01：建立 DefectPool（不自動更新 processingDone）
      if (itemId === 'H01' && defectQty > 0) {
        await tx.defectPool.create({
          data: {
            sourceBatchId: batchCode,
            quantity: defectQty,
            usedQuantity: 0,
            remainingQuantity: defectQty,
          },
        });
      }

      return created;
    });

    return detail;
  }

  async createOffsetDetail(id: number) {
    const original = await this.prisma.processingDetail.findUnique({ where: { id } });
    if (!original) throw new NotFoundException(`明細 ${id} 不存在`);

    const existingOffset = await this.prisma.processingDetail.findFirst({
      where: { batchCode: { startsWith: original.batchCode + '-OFFSET-' }, isDeleted: false }
    });
    if (existingOffset) throw new BadRequestException('此明細已有沖銷記錄，不可重複沖銷');

    const batchCode = `${original.batchCode}-OFFSET-${Date.now()}`;

    return this.prisma.processingDetail.create({
      data: {
        batchCode,
        orderId: original.orderId,
        itemId: original.itemId,
        employeeId: original.employeeId,
        ...(original.batchId ? { batchId: original.batchId } : {}),
        ...(original.farmerId ? { farmerId: original.farmerId } : {}),
        ...(original.receivingOrderId ? { receivingOrderId: original.receivingOrderId } : {}),
        inputQty: (-Number(original.inputQty)).toString(),
        outputQty: (-Number(original.outputQty)).toString(),
        defectQty: (-Number(original.defectQty)).toString(),
        wasteQty: (-Number(original.wasteQty)).toString(),
        wageRate: original.wageRate,
        amount: -original.amount,
        isOffset: true,
      },
    });
  }

  async updateDetail(id: number, dto: UpdateProcessingDetailDto) {
    const detail = await this.prisma.processingDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`明細 ${id} 不存在`);
    const outputQty = dto.outputQty ?? Number(detail.outputQty);
    const wageRate = dto.wageRate ?? Number(detail.wageRate);
    const amount = Math.floor(outputQty * wageRate);
    return this.prisma.processingDetail.update({
      where: { id },
      data: { ...dto, amount },
    });
  }

  async softDeleteDetail(id: number) {
    const detail = await this.prisma.processingDetail.findFirst({ where: { id, isDeleted: false } });
    if (!detail) throw new NotFoundException(`明細 ${id} 不存在`);
    return this.prisma.processingDetail.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDeleteDetail(id: number, operatorId: number) {
    const detail = await this.prisma.processingDetail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundException(`明細 ${id} 不存在`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.defectPool.deleteMany({ where: { sourceBatchId: detail.batchCode } });
        await tx.auditLog.deleteMany({ where: { processingDetailId: id } });
        await tx.processingDetail.delete({ where: { id } });
        await tx.auditLog.create({
          data: { actionType: 'HARD_DELETE', targetTable: 'processing_details', targetId: String(id), operatorId, beforeData: detail as any },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：明細 ${id} 仍有相關資料參考`);
      }
      throw e;
    }
    return { message: `明細 ${id} 已永久刪除` };
  }
}

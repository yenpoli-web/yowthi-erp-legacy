import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseItemDto } from './dto/create-purchase-item.dto';
import { UpdatePurchaseItemDto } from './dto/update-purchase-item.dto';

@Injectable()
export class PurchaseItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.purchaseItem.findMany({
      where: { isDeleted: false },
      orderBy: { id: 'asc' },
    });
  }

  findDeleted() {
    return this.prisma.purchaseItem.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.purchaseItem.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`PurchaseItem ${id} not found`);
    return record;
  }

  create(dto: CreatePurchaseItemDto) {
    return this.prisma.purchaseItem.create({ data: dto });
  }

  async update(id: string, dto: UpdatePurchaseItemDto) {
    await this.findOne(id);
    const { id: _id, ...data } = dto;
    return this.prisma.purchaseItem.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.purchaseItem.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string, operatorId: number) {
    const record = await this.prisma.purchaseItem.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`PurchaseItem ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.purchaseItem.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'purchase_items',
            targetId: id,
            operatorId,
            beforeData: record as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：PurchaseItem ${id} 仍有相關資料參考`);
      }
      throw e;
    }
  }
}

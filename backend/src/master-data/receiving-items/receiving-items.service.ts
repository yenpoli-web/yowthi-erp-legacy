import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReceivingItemDto } from './dto/create-receiving-item.dto';
import { UpdateReceivingItemDto } from './dto/update-receiving-item.dto';

@Injectable()
export class ReceivingItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.receivingItem.findMany({
      where: { isDeleted: false },
      orderBy: { id: 'asc' },
    });
  }

  findDeleted() {
    return this.prisma.receivingItem.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.receivingItem.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`ReceivingItem ${id} not found`);
    return record;
  }

  create(dto: CreateReceivingItemDto) {
    return this.prisma.receivingItem.create({ data: dto });
  }

  async update(id: string, dto: UpdateReceivingItemDto) {
    await this.findOne(id);
    const { id: _id, ...data } = dto;
    return this.prisma.receivingItem.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.receivingItem.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string, operatorId: number) {
    const record = await this.prisma.receivingItem.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`ReceivingItem ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.receivingItem.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'receiving_items',
            targetId: id,
            operatorId,
            beforeData: record as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：ReceivingItem ${id} 仍有相關資料參考`);
      }
      throw e;
    }
  }
}

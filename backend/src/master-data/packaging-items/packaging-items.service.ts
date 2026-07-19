import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePackagingItemDto } from './dto/create-packaging-item.dto';
import { UpdatePackagingItemDto } from './dto/update-packaging-item.dto';

@Injectable()
export class PackagingItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.packagingItem.findMany({
      where: { isDeleted: false },
      orderBy: { id: 'asc' },
    });
  }

  findDeleted() {
    return this.prisma.packagingItem.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.packagingItem.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`PackagingItem ${id} not found`);
    return record;
  }

  create(dto: CreatePackagingItemDto) {
    return this.prisma.packagingItem.create({ data: dto });
  }

  async update(id: string, dto: UpdatePackagingItemDto) {
    await this.findOne(id);
    const { id: _id, ...data } = dto;
    return this.prisma.packagingItem.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.packagingItem.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string, operatorId: number) {
    const record = await this.prisma.packagingItem.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`PackagingItem ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.packagingItem.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'packaging_items',
            targetId: id,
            operatorId,
            beforeData: record as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：PackagingItem ${id} 仍有相關資料參考`);
      }
      throw e;
    }
  }
}

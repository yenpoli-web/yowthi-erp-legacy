import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';

@Injectable()
export class FarmersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.farmer.findMany({
      where: { isDeleted: false },
      orderBy: { id: 'asc' },
    });
  }

  findDeleted() {
    return this.prisma.farmer.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.farmer.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Farmer ${id} not found`);
    return record;
  }

  create(dto: CreateFarmerDto) {
    return this.prisma.farmer.create({ data: dto });
  }

  async update(id: string, dto: UpdateFarmerDto) {
    await this.findOne(id);
    const { id: _id, ...data } = dto;
    return this.prisma.farmer.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.farmer.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string, operatorId: number) {
    const record = await this.prisma.farmer.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Farmer ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.farmer.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'farmers',
            targetId: id,
            operatorId,
            beforeData: record as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：Farmer ${id} 仍有相關資料參考`);
      }
      throw e;
    }
  }
}

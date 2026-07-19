import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { UpdateCarrierDto } from './dto/update-carrier.dto';

@Injectable()
export class CarriersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.carrier.findMany({
      where: { isDeleted: false },
      orderBy: { id: 'asc' },
    });
  }

  findDeleted() {
    return this.prisma.carrier.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.carrier.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Carrier ${id} not found`);
    return record;
  }

  create(dto: CreateCarrierDto) {
    return this.prisma.carrier.create({ data: dto });
  }

  async update(id: string, dto: UpdateCarrierDto) {
    await this.findOne(id);
    const { id: _id, ...data } = dto;
    return this.prisma.carrier.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.carrier.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string, operatorId: number) {
    const record = await this.prisma.carrier.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Carrier ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.carrier.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'carriers',
            targetId: id,
            operatorId,
            beforeData: record as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：Carrier ${id} 仍有相關資料參考`);
      }
      throw e;
    }
  }
}

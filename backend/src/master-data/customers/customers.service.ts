import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany({
      where: { isDeleted: false },
      orderBy: { id: 'asc' },
    });
  }

  findDeleted() {
    return this.prisma.customer.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.customer.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Customer ${id} not found`);
    return record;
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const { id: _id, ...data } = dto;
    return this.prisma.customer.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string, operatorId: number) {
    const record = await this.prisma.customer.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Customer ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.customer.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'customers',
            targetId: id,
            operatorId,
            beforeData: record as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：Customer ${id} 仍有相關資料參考`);
      }
      throw e;
    }
  }
}

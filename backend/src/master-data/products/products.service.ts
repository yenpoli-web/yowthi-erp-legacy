import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      where: { isDeleted: false },
      orderBy: { id: 'asc' },
    });
  }

  findDeleted() {
    return this.prisma.product.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.product.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Product ${id} not found`);
    return record;
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { id: _id, ...data } = dto;
    return this.prisma.product.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async hardDelete(id: string, operatorId: number) {
    const record = await this.prisma.product.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Product ${id} not found`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.product.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            actionType: 'HARD_DELETE',
            targetTable: 'products',
            targetId: id,
            operatorId,
            beforeData: record as any,
          },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014') {
        throw new ConflictException(`無法刪除：Product ${id} 仍有相關資料參考`);
      }
      throw e;
    }
  }
}

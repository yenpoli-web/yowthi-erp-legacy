import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProcessingItemDto } from './dto/update-processing-item.dto';

@Injectable()
export class ProcessingItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.processingItem.findMany({ orderBy: { id: 'asc' } });
  }

  async update(id: string, dto: UpdateProcessingItemDto) {
    const record = await this.prisma.processingItem.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`ProcessingItem ${id} not found`);
    return this.prisma.processingItem.update({ where: { id }, data: dto });
  }
}

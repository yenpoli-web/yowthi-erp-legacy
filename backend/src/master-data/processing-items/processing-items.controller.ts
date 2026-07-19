import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ProcessingItemsService } from './processing-items.service';
import { UpdateProcessingItemDto } from './dto/update-processing-item.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('master-data/processing-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcessingItemsController {
  constructor(private readonly processingItemsService: ProcessingItemsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  findAll() {
    return this.processingItemsService.findAll();
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateProcessingItemDto) {
    return this.processingItemsService.update(id, dto);
  }
}

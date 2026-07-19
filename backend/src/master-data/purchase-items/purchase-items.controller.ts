import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PurchaseItemsService } from './purchase-items.service';
import { CreatePurchaseItemDto } from './dto/create-purchase-item.dto';
import { UpdatePurchaseItemDto } from './dto/update-purchase-item.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('master-data/purchase-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseItemsController {
  constructor(private readonly purchaseItemsService: PurchaseItemsService) {}

  @Get('deleted')
  @Roles(Role.ADMIN, Role.OFFICE)
  findDeleted() {
    return this.purchaseItemsService.findDeleted();
  }

  @Get()
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY)
  findAll() {
    return this.purchaseItemsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY)
  findOne(@Param('id') id: string) {
    return this.purchaseItemsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.OFFICE)
  create(@Body() dto: CreatePurchaseItemDto) {
    return this.purchaseItemsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OFFICE)
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseItemDto) {
    return this.purchaseItemsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OFFICE)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id') id: string) {
    return this.purchaseItemsService.softDelete(id);
  }

  @Delete(':id/hard')
  @Roles(Role.ADMIN)
  hardDelete(@Param('id') id: string, @Request() req: any) {
    return this.purchaseItemsService.hardDelete(id, req.user.id);
  }
}

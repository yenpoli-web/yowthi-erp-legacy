import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, UseGuards, Req,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreatePurchaseDetailDto } from './dto/create-purchase-detail.dto';
import { UpdatePurchaseDetailDto } from './dto/update-purchase-detail.dto';

@Controller('purchase')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  // ── Orders ──────────────────────────────────────────────

  @Get('orders/deleted')
  @Roles('ADMIN', 'OFFICE')
  findDeleted() {
    return this.purchaseService.findDeleted();
  }

  @Get('orders')
  @Roles('ADMIN', 'OFFICE')
  findAll() {
    return this.purchaseService.findAll();
  }

  @Get('orders/:id')
  @Roles('ADMIN', 'OFFICE')
  findOne(@Param('id') id: string) {
    return this.purchaseService.findOne(id);
  }

  @Post('orders')
  @Roles('ADMIN', 'OFFICE')
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseService.create(dto);
  }

  @Delete('orders/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDelete(@Param('id') id: string) {
    return this.purchaseService.softDelete(id);
  }

  @Delete('orders/:id/hard')
  @Roles('ADMIN')
  hardDelete(@Param('id') id: string, @Req() req: any) {
    return this.purchaseService.hardDelete(id, req.user.id, req.ip);
  }

  // ── Details ─────────────────────────────────────────────

  @Post('details')
  @Roles('ADMIN', 'OFFICE')
  createDetail(@Body() dto: CreatePurchaseDetailDto) {
    return this.purchaseService.createDetail(dto);
  }

  @Patch('details/:id')
  @Roles('ADMIN', 'OFFICE')
  updateDetail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseDetailDto,
  ) {
    return this.purchaseService.updateDetail(id, dto);
  }

  @Delete('details/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDeleteDetail(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseService.softDeleteDetail(id);
  }

  @Delete('details/:id/hard')
  @Roles('ADMIN')
  hardDeleteDetail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.purchaseService.hardDeleteDetail(id, req.user.id, req.ip);
  }
}

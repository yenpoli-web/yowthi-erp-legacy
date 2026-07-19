import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, UseGuards, Req,
} from '@nestjs/common';
import { PackagingService } from './packaging.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreatePackagingOrderDto } from './dto/create-packaging-order.dto';
import { UpdatePackagingOrderDto } from './dto/update-packaging-order.dto';
import { CreatePackagingDetailDto } from './dto/create-packaging-detail.dto';
import { UpdatePackagingDetailDto } from './dto/update-packaging-detail.dto';

@Controller('packaging')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PackagingController {
  constructor(private readonly packagingService: PackagingService) {}

  @Get('orders/available-receiving-orders')
  @Roles('ADMIN', 'OFFICE')
  findAvailableReceivingOrders() {
    return this.packagingService.findAvailableReceivingOrders();
  }

  // ── Orders ──────────────────────────────────────────────

  @Get('orders/deleted')
  @Roles('ADMIN', 'OFFICE')
  findDeletedOrders() {
    return this.packagingService.findDeletedOrders();
  }

  @Get('orders')
  @Roles('ADMIN', 'OFFICE')
  findAllOrders() {
    return this.packagingService.findAllOrders();
  }

  @Get('orders/:id')
  @Roles('ADMIN', 'OFFICE')
  findOneOrder(@Param('id') id: string) {
    return this.packagingService.findOneOrder(id);
  }

  @Post('orders')
  @Roles('ADMIN', 'OFFICE')
  createOrder(@Body() dto: CreatePackagingOrderDto) {
    return this.packagingService.createOrder(dto);
  }

  @Patch('orders/:id')
  @Roles('ADMIN', 'OFFICE')
  updateOrder(@Param('id') id: string, @Body() dto: UpdatePackagingOrderDto) {
    return this.packagingService.updateOrder(id, dto);
  }

  @Patch('orders/:id/sales-done')
  @Roles('ADMIN', 'OFFICE')
  markSalesDone(@Param('id') id: string, @Body() body: { done: boolean }) {
    return this.packagingService.markSalesDone(id, body.done);
  }

  @Delete('orders/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDeleteOrder(@Param('id') id: string) {
    return this.packagingService.softDeleteOrder(id);
  }

  @Delete('orders/:id/hard')
  @Roles('ADMIN')
  hardDeleteOrder(@Param('id') id: string, @Req() req: any) {
    return this.packagingService.hardDeleteOrder(id, req.user.id, req.ip);
  }

  // ── Details ─────────────────────────────────────────────

  @Post('details')
  @Roles('ADMIN', 'OFFICE')
  createDetail(@Body() dto: CreatePackagingDetailDto) {
    return this.packagingService.createDetail(dto);
  }

  @Patch('details/:id')
  @Roles('ADMIN', 'OFFICE')
  updateDetail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePackagingDetailDto,
  ) {
    return this.packagingService.updateDetail(id, dto);
  }

  @Delete('details/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDeleteDetail(@Param('id', ParseIntPipe) id: number) {
    return this.packagingService.softDeleteDetail(id);
  }

  @Delete('details/:id/hard')
  @Roles('ADMIN')
  hardDeleteDetail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.packagingService.hardDeleteDetail(id, req.user.id, req.ip);
  }
}

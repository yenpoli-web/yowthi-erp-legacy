import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, UseGuards, Req,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { CreateSalesDetailDto } from './dto/create-sales-detail.dto';
import { UpdateSalesDetailDto } from './dto/update-sales-detail.dto';
import { AddSalesBatchesDto } from './dto/add-sales-batches.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ── 主單 ──────────────────────────────────────────────────

  @Get('orders/deleted')
  @Roles('ADMIN', 'OFFICE')
  findDeletedOrders() {
    return this.salesService.findDeletedOrders();
  }

  @Get('orders/next-no')
  @Roles('ADMIN', 'OFFICE')
  getNextOrderNo(@Query('date') date: string) {
    return this.salesService.getNextOrderNo(date);
  }

  @Get('orders')
  @Roles('ADMIN', 'OFFICE')
  findAllOrders(
    @Query('customerId') customerId?: string,
    @Query('date') date?: string,
  ) {
    return this.salesService.findAllOrders(customerId, date);
  }

  @Get('orders/:id')
  @Roles('ADMIN', 'OFFICE')
  findOneOrder(@Param('id') id: string) {
    return this.salesService.findOneOrder(id);
  }

  @Post('orders')
  @Roles('ADMIN', 'OFFICE')
  createOrder(@Body() dto: CreateSalesOrderDto) {
    return this.salesService.createOrder(dto);
  }

  @Patch('orders/:id/packaging-done')
  @Roles('ADMIN', 'OFFICE')
  togglePackagingDone(
    @Param('id') id: string,
    @Body('packagingDone') packagingDone: boolean,
  ) {
    return this.salesService.togglePackagingDone(id, packagingDone);
  }

  @Delete('orders/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDeleteOrder(@Param('id') id: string) {
    return this.salesService.softDeleteOrder(id);
  }

  @Delete('orders/:id/hard')
  @Roles('ADMIN')
  hardDeleteOrder(@Param('id') id: string, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.salesService.hardDeleteOrder(id, req.user.id, ip);
  }

  // ── 明細 ──────────────────────────────────────────────────

  @Post('details')
  @Roles('ADMIN', 'OFFICE')
  createDetail(@Body() dto: CreateSalesDetailDto) {
    return this.salesService.createDetail(dto);
  }

  @Patch('details/:id')
  @Roles('ADMIN', 'OFFICE')
  updateDetail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSalesDetailDto,
  ) {
    return this.salesService.updateDetail(id, dto);
  }

  @Delete('details/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDeleteDetail(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.softDeleteDetail(id);
  }

  @Delete('details/:id/hard')
  @Roles('ADMIN')
  hardDeleteDetail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.salesService.hardDeleteDetail(id, req.user.id, ip);
  }

  // ── 進貨批次關聯 ──────────────────────────────────────────

  @Post('orders/:id/batches')
  @Roles('ADMIN', 'OFFICE')
  addBatches(@Param('id') id: string, @Body() dto: AddSalesBatchesDto) {
    return this.salesService.addBatches(id, dto);
  }

  @Delete('orders/:orderId/batches/:batchId')
  @Roles('ADMIN', 'OFFICE')
  removeBatch(
    @Param('orderId') orderId: string,
    @Param('batchId') batchId: string,
  ) {
    return this.salesService.removeBatch(orderId, batchId);
  }

  // ── 入庫明細關聯 ──────────────────────────────────────

  @Post('orders/:id/inventory-details')
  @Roles('ADMIN', 'OFFICE')
  addInventoryDetails(
    @Param('id') id: string,
    @Body() body: { items: Array<{ inventoryDetailId: number }> },
  ) {
    return this.salesService.addInventoryDetails(id, body.items);
  }

  @Delete('inventory-details/:id')
  @Roles('ADMIN', 'OFFICE')
  removeSalesInventoryDetail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.salesService.removeSalesInventoryDetail(id, req.user.id, req.ip);
  }

  // ── 可選資料查詢 ──────────────────────────────────────────

  @Get('available-batches')
  @Roles('ADMIN', 'OFFICE')
  findAvailableBatches(
    @Query('processingType') processingType?: string,
    @Query('receivingItemId') receivingItemId?: string,
  ) {
    return this.salesService.findAvailableBatches(processingType, receivingItemId);
  }

  @Get('available-orders')
  @Roles('ADMIN', 'OFFICE')
  findAvailableOrders(
    @Query('processingType') processingType?: string,
    @Query('receivingItemId') receivingItemId?: string,
  ) {
    return this.salesService.findAvailableOrders(processingType, receivingItemId);
  }
}

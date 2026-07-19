import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, ParseIntPipe, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { CreateProcessingOrderDto } from './dto/create-processing-order.dto';
import { CreateProcessingDetailDto } from './dto/create-processing-detail.dto';
import { UpdateProcessingDetailDto } from './dto/update-processing-detail.dto';
import { UpdateOrderDateDto } from './dto/update-order-date.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('processing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  // ── 主單 ──────────────────────────────────────────────────────────
  @Get('orders/deleted')
  @Roles(Role.ADMIN, Role.OFFICE)
  findDeletedOrders() {
    return this.processingService.findDeletedOrders();
  }

  @Get('orders')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY)
  findAllOrders(@Query('itemId') itemId?: string, @Query('date') date?: string) {
    return this.processingService.findAllOrders(itemId, date);
  }

  @Get('orders/:id')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY)
  findOneOrder(@Param('id') id: string, @Query('includeDeleted') includeDeleted?: string) {
    return this.processingService.findOneOrder(id, includeDeleted === 'true');
  }

  @Post('orders')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  findOrCreateOrder(@Body() dto: CreateProcessingOrderDto) {
    return this.processingService.findOrCreateOrder(dto);
  }

  @Patch('orders/:id/date')
  @Roles(Role.ADMIN, Role.OFFICE)
  updateOrderDate(@Param('id') id: string, @Body() dto: UpdateOrderDateDto) {
    return this.processingService.updateOrderDate(id, dto);
  }

  @Delete('orders/:id')
  @Roles(Role.ADMIN, Role.OFFICE)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDeleteOrder(@Param('id') id: string) {
    return this.processingService.softDeleteOrder(id);
  }

  @Delete('orders/:id/hard')
  @Roles(Role.ADMIN)
  hardDeleteOrder(@Param('id') id: string, @Req() req: any) {
    return this.processingService.hardDeleteOrder(id, req.user.id);
  }

  // ── 可用資料查詢 ──────────────────────────────────────────────────
  @Get('available/batches')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  getAvailableBatches(@Query('farmerId') farmerId: string) {
    return this.processingService.getAvailableBatches(farmerId);
  }

  @Get('available/orders-h02')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  getAvailableOrdersForH02(@Query('receivingItemId') receivingItemId?: string) {
    return this.processingService.getAvailableOrdersForH02(receivingItemId);
  }

  @Get('available/orders-h03')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  getAvailableOrdersForH03(@Query('receivingItemId') receivingItemId?: string) {
    return this.processingService.getAvailableOrdersForH03(receivingItemId);
  }

  @Get('available/defect-pool')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY)
  getAvailableDefectPool() {
    return this.processingService.getAvailableDefectPool();
  }

  // ── 明細 ──────────────────────────────────────────────────────────
  @Get('details/today')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  getTodayDetails() {
    return this.processingService.getTodayDetails();
  }

  @Post('details')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  createDetail(@Body() dto: CreateProcessingDetailDto) {
    return this.processingService.createDetail(dto);
  }

  @Post('details/:id/offset')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  createOffsetDetail(@Param('id', ParseIntPipe) id: number) {
    return this.processingService.createOffsetDetail(id);
  }

  @Patch('details/:id')
  @Roles(Role.ADMIN, Role.OFFICE)
  updateDetail(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProcessingDetailDto) {
    return this.processingService.updateDetail(id, dto);
  }

  @Delete('details/:id')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDeleteDetail(@Param('id', ParseIntPipe) id: number) {
    return this.processingService.softDeleteDetail(id);
  }

  @Delete('details/:id/hard')
  @Roles(Role.ADMIN)
  hardDeleteDetail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.processingService.hardDeleteDetail(id, req.user.id);
  }
}

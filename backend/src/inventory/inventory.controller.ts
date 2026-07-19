import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, UseGuards, Req,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateInventoryOrderDto } from './dto/create-inventory-order.dto';
import { CreateInventoryDetailDto } from './dto/create-inventory-detail.dto';
import { UpdateInventoryDetailDto } from './dto/update-inventory-detail.dto';
import { AddInventoryReceivingOrdersDto } from './dto/add-inventory-receiving-orders.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── 主單 ──────────────────────────────────────────────────

  @Get('orders/deleted')
  @Roles('ADMIN', 'OFFICE')
  findDeletedOrders() { return this.inventoryService.findDeletedOrders(); }

  @Get('orders/available-receiving-orders')
  @Roles('ADMIN', 'OFFICE')
  findAvailableReceivingOrders(@Query('processingType') processingType?: string) {
    return this.inventoryService.findAvailableReceivingOrders(processingType);
  }

  @Get('orders/available-contract-orders')
  @Roles('ADMIN', 'OFFICE')
  findAvailableContractOrders() {
    return this.inventoryService.findAvailableContractOrders();
  }

  @Post('orders/:id/contract-orders')
  @Roles('ADMIN', 'OFFICE')
  addContractOrders(@Param('id') id: string, @Body() body: { contractOrderIds: string[] }) {
    return this.inventoryService.addContractOrders(id, body.contractOrderIds);
  }

  @Delete('orders/:orderId/contract-orders/:contractOrderId')
  @Roles('ADMIN', 'OFFICE')
  removeContractOrder(@Param('orderId') orderId: string, @Param('contractOrderId') contractOrderId: string) {
    return this.inventoryService.removeContractOrder(orderId, contractOrderId);
  }

  @Get('orders/stock-summary')
  @Roles('ADMIN', 'OFFICE')
  getStockSummary() { return this.inventoryService.getStockSummary(); }

  @Get('details/available')
  @Roles('ADMIN', 'OFFICE')
  findAvailableInventoryDetails(@Query('productType') productType?: string) {
    return this.inventoryService.findAvailableInventoryDetails(productType);
  }

  @Patch('details/:id/sales-status')
  @Roles('ADMIN', 'OFFICE')
  updateDetailSalesStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { salesStatus: string },
  ) {
    return this.inventoryService.updateDetailSalesStatus(id, body.salesStatus);
  }

  @Get('orders')
  @Roles('ADMIN', 'OFFICE')
  findAllOrders() { return this.inventoryService.findAllOrders(); }

  @Get('orders/:id')
  @Roles('ADMIN', 'OFFICE')
  findOneOrder(@Param('id') id: string) { return this.inventoryService.findOneOrder(id); }

  @Post('orders')
  @Roles('ADMIN', 'OFFICE')
  createOrder(@Body() dto: CreateInventoryOrderDto) { return this.inventoryService.createOrder(dto); }

  @Delete('orders/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDeleteOrder(@Param('id') id: string) { return this.inventoryService.softDeleteOrder(id); }

  @Delete('orders/:id/hard')
  @Roles('ADMIN')
  hardDeleteOrder(@Param('id') id: string, @Req() req: any) {
    return this.inventoryService.hardDeleteOrder(id, req.user.id, req.ip);
  }

  // ── 明細 ──────────────────────────────────────────────────

  @Post('details')
  @Roles('ADMIN', 'OFFICE')
  createDetail(@Body() dto: CreateInventoryDetailDto) { return this.inventoryService.createDetail(dto); }

  @Patch('details/:id')
  @Roles('ADMIN', 'OFFICE')
  updateDetail(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInventoryDetailDto) {
    return this.inventoryService.updateDetail(id, dto);
  }

  @Delete('details/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDeleteDetail(@Param('id', ParseIntPipe) id: number) { return this.inventoryService.softDeleteDetail(id); }

  @Delete('details/:id/hard')
  @Roles('ADMIN')
  hardDeleteDetail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.inventoryService.hardDeleteDetail(id, req.user.id, req.ip);
  }

  // ── 進貨單關聯 ────────────────────────────────────────────

  @Post('orders/:id/receiving-orders')
  @Roles('ADMIN', 'OFFICE')
  addReceivingOrders(@Param('id') id: string, @Body() dto: AddInventoryReceivingOrdersDto) {
    return this.inventoryService.addReceivingOrders(id, dto);
  }

  @Delete('orders/:orderId/receiving-orders/:receivingOrderId')
  @Roles('ADMIN', 'OFFICE')
  removeReceivingOrder(
    @Param('orderId') orderId: string,
    @Param('receivingOrderId') receivingOrderId: string,
  ) { return this.inventoryService.removeReceivingOrder(orderId, receivingOrderId); }

  // ── 進貨單 salesDone ──────────────────────────────────────

  @Patch('receiving-orders/:id/sales-done')
  @Roles('ADMIN', 'OFFICE')
  markSalesDone(@Param('id') id: string, @Body() body: { done: boolean }) {
    return this.inventoryService.markSalesDone(id, body.done);
  }

  @Patch('contract-orders/:id/sales-done')
  @Roles('ADMIN', 'OFFICE')
  markContractSalesDone(@Param('id') id: string, @Body() body: { done: boolean }) {
    return this.inventoryService.markContractSalesDone(id, body.done);
  }
}

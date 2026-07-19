import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, UseGuards, Req,
} from '@nestjs/common';
import { ReceivingService } from './receiving.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateReceivingOrderDto } from './dto/create-receiving-order.dto';
import { UpdateReceivingOrderDto } from './dto/update-receiving-order.dto';
import { CreateReceivingBatchDto } from './dto/create-receiving-batch.dto';
import { UpdateReceivingBatchDto } from './dto/update-receiving-batch.dto';
import { CreateReceivingDetailDto } from './dto/create-receiving-detail.dto';
import { UpdateReceivingDetailDto } from './dto/update-receiving-detail.dto';

@Controller('receiving')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReceivingController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get('orders/deleted')
  @Roles('ADMIN', 'OFFICE', 'FACTORY', 'GUIDED')
  findDeletedOrders() {
    return this.receivingService.findDeletedOrders();
  }

  @Get('orders')
  @Roles('ADMIN', 'OFFICE', 'FACTORY', 'GUIDED')
  findAllOrders(@Query('itemId') itemId?: string, @Query('date') date?: string) {
    return this.receivingService.findAllOrders(itemId, date);
  }

  @Get('orders/:id')
  @Roles('ADMIN', 'OFFICE', 'FACTORY', 'GUIDED')
  findOneOrder(@Param('id') id: string) {
    return this.receivingService.findOneOrder(id);
  }

  @Post('orders')
  @Roles('ADMIN', 'OFFICE')
  createOrder(@Body() dto: CreateReceivingOrderDto) {
    return this.receivingService.createOrder(dto);
  }

  @Patch('orders/:id')
  @Roles('ADMIN', 'OFFICE')
  updateOrder(@Param('id') id: string, @Body() dto: UpdateReceivingOrderDto) {
    return this.receivingService.updateOrder(id, dto);
  }

  @Patch('orders/:id/in-sales')
  @Roles('ADMIN', 'OFFICE')
  async markInSales(@Param('id') id: string, @Body() body: { inSales: boolean }) {
    return this.receivingService.markInSales(id, body.inSales);
  }

  @Patch('orders/:id/sales-done')
  @Roles('ADMIN', 'OFFICE')
  async markSalesDone(@Param('id') id: string, @Body() body: { done: boolean }) {
    return this.receivingService.markSalesDone(id, body.done);
  }

  @Delete('orders/:id')
  @Roles('ADMIN', 'OFFICE')
  softDeleteOrder(@Param('id') id: string) {
    return this.receivingService.softDeleteOrder(id);
  }

  @Delete('orders/:id/hard')
  @Roles('ADMIN')
  hardDeleteOrder(@Param('id') id: string, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.receivingService.hardDeleteOrder(id, req.user.id, ip);
  }

  @Get('batches')
  @Roles('ADMIN', 'OFFICE', 'FACTORY', 'GUIDED')
  findAllBatches(@Query('orderId') orderId?: string) {
    return this.receivingService.findAllBatches(orderId);
  }

  @Post('batches')
  @Roles('ADMIN', 'OFFICE')
  createBatch(@Body() dto: CreateReceivingBatchDto) {
    return this.receivingService.createBatch(dto);
  }

  @Patch('batches/:id')
  @Roles('ADMIN', 'OFFICE')
  updateBatch(@Param('id') id: string, @Body() dto: UpdateReceivingBatchDto) {
    return this.receivingService.updateBatch(id, dto);
  }

  @Delete('batches/:id')
  @Roles('ADMIN', 'OFFICE')
  softDeleteBatch(@Param('id') id: string) {
    return this.receivingService.softDeleteBatch(id);
  }

  @Delete('batches/:id/hard')
  @Roles('ADMIN')
  hardDeleteBatch(@Param('id') id: string, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.receivingService.hardDeleteBatch(id, req.user.id, ip);
  }

  @Get('orders/:id/with-deleted')
  @Roles('ADMIN', 'OFFICE')
  findOneOrderWithDeleted(@Param('id') id: string) {
    return this.receivingService.findOneOrderWithDeleted(id);
  }

  @Post('details')
  @Roles('ADMIN', 'OFFICE')
  createDetail(@Body() dto: CreateReceivingDetailDto) {
    return this.receivingService.createDetail(dto);
  }

  @Patch('details/:id')
  @Roles('ADMIN', 'OFFICE')
  updateDetail(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReceivingDetailDto) {
    return this.receivingService.updateDetail(id, dto);
  }

  @Delete('details/:id')
  @Roles('ADMIN', 'OFFICE')
  softDeleteDetail(@Param('id', ParseIntPipe) id: number) {
    return this.receivingService.softDeleteDetail(id);
  }

  @Delete('details/:id/hard')
  @Roles('ADMIN')
  hardDeleteDetail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.receivingService.hardDeleteDetail(id, req.user.id, ip);
  }
}

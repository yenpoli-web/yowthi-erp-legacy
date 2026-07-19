import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ContractWorkService } from './contract-work.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateContractWorkOrderDto } from './dto/create-contract-work-order.dto';
import { CreateContractWorkDetailDto } from './dto/create-contract-work-detail.dto';
import { UpdateContractWorkDetailDto } from './dto/update-contract-work-detail.dto';

@Controller('contract-work')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractWorkController {
  constructor(private readonly contractWorkService: ContractWorkService) {}

  @Get('orders/deleted')
  @Roles('ADMIN', 'OFFICE')
  findDeletedOrders() { return this.contractWorkService.findDeletedOrders(); }

  @Get('orders')
  @Roles('ADMIN', 'OFFICE')
  findAllOrders() { return this.contractWorkService.findAllOrders(); }

  @Get('orders/:id')
  @Roles('ADMIN', 'OFFICE')
  findOneOrder(@Param('id') id: string) { return this.contractWorkService.findOneOrder(id); }

  @Post('orders')
  @Roles('ADMIN', 'OFFICE')
  createOrder(@Body() dto: CreateContractWorkOrderDto) { return this.contractWorkService.createOrder(dto); }

  @Delete('orders/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDeleteOrder(@Param('id') id: string) { return this.contractWorkService.softDeleteOrder(id); }

  @Delete('orders/:id/hard')
  @Roles('ADMIN')
  hardDeleteOrder(@Param('id') id: string, @Req() req: any) {
    return this.contractWorkService.hardDeleteOrder(id, req.user.id, req.ip);
  }

  @Post('details')
  @Roles('ADMIN', 'OFFICE')
  createDetail(@Body() dto: CreateContractWorkDetailDto) { return this.contractWorkService.createDetail(dto); }

  @Patch('details/:id')
  @Roles('ADMIN', 'OFFICE')
  updateDetail(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContractWorkDetailDto) {
    return this.contractWorkService.updateDetail(id, dto);
  }

  @Delete('details/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDeleteDetail(@Param('id', ParseIntPipe) id: number) { return this.contractWorkService.softDeleteDetail(id); }

  @Delete('details/:id/hard')
  @Roles('ADMIN')
  hardDeleteDetail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.contractWorkService.hardDeleteDetail(id, req.user.id, req.ip);
  }
}
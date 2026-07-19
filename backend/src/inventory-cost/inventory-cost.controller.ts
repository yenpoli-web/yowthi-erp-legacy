import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InventoryCostService } from './inventory-cost.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InventoryCostQueryDto, LockCostDto } from './dto/inventory-cost.dto';

@Controller('inventory-cost')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryCostController {
  constructor(private readonly inventoryCostService: InventoryCostService) {}

  @Get('orders')
  @Roles('ADMIN', 'OFFICE')
  findAll(@Query() query: InventoryCostQueryDto) {
    return this.inventoryCostService.findAll(query);
  }

  @Get('orders/:orderId')
  @Roles('ADMIN', 'OFFICE')
  findOne(@Param('orderId') orderId: string) {
    return this.inventoryCostService.findOne(orderId);
  }

  @Post('orders/:orderId/lock')
  @Roles('ADMIN', 'OFFICE')
  lock(@Param('orderId') orderId: string, @Body() dto: LockCostDto, @Req() req: any) {
    return this.inventoryCostService.lock(orderId, dto, req.user.id);
  }

  @Post('orders/:orderId/unlock')
  @Roles('ADMIN')
  unlock(@Param('orderId') orderId: string, @Req() req: any) {
    return this.inventoryCostService.unlock(orderId, req.user.id);
  }

  // ── 代工成本鎖定（2026-06-30）──

  @Get('contracts')
  @Roles('ADMIN', 'OFFICE')
  findAllContracts(@Query('status') status?: 'ALL' | 'LOCKED' | 'UNLOCKED') {
    return this.inventoryCostService.findAllContracts(status);
  }

  @Post('contracts/:detailId/lock')
  @Roles('ADMIN', 'OFFICE')
  lockContract(@Param('detailId') detailId: string, @Req() req: any) {
    return this.inventoryCostService.lockContractDetail(Number(detailId), req.user.id);
  }

  @Post('contracts/:detailId/unlock')
  @Roles('ADMIN')
  unlockContract(@Param('detailId') detailId: string, @Req() req: any) {
    return this.inventoryCostService.unlockContractDetail(Number(detailId), req.user.id);
  }
}

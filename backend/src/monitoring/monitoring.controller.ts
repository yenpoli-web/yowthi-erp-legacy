import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MonitoringQueryDto } from './dto/monitoring-query.dto';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('orders')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  findAll(@Query() query: MonitoringQueryDto) {
    return this.monitoringService.findAll(query);
  }

  @Get('orders/:orderId')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  findOne(@Param('orderId') orderId: string) {
    return this.monitoringService.findOne(orderId);
  }
}

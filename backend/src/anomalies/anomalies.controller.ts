import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AnomaliesService } from './anomalies.service';

@Controller('anomalies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnomaliesController {
  constructor(private readonly anomaliesService: AnomaliesService) {}

  @Get('summary')
  @Roles('ADMIN', 'OFFICE')
  getSummary() {
    return this.anomaliesService.getSummary();
  }
}

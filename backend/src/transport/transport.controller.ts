import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Req,
} from '@nestjs/common';
import { TransportService } from './transport.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateTransportOrderDto } from './dto/create-transport-order.dto';
import { UpdateTransportOrderDto } from './dto/update-transport-order.dto';

@Controller('transport')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Get('orders/deleted')
  @Roles('ADMIN', 'OFFICE')
  findDeleted() {
    return this.transportService.findDeleted();
  }

  @Get('orders')
  @Roles('ADMIN', 'OFFICE')
  findAll() {
    return this.transportService.findAll();
  }

  @Get('orders/:id')
  @Roles('ADMIN', 'OFFICE')
  findOne(@Param('id') id: string) {
    return this.transportService.findOne(id);
  }

  @Post('orders')
  @Roles('ADMIN', 'OFFICE')
  create(@Body() dto: CreateTransportOrderDto) {
    return this.transportService.create(dto);
  }

  @Patch('orders/:id')
  @Roles('ADMIN', 'OFFICE')
  update(@Param('id') id: string, @Body() dto: UpdateTransportOrderDto) {
    return this.transportService.update(id, dto);
  }

  @Delete('orders/:id/soft')
  @Roles('ADMIN', 'OFFICE')
  softDelete(@Param('id') id: string) {
    return this.transportService.softDelete(id);
  }

  @Delete('orders/:id/hard')
  @Roles('ADMIN')
  hardDelete(@Param('id') id: string, @Req() req: any) {
    return this.transportService.hardDelete(id, req.user.id, req.ip);
  }
}

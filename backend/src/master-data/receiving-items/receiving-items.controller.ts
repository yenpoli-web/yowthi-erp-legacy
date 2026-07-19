import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReceivingItemsService } from './receiving-items.service';
import { CreateReceivingItemDto } from './dto/create-receiving-item.dto';
import { UpdateReceivingItemDto } from './dto/update-receiving-item.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('master-data/receiving-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReceivingItemsController {
  constructor(private readonly receivingItemsService: ReceivingItemsService) {}

  @Get('deleted')
  @Roles(Role.ADMIN, Role.OFFICE)
  findDeleted() {
    return this.receivingItemsService.findDeleted();
  }

  @Get()
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  findAll() {
    return this.receivingItemsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  findOne(@Param('id') id: string) {
    return this.receivingItemsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.OFFICE)
  create(@Body() dto: CreateReceivingItemDto) {
    return this.receivingItemsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OFFICE)
  update(@Param('id') id: string, @Body() dto: UpdateReceivingItemDto) {
    return this.receivingItemsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OFFICE)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id') id: string) {
    return this.receivingItemsService.softDelete(id);
  }

  @Delete(':id/hard')
  @Roles(Role.ADMIN)
  hardDelete(@Param('id') id: string, @Request() req: any) {
    return this.receivingItemsService.hardDelete(id, req.user.id);
  }
}

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
import { PackagingItemsService } from './packaging-items.service';
import { CreatePackagingItemDto } from './dto/create-packaging-item.dto';
import { UpdatePackagingItemDto } from './dto/update-packaging-item.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('master-data/packaging-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PackagingItemsController {
  constructor(private readonly packagingItemsService: PackagingItemsService) {}

  @Get('deleted')
  @Roles(Role.ADMIN, Role.OFFICE)
  findDeleted() {
    return this.packagingItemsService.findDeleted();
  }

  @Get()
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY)
  findAll() {
    return this.packagingItemsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY)
  findOne(@Param('id') id: string) {
    return this.packagingItemsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.OFFICE)
  create(@Body() dto: CreatePackagingItemDto) {
    return this.packagingItemsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OFFICE)
  update(@Param('id') id: string, @Body() dto: UpdatePackagingItemDto) {
    return this.packagingItemsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OFFICE)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id') id: string) {
    return this.packagingItemsService.softDelete(id);
  }

  @Delete(':id/hard')
  @Roles(Role.ADMIN)
  hardDelete(@Param('id') id: string, @Request() req: any) {
    return this.packagingItemsService.hardDelete(id, req.user.id);
  }
}

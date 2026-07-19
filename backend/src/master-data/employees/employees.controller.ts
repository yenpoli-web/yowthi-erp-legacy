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
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('master-data/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('deleted')
  @Roles(Role.ADMIN, Role.OFFICE)
  findDeleted() {
    return this.employeesService.findDeleted();
  }

  @Get()
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OFFICE, Role.FACTORY, Role.GUIDED)
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.OFFICE)
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OFFICE)
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OFFICE)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id') id: string) {
    return this.employeesService.softDelete(id);
  }

  @Delete(':id/hard')
  @Roles(Role.ADMIN)
  hardDelete(@Param('id') id: string, @Request() req: any) {
    return this.employeesService.hardDelete(id, req.user.id);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InquiryService } from './inquiry.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReceivingInquiryQueryDto } from './dto/receiving-inquiry.dto';
import { ReceivingVolumeInquiryQueryDto } from './dto/receiving-volume-inquiry.dto';
import { ProcessingWageInquiryQueryDto } from './dto/processing-wage-inquiry.dto';
import { FarmerProcessingInquiryQueryDto } from './dto/farmer-processing-inquiry.dto';
import { H02ProcessingInquiryQueryDto } from './dto/h02-processing-inquiry.dto';
import { H03ProcessingInquiryQueryDto } from './dto/h03-processing-inquiry.dto';
import { PackagingInquiryQueryDto } from './dto/packaging-inquiry.dto';
import { ContractWorkInquiryQueryDto } from './dto/contract-work-inquiry.dto';
import { TransportInquiryQueryDto } from './dto/transport-inquiry.dto';
import { PurchaseInquiryQueryDto } from './dto/purchase-inquiry.dto';
import { SalesInquiryQueryDto } from './dto/sales-inquiry.dto';
import { CostAnalysisQueryDto, SalesOrdersForCostQueryDto } from './dto/cost-analysis.dto';

@Controller('inquiry')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Get('receiving')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  receivingInquiry(@Query() query: ReceivingInquiryQueryDto) {
    return this.inquiryService.receivingInquiry(query);
  }

  @Get('receiving-volume')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  receivingVolumeInquiry(@Query() query: ReceivingVolumeInquiryQueryDto) {
    return this.inquiryService.receivingVolumeInquiry(query);
  }

  @Get('processing-wage')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  processingWageInquiry(@Query() query: ProcessingWageInquiryQueryDto) {
    return this.inquiryService.processingWageInquiry(query);
  }

  @Get('processing-wage/employees')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  processingWageEmployees(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.inquiryService.processingWageEmployees(startDate, endDate);
  }

  @Get('farmer-processing')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  farmerProcessingInquiry(@Query() query: FarmerProcessingInquiryQueryDto) {
    return this.inquiryService.farmerProcessingInquiry(query);
  }

  @Get('h02-processing')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  h02ProcessingInquiry(@Query() query: H02ProcessingInquiryQueryDto) {
    return this.inquiryService.h02ProcessingInquiry(query);
  }

  @Get('h03-processing')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  h03ProcessingInquiry(@Query() query: H03ProcessingInquiryQueryDto) {
    return this.inquiryService.h03ProcessingInquiry(query);
  }

  @Get('packaging')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  packagingInquiry(@Query() query: PackagingInquiryQueryDto) {
    return this.inquiryService.packagingInquiry(query);
  }

  @Get('contract-work')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  contractWorkInquiry(@Query() query: ContractWorkInquiryQueryDto) {
    return this.inquiryService.contractWorkInquiry(query);
  }

  @Get('transport')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  transportInquiry(@Query() query: TransportInquiryQueryDto) {
    return this.inquiryService.transportInquiry(query);
  }

  @Get('purchase')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  purchaseInquiry(@Query() query: PurchaseInquiryQueryDto) {
    return this.inquiryService.purchaseInquiry(query);
  }

  @Get('sales')
  @Roles('ADMIN', 'OFFICE', 'FACTORY')
  salesInquiry(@Query() query: SalesInquiryQueryDto) {
    return this.inquiryService.salesInquiry(query);
  }

  @Get('sales-orders-for-cost')
  @Roles('ADMIN', 'OFFICE')
  getSalesOrdersForCost(@Query() query: SalesOrdersForCostQueryDto) {
    return this.inquiryService.getSalesOrdersForCost(query);
  }

  @Get('cost-analysis')
  @Roles('ADMIN', 'OFFICE')
  costAnalysis(@Query() query: CostAnalysisQueryDto) {
    return this.inquiryService.costAnalysis(query);
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MasterDataModule } from './master-data/master-data.module';
import { UploadModule } from './upload/upload.module';
import { ReceivingModule } from './receiving/receiving.module';
import { ProcessingModule } from './processing/processing.module';
import { SalesModule } from './sales/sales.module';
import { ContractWorkModule } from './contract-work/contract-work.module';
import { InventoryModule } from './inventory/inventory.module';
import { PackagingModule } from './packaging/packaging.module';
import { TransportModule } from './transport/transport.module';
import { PurchaseModule } from './purchase/purchase.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { InventoryCostModule } from './inventory-cost/inventory-cost.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { AnomaliesModule } from './anomalies/anomalies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MasterDataModule,
    UploadModule,
    ReceivingModule,
    ProcessingModule,
    SalesModule,
    ContractWorkModule,
    InventoryModule,
    PackagingModule,
    TransportModule,
    PurchaseModule,
    MonitoringModule,
    InventoryCostModule,
    InquiryModule,
    AnomaliesModule,
  ],
})
export class AppModule {}

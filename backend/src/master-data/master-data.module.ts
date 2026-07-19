import { Module } from '@nestjs/common';
import { FarmersModule } from './farmers/farmers.module';
import { EmployeesModule } from './employees/employees.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CarriersModule } from './carriers/carriers.module';
import { CustomersModule } from './customers/customers.module';
import { ReceivingItemsModule } from './receiving-items/receiving-items.module';
import { ProcessingItemsModule } from './processing-items/processing-items.module';
import { PackagingItemsModule } from './packaging-items/packaging-items.module';
import { ProductsModule } from './products/products.module';
import { PurchaseItemsModule } from './purchase-items/purchase-items.module';

@Module({
  imports: [
    FarmersModule,
    EmployeesModule,
    SuppliersModule,
    CarriersModule,
    CustomersModule,
    ReceivingItemsModule,
    ProcessingItemsModule,
    PackagingItemsModule,
    ProductsModule,
    PurchaseItemsModule,
  ],
})
export class MasterDataModule {}

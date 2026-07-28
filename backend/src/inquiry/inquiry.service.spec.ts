import { ConflictException } from '@nestjs/common';
import { InquiryService } from './inquiry.service';

describe('InquiryService costAnalysis', () => {
  function createService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      salesDetail: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1000 } }),
      },
      salesInventoryDetail: {
        findMany: jest.fn().mockResolvedValue([
          {
            quantity: 2,
            costUnitPrice: 99,
            inventoryDetail: { orderId: 'I-SELF', weight: 10 },
          },
          {
            quantity: 3,
            costUnitPrice: 20,
            inventoryDetail: { orderId: 'I-CONTRACT', weight: 5 },
          },
        ]),
      },
      inventoryReceivingOrder: {
        findMany: jest.fn().mockResolvedValue([
          {
            inventoryOrderId: 'I-SELF',
            receivingOrderId: 'S-001',
            receivingOrder: {
              id: 'S-001',
              batches: [
                {
                  details: [{ amount: 900 }],
                  processingDetails: [{ amount: 50 }],
                },
              ],
              processingDetails: [{ amount: 25, outputQty: 80 }],
              packagingOrders: [{ details: [{ amount: 25 }] }],
              inventoryOrderLinks: [
                {
                  inventoryOrder: {
                    isDeleted: false,
                    details: [{ quantity: 10, weight: 10 }],
                    receivingOrders: [{ receivingOrderId: 'S-001' }],
                    contractOrders: [],
                  },
                },
              ],
            },
          },
        ]),
      },
      inventoryContractOrder: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { inventoryOrderId: 'I-CONTRACT', contractOrderId: 'C-001' },
          ]),
      },
      packagingDetail: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 50 } }),
      },
      ...overrides,
    };

    return { prisma, service: new InquiryService(prisma as any) };
  }

  it('separates self-produced and contract costs and calculates gross profit', async () => {
    const { prisma, service } = createService();

    await expect(
      service.costAnalysis({ exportOrderIds: 'O-001' }),
    ).resolves.toEqual({
      exportResult: {
        totalSales: 1000,
        totalRealCost: 200,
        totalContractCost: 300,
        totalPackaging: 50,
        grossProfit: 450,
      },
      domesticResult: null,
      combinedGrossProfit: 450,
    });

    expect(prisma.packagingDetail.aggregate).toHaveBeenCalledWith({
      where: {
        isDeleted: false,
        item: { applicableTo: 'SALES_ORDER' },
        order: { isDeleted: false, salesOrderId: { in: ['O-001'] } },
      },
      _sum: { amount: true },
    });
  });

  it('stops instead of guessing when an inventory order has no cost source', async () => {
    const { service } = createService({
      inventoryReceivingOrder: { findMany: jest.fn().mockResolvedValue([]) },
      inventoryContractOrder: { findMany: jest.fn().mockResolvedValue([]) },
    });

    await expect(
      service.costAnalysis({ exportOrderIds: 'O-001' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

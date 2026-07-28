import { ConflictException } from '@nestjs/common';
import { SalesService } from './sales.service';

describe('SalesService inventory edit guard', () => {
  const detail = {
    id: 158,
    orderId: 'O-20260726-002',
    productId: 'L01',
    weight: 26,
    quantity: 70,
    unitPrice: 58,
  };

  function createService(linkedCount = 1) {
    const prisma = {
      salesOrder: {
        findUnique: jest.fn().mockResolvedValue({
          id: detail.orderId,
          receivingBatches: [],
        }),
        update: jest.fn(),
      },
      salesDetail: {
        findUnique: jest.fn().mockResolvedValue(detail),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...detail, ...data }),
        ),
      },
      salesInventoryDetail: {
        count: jest.fn().mockResolvedValue(linkedCount),
      },
      $transaction: jest.fn(),
    };
    return { prisma, service: new SalesService(prisma as any) };
  }

  it.each([
    [
      'soft delete',
      (service: SalesService) => service.softDeleteOrder(detail.orderId),
    ],
    [
      'hard delete',
      (service: SalesService) => service.hardDeleteOrder(detail.orderId, 1),
    ],
  ])(
    'blocks sales-order %s while the order has linked inventory',
    async (_label, action) => {
      const { prisma, service } = createService();

      await expect(action(service)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.salesInventoryDetail.count).toHaveBeenCalledWith({
        where: { salesOrderId: detail.orderId },
      });
      expect(prisma.salesOrder.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('blocks quantity changes while the product has linked inventory', async () => {
    const { prisma, service } = createService();

    await expect(service.updateDetail(detail.id, { quantity: 50 })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.salesDetail.update).not.toHaveBeenCalled();
  });

  it('allows unit-price-only changes without changing inventory allocation', async () => {
    const { prisma, service } = createService();

    await expect(service.updateDetail(detail.id, { unitPrice: 60 })).resolves.toEqual(
      expect.objectContaining({ unitPrice: 60, amount: 109200 }),
    );
    expect(prisma.salesInventoryDetail.count).not.toHaveBeenCalled();
  });

  it('allows structural changes after all inventory links are removed', async () => {
    const { service } = createService(0);

    await expect(service.updateDetail(detail.id, { quantity: 50 })).resolves.toEqual(
      expect.objectContaining({ quantity: 50, amount: 75400 }),
    );
  });

  it.each([
    ['soft delete', (service: SalesService) => service.softDeleteDetail(detail.id)],
    ['hard delete', (service: SalesService) => service.hardDeleteDetail(detail.id, 1)],
  ])('blocks %s while the product has linked inventory', async (_label, action) => {
    const { service } = createService();
    await expect(action(service)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('SalesService inventory allocation status', () => {
  it.each([
    [0, 'NONE'],
    [365, 'IN_SALES'],
    [604, 'DONE'],
  ])(
    'recomputes %s allocated units as %s in the unlink transaction',
    async (allocatedQuantity, expectedStatus) => {
      const item = {
        id: 49,
        salesOrderId: 'O-20260707-001',
        inventoryDetailId: 33,
        quantity: 365,
      };
      const tx = {
        salesInventoryDetail: {
          delete: jest.fn().mockResolvedValue(item),
          aggregate: jest.fn().mockResolvedValue({
            _sum: { quantity: allocatedQuantity },
          }),
        },
        inventoryDetail: {
          findUnique: jest.fn().mockResolvedValue({ id: 33, quantity: 604 }),
          update: jest.fn().mockResolvedValue({}),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      const prisma = {
        salesInventoryDetail: {
          findUnique: jest.fn().mockResolvedValue(item),
        },
        $transaction: jest.fn().mockImplementation((operation) => operation(tx)),
      };
      const service = new SalesService(prisma as any);

      await expect(service.removeSalesInventoryDetail(49, 1, '127.0.0.1')).resolves.toEqual({
        success: true,
      });
      expect(tx.inventoryDetail.update).toHaveBeenCalledWith({
        where: { id: 33 },
        data: { salesStatus: expectedStatus },
      });
    },
  );
});

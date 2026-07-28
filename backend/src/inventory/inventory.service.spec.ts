import { InventoryService } from './inventory.service';
import { ConflictException } from '@nestjs/common';

describe('InventoryService available inventory', () => {
  function createService(details: any[]) {
    const prisma = {
      inventoryDetail: {
        findMany: jest.fn().mockResolvedValue(details),
      },
    };

    return {
      prisma,
      service: new InventoryService(prisma as any),
    };
  }

  const detail = {
    id: 33,
    orderId: 'I-20260707-001',
    productId: 'L03',
    quantity: 604,
    salesStatus: 'DONE',
    product: {
      name: 'Domestic product',
      imageUrl: null,
      productType: 'DOMESTIC',
      unitWeight: 1,
    },
    order: {
      orderDate: new Date('2026-07-07T00:00:00.000Z'),
      contractOrders: [],
    },
  };

  it('derives NONE from allocations and ignores a stale stored DONE status', async () => {
    const { prisma, service } = createService([
      { ...detail, salesDetails: [] },
    ]);

    await expect(service.findAvailableInventoryDetails('DOMESTIC')).resolves.toEqual([
      expect.objectContaining({
        id: 33,
        soldQty: 0,
        availableQty: 604,
        salesStatus: 'NONE',
      }),
    ]);
    expect(prisma.inventoryDetail.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isDeleted: false,
          product: { productType: 'DOMESTIC' },
        },
      }),
    );
  });

  it('derives IN_SALES for a partial allocation', async () => {
    const { service } = createService([
      { ...detail, salesDetails: [{ quantity: 365 }] },
    ]);

    await expect(service.findAvailableInventoryDetails()).resolves.toEqual([
      expect.objectContaining({
        soldQty: 365,
        availableQty: 239,
        salesStatus: 'IN_SALES',
      }),
    ]);
  });

  it('does not offer fully allocated inventory for another sale', async () => {
    const { service } = createService([
      { ...detail, salesDetails: [{ quantity: 604 }] },
    ]);

    await expect(service.findAvailableInventoryDetails()).resolves.toEqual([]);
  });
});

describe('InventoryService sales-link guards', () => {
  const detail = {
    id: 63,
    orderId: 'I-20260714-003',
    productId: 'L01',
    quantity: 20,
    weight: 26,
    unitPrice: 45.59,
  };

  function createService(linkedCount = 1) {
    const tx = {
      salesInventoryDetail: { deleteMany: jest.fn() },
      inventoryReceivingOrder: { deleteMany: jest.fn() },
      inventoryContractOrder: { deleteMany: jest.fn() },
      inventoryDetail: {
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      inventoryOrder: { delete: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      salesInventoryDetail: {
        count: jest.fn().mockResolvedValue(linkedCount),
      },
      inventoryDetail: {
        findUnique: jest.fn().mockResolvedValue(detail),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...detail, ...data }),
        ),
      },
      inventoryOrder: {
        findUnique: jest.fn().mockResolvedValue({
          id: detail.orderId,
          details: [detail],
          receivingOrders: [],
        }),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((operation) => operation(tx)),
    };

    return { prisma, service: new InventoryService(prisma as any), tx };
  }

  it.each([
    ['update', (service: InventoryService) => service.updateDetail(detail.id, { quantity: 21 })],
    ['soft delete', (service: InventoryService) => service.softDeleteDetail(detail.id)],
    ['hard delete', (service: InventoryService) => service.hardDeleteDetail(detail.id, 1)],
  ])('blocks inventory-detail %s while it has sales links', async (_label, action) => {
    const { prisma, service } = createService();

    await expect(action(service)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.inventoryDetail.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['soft delete', (service: InventoryService) => service.softDeleteOrder(detail.orderId)],
    ['hard delete', (service: InventoryService) => service.hardDeleteOrder(detail.orderId, 1)],
  ])('blocks inventory-order %s while a detail has sales links', async (_label, action) => {
    const { prisma, service } = createService();

    await expect(action(service)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.inventoryOrder.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows an unlinked detail to be corrected', async () => {
    const { service } = createService(0);

    await expect(service.updateDetail(detail.id, { quantity: 21 })).resolves.toEqual(
      expect.objectContaining({ quantity: 21 }),
    );
  });

  it('hard-deletes an unlinked order without deleting sales-allocation evidence', async () => {
    const { service, tx } = createService(0);

    await expect(service.hardDeleteOrder(detail.orderId, 1)).resolves.toEqual({
      success: true,
      deletedId: detail.orderId,
    });
    expect(tx.salesInventoryDetail.deleteMany).not.toHaveBeenCalled();
    expect(tx.inventoryOrder.delete).toHaveBeenCalledWith({
      where: { id: detail.orderId },
    });
  });
});

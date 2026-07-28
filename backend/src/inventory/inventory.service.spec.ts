import { InventoryService } from './inventory.service';

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

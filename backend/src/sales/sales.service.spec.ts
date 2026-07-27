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
      salesDetail: {
        findUnique: jest.fn().mockResolvedValue(detail),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...detail, ...data }),
        ),
      },
      salesInventoryDetail: {
        count: jest.fn().mockResolvedValue(linkedCount),
      },
    };
    return { prisma, service: new SalesService(prisma as any) };
  }

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

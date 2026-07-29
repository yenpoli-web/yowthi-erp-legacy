import { Prisma } from '@prisma/client';
import {
  allocateProcessingWageGroup,
  calculateExactProcessingWage,
} from './processing-wage.calculator';

describe('processing wage calculator', () => {
  it('keeps the exact line wage without flooring', () => {
    expect(calculateExactProcessingWage('12.345', '9.25').toString()).toBe(
      '114.19125',
    );
  });

  it('floors once after summing the same wage group', () => {
    const allocations = allocateProcessingWageGroup([
      { id: 1, outputQty: '12.5', wageRate: '9' },
      { id: 2, outputQty: '10.5', wageRate: '9' },
    ]);

    expect(
      [...allocations.values()].reduce((sum, amount) => sum + amount, 0),
    ).toBe(207);
    expect(allocations.get(1)).toBe(112);
    expect(allocations.get(2)).toBe(95);
  });

  it('uses each line rate before applying the final floor', () => {
    const allocations = allocateProcessingWageGroup([
      { id: 10, outputQty: '10.125', wageRate: '9.25' },
      { id: 11, outputQty: '4.875', wageRate: '8.75' },
    ]);
    const exactTotal = new Prisma.Decimal('10.125')
      .mul('9.25')
      .add(new Prisma.Decimal('4.875').mul('8.75'));

    expect(
      [...allocations.values()].reduce((sum, amount) => sum + amount, 0),
    ).toBe(exactTotal.floor().toNumber());
  });

  it('reverses exact versioned wages before flooring the remaining group', () => {
    const allocations = allocateProcessingWageGroup([
      { id: 20, outputQty: '12.5', wageRate: '9' },
      { id: 21, outputQty: '10.5', wageRate: '9' },
      { id: 22, outputQty: '-12.5', wageRate: '9' },
    ]);

    expect(
      [...allocations.values()].reduce((sum, amount) => sum + amount, 0),
    ).toBe(94);
  });
});

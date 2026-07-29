import { Prisma } from '@prisma/client';

export const PROCESSING_WAGE_CALCULATION_VERSION = 2;

export interface ProcessingWageLine {
  id: number;
  outputQty: Prisma.Decimal | number | string;
  wageRate: Prisma.Decimal | number | string;
}

function decimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value.toString());
}

export function calculateExactProcessingWage(
  outputQty: Prisma.Decimal | number | string,
  wageRate: Prisma.Decimal | number | string,
): Prisma.Decimal {
  return decimal(outputQty).mul(decimal(wageRate));
}

export function allocateProcessingWageGroup(
  lines: ProcessingWageLine[],
): Map<number, number> {
  const allocations = new Map<number, number>();
  let cumulativeExact = new Prisma.Decimal(0);
  let cumulativePayable = 0;

  for (const line of [...lines].sort((a, b) => a.id - b.id)) {
    cumulativeExact = cumulativeExact.add(
      calculateExactProcessingWage(line.outputQty, line.wageRate),
    );
    const nextCumulativePayable = cumulativeExact.floor().toNumber();
    allocations.set(line.id, nextCumulativePayable - cumulativePayable);
    cumulativePayable = nextCumulativePayable;
  }

  return allocations;
}

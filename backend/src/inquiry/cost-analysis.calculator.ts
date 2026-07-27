export interface ReceivingTrueUnitCostInput {
  receivingAmount: number;
  h01Wage: number;
  h02Wage: number;
  k01k02Wage: number;
  h02CompletedKg: number;
}

/** 金額與單位成本一律採小數 2 位四捨五入。 */
export function roundCost(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateReceivingTrueUnitCost(
  input: ReceivingTrueUnitCostInput,
): number {
  if (input.h02CompletedKg <= 0) {
    throw new Error('H02完成公斤數必須大於0');
  }

  return roundCost(
    (input.receivingAmount + input.h01Wage + input.h02Wage + input.k01k02Wage) /
      input.h02CompletedKg,
  );
}

export function calculateAllocatedCost(
  quantity: number,
  weightKg: number,
  unitCost: number,
): number {
  return roundCost(quantity * weightKg * unitCost);
}

export function addCosts(total: number, amount: number): number {
  return roundCost(total + amount);
}

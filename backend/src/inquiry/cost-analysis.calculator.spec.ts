import {
  addCosts,
  calculateAllocatedCost,
  calculateReceivingTrueUnitCost,
  roundCost,
} from './cost-analysis.calculator';

describe('cost analysis calculator', () => {
  it('calculates each receiving order true unit cost with K01/K02 and rounds to 2 decimals', () => {
    expect(
      calculateReceivingTrueUnitCost({
        receivingAmount: 4120,
        h01Wage: 1258,
        h02Wage: 266,
        k01k02Wage: 320,
        h02CompletedKg: 134.4,
      }),
    ).toBe(44.38);
  });

  it('keeps receiving orders separate even when callers later sum their allocated costs', () => {
    const sourceA = calculateReceivingTrueUnitCost({
      receivingAmount: 900,
      h01Wage: 50,
      h02Wage: 25,
      k01k02Wage: 25,
      h02CompletedKg: 100,
    });
    const sourceB = calculateReceivingTrueUnitCost({
      receivingAmount: 1800,
      h01Wage: 100,
      h02Wage: 50,
      k01k02Wage: 50,
      h02CompletedKg: 80,
    });

    expect(sourceA).toBe(10);
    expect(sourceB).toBe(25);
    expect(
      addCosts(
        calculateAllocatedCost(2, 10, sourceA),
        calculateAllocatedCost(1, 10, sourceB),
      ),
    ).toBe(450);
  });

  it('allocates both self-produced and contract costs by actual sold quantity and weight', () => {
    expect(calculateAllocatedCost(10, 12, 45.25)).toBe(5430);
    expect(calculateAllocatedCost(3, 12.5, 53.33)).toBe(1999.88);
  });

  it('uses standard 2-decimal rounding', () => {
    expect(roundCost(45.255)).toBe(45.26);
    expect(roundCost(45.254)).toBe(45.25);
  });

  it('rejects a receiving source without H02 completed kilograms', () => {
    expect(() =>
      calculateReceivingTrueUnitCost({
        receivingAmount: 100,
        h01Wage: 10,
        h02Wage: 10,
        k01k02Wage: 10,
        h02CompletedKg: 0,
      }),
    ).toThrow('H02完成公斤數必須大於0');
  });
});

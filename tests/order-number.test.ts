import { describe, expect, it } from 'vitest';
import { generateOrderNumber } from '../lib/order-number';

describe('generateOrderNumber', () => {
  it('matches the RPM-YYYY-XXXXX format', () => {
    const year = new Date().getFullYear();
    expect(generateOrderNumber()).toMatch(new RegExp(`^RPM-${year}-[A-Z0-9]{5}$`));
  });

  it('generates different values on repeated calls', () => {
    const values = new Set(Array.from({ length: 20 }, () => generateOrderNumber()));
    expect(values.size).toBeGreaterThan(1);
  });
});

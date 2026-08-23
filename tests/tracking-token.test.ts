import { beforeAll, describe, expect, it } from 'vitest';
import { createTrackingToken, verifyTrackingToken } from '../lib/tracking-token';

beforeAll(() => {
  process.env.ORDER_TRACK_SECRET = 'test-secret';
});

describe('tracking token', () => {
  it('round-trips the order id through sign and verify', () => {
    const token = createTrackingToken('order-123');
    expect(verifyTrackingToken(token)).toEqual({ orderId: 'order-123' });
  });

  it('rejects a tampered token', () => {
    const token = createTrackingToken('order-123');
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(verifyTrackingToken(tampered)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(verifyTrackingToken('not-a-token')).toBeNull();
  });
});

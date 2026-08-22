import crypto from 'node:crypto';

export function createTrackingToken(orderId: string): string {
  const secret = process.env.ORDER_TRACK_SECRET;
  if (!secret) throw new Error('Falta configurar ORDER_TRACK_SECRET.');
  const payload = Buffer.from(JSON.stringify({ o: orderId, t: Date.now() }), 'utf8').toString(
    'base64url'
  );
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyTrackingToken(token: string): { orderId: string } | null {
  const secret = process.env.ORDER_TRACK_SECRET;
  if (!secret || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.o || !data?.t) return null;
    if (Date.now() - Number(data.t) > 1000 * 60 * 60 * 24 * 365 * 2) return null;
    return { orderId: data.o };
  } catch {
    return null;
  }
}

const crypto = require('crypto');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function verifyToken(token) {
  const secret = process.env.ORDER_TRACK_SECRET;
  if (!secret || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.p || !data?.t) return null;
    if (Date.now() - Number(data.t) > 1000 * 60 * 60 * 24 * 365 * 2) return null;
    return data;
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  const token = req.query?.token;
  const verified = verifyToken(token);
  if (!verified) return json(res, 400, { error: 'Enlace de seguimiento no válido o caducado.' });
  if (!process.env.MOLLIE_API_KEY) return json(res, 500, { error: 'Falta configurar MOLLIE_API_KEY en Vercel.' });

  try {
    const r = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(verified.p)}`, {
      headers: { Authorization: `Bearer ${process.env.MOLLIE_API_KEY}` }
    });
    const p = await r.json();
    if (!r.ok) return json(res, 404, { error: 'No se encontró el pedido.' });

    const metadata = p.metadata || {};
    return json(res, 200, {
      orderId: metadata.orderId || p.id,
      paymentId: p.id,
      status: p.status,
      createdAt: p.createdAt || null,
      paidAt: p.paidAt || null,
      amount: p.amount || null,
      method: p.method || null,
      customerName: metadata.customer?.name || '',
      items: Array.isArray(metadata.items) ? metadata.items : []
    });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Error interno.' });
  }
};

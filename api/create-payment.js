const fs = require('fs');
const path = require('path');

function getStore() {
  const file = path.join(process.cwd(), 'data', 'store.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  if (!process.env.MOLLIE_API_KEY) return json(res, 500, { error: 'Falta configurar MOLLIE_API_KEY en Vercel.' });

  try {
    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const items = Array.isArray(body.items) ? body.items : [];
    const customer = body.customer || {};
    if (!items.length) return json(res, 400, { error: 'La cesta está vacía.' });
    if (!customer.name || !customer.email || !customer.address || !customer.city || !customer.postalCode) {
      return json(res, 400, { error: 'Completa todos los datos de envío.' });
    }

    const store = getStore();
    const catalog = new Map((store.products || []).filter(p => p.active !== false).map(p => [String(p.id), p]));
    const normalized = [];
    let totalCents = 0;

    for (const line of items) {
      const product = catalog.get(String(line.id));
      const qty = Math.max(1, Math.min(99, Number.parseInt(line.qty, 10) || 0));
      if (!product || qty < 1) return json(res, 400, { error: 'Uno de los productos ya no está disponible.' });
      if (Number.isFinite(product.stock) && product.stock >= 0 && qty > product.stock) {
        return json(res, 400, { error: `No hay stock suficiente de ${product.name}.` });
      }
      const unit = Math.round(Number(product.price) * 100);
      if (!Number.isFinite(unit) || unit < 1) return json(res, 400, { error: `Precio inválido para ${product.name}.` });
      totalCents += unit * qty;
      normalized.push({ id: product.id, name: product.name, qty, unitPrice: (unit / 100).toFixed(2), image: product.images?.[0] || '' });
    }

    if (totalCents < 50) return json(res, 400, { error: 'El importe mínimo de pago es 0,50 €.' });

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const orderId = `RPM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const amount = (totalCents / 100).toFixed(2);

    const paymentResponse = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: { currency: store.currency || 'EUR', value: amount },
        description: `RPM Fest · Pedido ${orderId}`,
        redirectUrl: `${origin}/tienda?payment=success&order=${encodeURIComponent(orderId)}`,
        webhookUrl: `${origin}/api/mollie-webhook`,
        metadata: { orderId, customer, items: normalized }
      })
    });

    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) return json(res, 502, { error: payment?.detail || 'No se pudo crear el pago.' });

    return json(res, 200, {
      orderId,
      checkoutUrl: payment?._links?.checkout?.href,
      paymentId: payment.id
    });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Error interno.' });
  }
};

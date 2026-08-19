const REPO = process.env.GITHUB_REPO || 'LethalKrisixTools/rpmfest';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function githubRequest(pathname, options = {}) {
  if (!process.env.GITHUB_TOKEN) throw new Error('Falta configurar GITHUB_TOKEN en Vercel.');
  return fetch(`https://api.github.com/repos/${REPO}/contents/${pathname}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

function encodeBase64(text) {
  return Buffer.from(text, 'utf8').toString('base64');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = body.startsWith('{') ? JSON.parse(body) : Object.fromEntries(new URLSearchParams(body));
    }
    const paymentId = body?.id;
    if (!paymentId) return json(res, 400, { error: 'Missing payment id' });
    if (!process.env.MOLLIE_API_KEY) throw new Error('Falta MOLLIE_API_KEY.');

    const paymentResponse = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${process.env.MOLLIE_API_KEY}` }
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) throw new Error(payment?.detail || 'No se pudo consultar el pago.');

    if (payment.status !== 'paid') return json(res, 200, { ok: true, status: payment.status });

    const metadata = payment.metadata || {};
    if (!metadata.orderId) return json(res, 200, { ok: true, ignored: true });

    const orderResponse = await githubRequest('data/orders.json');
    if (!orderResponse.ok) throw new Error(`GitHub orders read failed: ${orderResponse.status}`);
    const orderFile = await orderResponse.json();
    const orders = JSON.parse(Buffer.from(orderFile.content.replace(/\n/g, ''), 'base64').toString('utf8'));

    if ((orders.orders || []).some(o => o.paymentId === payment.id)) {
      return json(res, 200, { ok: true, duplicate: true });
    }

    const order = {
      id: metadata.orderId,
      paymentId: payment.id,
      status: payment.status,
      createdAt: payment.createdAt || new Date().toISOString(),
      paidAt: new Date().toISOString(),
      amount: payment.amount,
      method: payment.method || 'unknown',
      customer: metadata.customer || {},
      items: metadata.items || []
    };
    orders.orders = [order, ...(orders.orders || [])];

    const saveResponse = await githubRequest('data/orders.json', {
      method: 'PUT',
      body: JSON.stringify({
        message: `feat: registrar pedido ${metadata.orderId}`,
        content: encodeBase64(JSON.stringify(orders, null, 2) + '\n'),
        sha: orderFile.sha,
        branch: BRANCH
      })
    });
    if (!saveResponse.ok) throw new Error(`GitHub orders write failed: ${saveResponse.status}`);

    // Reduce finite stock after a confirmed payment.
    try {
      const storeResponse = await githubRequest('data/store.json');
      if (storeResponse.ok) {
        const storeFile = await storeResponse.json();
        const store = JSON.parse(Buffer.from(storeFile.content.replace(/\n/g, ''), 'base64').toString('utf8'));
        for (const item of order.items) {
          const product = (store.products || []).find(p => String(p.id) === String(item.id));
          if (product && Number.isFinite(product.stock) && product.stock >= 0) {
            product.stock = Math.max(0, product.stock - Number(item.qty || 0));
          }
        }
        await githubRequest('data/store.json', {
          method: 'PUT',
          body: JSON.stringify({
            message: `feat: actualizar stock pedido ${metadata.orderId}`,
            content: encodeBase64(JSON.stringify(store, null, 2) + '\n'),
            sha: storeFile.sha,
            branch: BRANCH
          })
        });
      }
    } catch (stockError) {
      console.error('Stock update failed:', stockError);
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || 'Webhook error' });
  }
};

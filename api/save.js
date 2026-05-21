export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN no configurado en Vercel' });
  }

  const payload = req.body;
  const baseUrl = 'https://api.github.com/repos/LethalKrisixTools/rpmfest/contents/data/data.json';
  const auth = { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github.v3+json' } };

  try {
    let sha;
    const getRes = await fetch(baseUrl, auth);
    if (getRes.ok) sha = (await getRes.json()).sha;

    const jsonStr = JSON.stringify(payload, null, 2);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const content = btoa(binary);

    const body = { message: 'feat: actualizar datos evento desde panel admin', content, branch: 'main' };
    if (sha) body.sha = sha;

    const putRes = await fetch(baseUrl, {
      method: 'PUT',
      headers: { ...auth.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return res.status(putRes.status).json({ error: err.message || 'Error ' + putRes.status });
    }

    const result = await putRes.json();
    return res.status(200).json({ success: true, sha: result.content.sha });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

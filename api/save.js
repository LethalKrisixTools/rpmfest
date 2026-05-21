export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN no configurado en Vercel' });
  }

  const GITHUB_OWNER = 'LethalKrisixTools';
  const GITHUB_REPO = 'rpmfest';
  const GITHUB_PATH = 'data/data.json';
  const GITHUB_BRANCH = 'main';

  const payload = req.body;

  try {
    const baseUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json'
    };

    let sha;
    const getRes = await fetch(baseUrl, { headers });
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const jsonStr = JSON.stringify(payload, null, 2);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonStr);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const content = btoa(binary);

    const body = {
      message: 'feat: actualizar datos evento desde panel admin',
      content,
      branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(baseUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return res.status(putRes.status).json({
        error: err.message || `GitHub API error: ${putRes.status}`
      });
    }

    const result = await putRes.json();
    return res.status(200).json({
      success: true,
      sha: result.content.sha
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

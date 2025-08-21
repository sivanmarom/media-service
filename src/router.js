import { URL } from 'url';

export default async function router(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // GET /health
  if (req.method === 'GET' && url.pathname === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, data: { status: 'ok' } }));
    return;
  }

 
  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }));
}
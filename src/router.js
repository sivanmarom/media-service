import { URL } from 'url';

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export default async function router(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health
  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { ok: true, data: { status: 'ok' } });
  }

  // Media: list
  if (req.method === 'GET' && url.pathname === '/media') {
    return send(res, 200, { ok: true, data: { items: [], note: 'list stub' } });
  }

  // Media: presign
  if (req.method === 'POST' && url.pathname === '/media/presign') {
    return send(res, 201, { ok: true, data: { url: '<stub>', key: '<stub>' } });
  }

  // Media: head (metadata)
  if (req.method === 'GET' && url.pathname.startsWith('/media/head/')) {
    const key = decodeURIComponent(url.pathname.replace('/media/head/', ''));
    return send(res, 200, { ok: true, data: { key, metadata: {}, note: 'head stub' } });
  }

  // Media: get (download)
  if (req.method === 'GET' && url.pathname.startsWith('/media/')) {
    const key = decodeURIComponent(url.pathname.replace('/media/', ''));
    return send(res, 200, { ok: true, data: { key, note: 'get stub' } });
  }

  // Media: delete
  if (req.method === 'DELETE' && url.pathname.startsWith('/media/')) {
    const key = decodeURIComponent(url.pathname.replace('/media/', ''));
    return send(res, 200, { ok: true, data: { deleted: true, key, note: 'delete stub' } });
  }

  return send(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
}
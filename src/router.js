export default async function router(_req, res) {
  res.statusCode = 501;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'Router stub' } }));
}
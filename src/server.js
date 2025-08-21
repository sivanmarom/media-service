import http from 'http';
import router from './router.js';

const PORT = Number(process.env.PORT || 3000);

const server = http.createServer(async (req, res) => {
  try {
    await router(req, res);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: 'Internal server error' } }));
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
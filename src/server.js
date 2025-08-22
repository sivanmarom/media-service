import http from 'http';
import router from './router.js';

// Take port from env (deployment), default to 3000 for local dev
const PORT = Number(process.env.PORT || 3000);

// Create basic HTTP server 
// Routes are handled separately in router.js
const server = http.createServer(async (req, res) => {
  try {
    await router(req, res);
  } catch (e) {
    // log unexpected server errors
    console.error(JSON.stringify({
      action: 'SERVER_ERROR',
      error: e.message,
      stack: e.stack,
      time: new Date().toISOString()
    }));

    // always respond in json, even for errors
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: 'Internal server error' } }));
  }
});

// start listening on the chosen port
server.listen(PORT, () => {
  console.log(JSON.stringify({
    action: 'SERVER_START',
    port: PORT,
    status: 'listening',
    time: new Date().toISOString()
  }));
});
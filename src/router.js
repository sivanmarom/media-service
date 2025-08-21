import { URL } from 'url';
import {
  health, listMedia, createPresigned, headMedia, getMedia, deleteMedia
} from './controllers/media.controller.js';

export default async function router(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') return health(req, res);
  if (req.method === 'GET' && url.pathname === '/media') return listMedia(req, res, url);
  if (req.method === 'POST' && url.pathname === '/media/presign') return createPresigned(req, res);
  if (req.method === 'GET' && url.pathname.startsWith('/media/head/')) {
    const key = decodeURIComponent(url.pathname.replace('/media/head/', ''));
    return headMedia(req, res, url, key);
  }
  if (req.method === 'GET' && url.pathname.startsWith('/media/')) {
    const key = decodeURIComponent(url.pathname.replace('/media/', ''));
    return getMedia(req, res, url, key);
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/media/')) {
    const key = decodeURIComponent(url.pathname.replace('/media/', ''));
    return deleteMedia(req, res, url, key);
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }));
}
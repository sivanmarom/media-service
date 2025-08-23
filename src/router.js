import { URL } from 'url';
import {
  health, listMedia, createPresigned, headMedia, getMedia, deleteMedia, putMedia
} from './controllers/media.controller.js';

export default async function router(req, res) {
  // Turn raw url into a URL object (need base so we use Host)
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Log every request
  console.log(JSON.stringify({
    action: 'REQUEST',
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    time: new Date().toISOString()
  }));

  // NEW: flags to detect if path exists and if method is allowed
  let matchedPath = false;
  let methodAllowed = false;

  // /health
  if (url.pathname === '/health') {
    matchedPath = true;
    if (req.method === 'GET') {
      methodAllowed = true;
      return health(req, res);
    }
  }

  // /media (list)
  if (url.pathname === '/media') {
    matchedPath = true;
    if (req.method === 'GET') {
      methodAllowed = true;
      return listMedia(req, res, url);
    }
  }

  // /media/presign (create/update via presigned)
  if (url.pathname === '/media/presign') {
    matchedPath = true;
    if (req.method === 'POST') {
      methodAllowed = true;
      return createPresigned(req, res);
    }
  }

  // /media/head/:key (metadata only)
  if (url.pathname.startsWith('/media/head/')) {
    matchedPath = true;
    if (req.method === 'GET') {
      methodAllowed = true;
      const key = decodeURIComponent(url.pathname.replace('/media/head/', ''));
      return headMedia(req, res, url, key);
    }
  }

  // /media/:key (download / delete / put)
  if (url.pathname.startsWith('/media/')) {
    matchedPath = true;
    const key = decodeURIComponent(url.pathname.replace('/media/', ''));

    if (req.method === 'GET') {
      methodAllowed = true;
      return getMedia(req, res, url, key);
    }
    if (req.method === 'DELETE') {
      methodAllowed = true;
      return deleteMedia(req, res, url, key);
    }
    if (req.method === 'PUT') {
      methodAllowed = true;
      return putMedia(req, res, url, key);
    }
  }

  // NEW: If path exists but method not supported → 405
  if (matchedPath && !methodAllowed) {
    console.warn(JSON.stringify({
      action: 'ROUTER',
      method: req.method,
      path: url.pathname,
      status: 'method_not_allowed',
      time: new Date().toISOString()
    }));
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
    }));
  }

  // NEW: Path not found → 404
  console.warn(JSON.stringify({
    action: 'ROUTER',
    method: req.method,
    path: url.pathname,
    status: 'not_found',
    time: new Date().toISOString()
  }));
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' }
  }));
}
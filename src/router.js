import { URL } from 'url';
import {
  health, listMedia, createPresigned, headMedia, getMedia, deleteMedia, putMedia
} from './controllers/media.controller.js';

export default async function router(req, res) {
  // Turn the request URL into an object
  const url = new URL(req.url, `http://${req.headers.host}`);

  // log every incoming request
  console.log(JSON.stringify({
    action: 'REQUEST',
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    time: new Date().toISOString()
  }));

  // Health check
  if (req.method === 'GET' && url.pathname === '/health') {
    return health(req, res);
  }

  // List files in S3
  if (req.method === 'GET' && url.pathname === '/media') {
    return listMedia(req, res, url);
  }

  // ask server for a presign URL (used to upload/update directly to S3)
  if (req.method === 'POST' && url.pathname === '/media/presign') {
    return createPresigned(req, res);
  }

  // get only metadata of a file
  if (req.method === 'GET' && url.pathname.startsWith('/media/head/')) {
    const key = decodeURIComponent(url.pathname.replace('/media/head/', ''));
    return headMedia(req, res, url, key);
  }

  // download a file 
  if (req.method === 'GET' && url.pathname.startsWith('/media/')) {
    const key = decodeURIComponent(url.pathname.replace('/media/', ''));
    return getMedia(req, res, url, key);
  }

  // delete a file
  if (req.method === 'DELETE' && url.pathname.startsWith('/media/')) {
    const key = decodeURIComponent(url.pathname.replace('/media/', ''));
    return deleteMedia(req, res, url, key);
  }

  // update (direct PUT via server for small files )
  if (req.method === 'PUT' && url.pathname.startsWith('/media/')) {
    const key = decodeURIComponent(url.pathname.replace('/media/', ''));
    return putMedia(req, res, url, key);
  }

  //  method/path not supported
  console.warn(JSON.stringify({
    action: 'ROUTER',
    method: req.method,
    path: url.pathname,
    status: 'method_not_allowed',
    time: new Date().toISOString()
  }));

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    ok: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
  }));
}
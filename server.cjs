const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { createClient } = require('@supabase/supabase-js');

const root = __dirname;
const port = Number(process.env.PORT) || 3000;

const SUPABASE_URL = 'https://thjanybdqvoeakbwofqy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

function safePath(reqUrl) {
  const pathname = decodeURIComponent(url.parse(reqUrl).pathname || '/');
  const rel = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.normalize(path.join(root, rel));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

async function handleAdminApi(req, res) {
  const pathname = url.parse(req.url).pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  try {
    // DELETE /api/admin/tickets/:id
    if (pathname.startsWith('/api/admin/tickets/') && method === 'DELETE') {
      const id = pathname.split('/').pop();
      const { error } = await adminClient.from('ticket').delete().eq('id', id);
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    // DELETE /api/admin/funciones/:id
    if (pathname.startsWith('/api/admin/funciones/') && method === 'DELETE') {
      const id = pathname.split('/').pop();
      const { error } = await adminClient.from('funcion').delete().eq('id', id);
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    // DELETE /api/admin/peliculas/:id
    if (pathname.startsWith('/api/admin/peliculas/') && method === 'DELETE') {
      const id = pathname.split('/').pop();
      const { error } = await adminClient.from('pelicula').delete().eq('id', id);
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    // DELETE /api/admin/salas/:id
    if (pathname.startsWith('/api/admin/salas/') && method === 'DELETE') {
      const id = pathname.split('/').pop();
      const { error } = await adminClient.from('sala').delete().eq('id', id);
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    // POST /api/admin/peliculas
    if (pathname === '/api/admin/peliculas' && method === 'POST') {
      const body = await parseBody(req);
      const { error } = await adminClient.from('pelicula').insert(body);
      if (error) throw error;
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    // PUT /api/admin/peliculas/:id
    if (pathname.startsWith('/api/admin/peliculas/') && method === 'PUT') {
      const id = pathname.split('/').pop();
      const body = await parseBody(req);
      const { error } = await adminClient.from('pelicula').update(body).eq('id', id);
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    // POST /api/admin/funciones
    if (pathname === '/api/admin/funciones' && method === 'POST') {
      const body = await parseBody(req);
      const { error } = await adminClient.from('funcion').insert(body);
      if (error) throw error;
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    // POST /api/admin/salas
    if (pathname === '/api/admin/salas' && method === 'POST') {
      const body = await parseBody(req);
      const { error } = await adminClient.from('sala').insert(body);
      if (error) throw error;
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    // PUT /api/admin/salas/:id
    if (pathname.startsWith('/api/admin/salas/') && method === 'PUT') {
      const id = pathname.split('/').pop();
      const body = await parseBody(req);
      const { error } = await adminClient.from('sala').update(body).eq('id', id);
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  // Handle admin API first
  if (await handleAdminApi(req, res)) return;

  const filePath = safePath(req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    let target = filePath;
    if (!err && stat.isDirectory()) target = path.join(filePath, 'index.html');
    fs.readFile(target, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`CINEASTRA server: http://localhost:${port}`);
  console.log(`Admin API ready at http://localhost:${port}/api/admin/`);
});
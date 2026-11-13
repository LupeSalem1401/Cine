const http = require('http');
const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');

const root = __dirname;
const port = Number(process.env.PORT) || 3000;

const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) return;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = value;
  });
}

const SUPABASE_URL = 'https://thjanybdqvoeakbwofqy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const adminClient = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

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

function getPathname(reqUrl) {
  try {
    return new URL(reqUrl, 'http://localhost').pathname;
  } catch (e) {
    return '/';
  }
}

function safePath(reqUrl) {
  const pathname = decodeURIComponent(getPathname(reqUrl) || '/');
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
  const pathname = getPathname(req.url);
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

  if (pathname === '/api/admin/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, enabled: !!adminClient }));
    return true;
  }

  if (!pathname.startsWith('/api/admin/')) return false;

  if (!adminClient) {
    res.writeHead(501, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Falta SUPABASE_SERVICE_KEY. Inicia el servidor con esa variable de entorno o ejecuta las políticas RLS de eliminación (ver README).'
    }));
    return true;
  }

  async function deleteTicketsBy(column, value) {
    const { error } = await adminClient.from('ticket').delete().eq(column, value);
    if (error) throw error;
  }

  async function deleteFuncionesBy(column, value) {
    const { data, error } = await adminClient.from('funcion').select('id').eq(column, value);
    if (error) throw error;
    const ids = (data || []).map(f => f.id);
    for (const id of ids) {
      await deleteTicketsBy('funcion_id', id);
    }
    if (ids.length) {
      const del = await adminClient.from('funcion').delete().in('id', ids);
      if (del.error) throw del.error;
    }
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
      await deleteTicketsBy('funcion_id', id);
      const { error } = await adminClient.from('funcion').delete().eq('id', id);
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    // DELETE /api/admin/peliculas/:id
    if (pathname.startsWith('/api/admin/peliculas/') && method === 'DELETE') {
      const id = pathname.split('/').pop();
      await deleteFuncionesBy('pelicula_id', id);
      const { error } = await adminClient.from('pelicula').delete().eq('id', id);
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return true;
    }

    // DELETE /api/admin/salas/:id
    if (pathname.startsWith('/api/admin/salas/') && method === 'DELETE') {
      const id = pathname.split('/').pop();
      await deleteFuncionesBy('sala_id', id);
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
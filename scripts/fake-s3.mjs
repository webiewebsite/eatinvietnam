// Minimal S3-compatible server for CI (stands in for Cloudflare R2): path-style
// PUT/GET/HEAD/DELETE object and POST ?delete (DeleteObjects). Signatures are not checked.
// Objects are public at http://127.0.0.1:<port>/<bucket>/<key>, like an R2 public bucket.
// Usage: node scripts/fake-s3.mjs [port]
import { createServer } from 'node:http';

const port = Number(process.argv[2] ?? 9000);
const objects = new Map(); // "bucket/key" → { body, type }

const read = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

/** aws-chunked bodies ("<hex>;chunk-signature=…\r\n<data>\r\n…0\r\n<trailers>") → raw bytes. */
function unchunk(buf) {
  const out = [];
  let i = 0;
  while (i < buf.length) {
    const eol = buf.indexOf('\r\n', i);
    if (eol < 0) break;
    const size = parseInt(buf.subarray(i, eol).toString().split(';')[0], 16);
    if (!size) break;
    out.push(buf.subarray(eol + 2, eol + 2 + size));
    i = eol + 2 + size + 2;
  }
  return Buffer.concat(out);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const path = decodeURIComponent(url.pathname.slice(1));
    if (req.method === 'PUT') {
      let body = await read(req);
      if ((req.headers['content-encoding'] ?? '').includes('aws-chunked')) body = unchunk(body);
      if (path.includes('/')) objects.set(path, { body, type: req.headers['content-type'] ?? 'application/octet-stream' });
      res.writeHead(200, { ETag: '"ci"' }).end();
      return;
    }
    if (req.method === 'POST' && url.searchParams.has('delete')) {
      const xml = (await read(req)).toString();
      for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) objects.delete(`${path}/${m[1]}`);
      res.writeHead(200, { 'content-type': 'application/xml' }).end('<?xml version="1.0" encoding="UTF-8"?><DeleteResult></DeleteResult>');
      return;
    }
    if (req.method === 'DELETE') {
      objects.delete(path);
      res.writeHead(204).end();
      return;
    }
    const o = objects.get(path);
    if (!o) {
      res.writeHead(404, { 'content-type': 'application/xml' }).end('<Error><Code>NoSuchKey</Code></Error>');
      return;
    }
    res.writeHead(200, { 'content-type': o.type, 'content-length': o.body.length });
    res.end(req.method === 'HEAD' ? undefined : o.body);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
}).listen(port, '127.0.0.1', () => console.warn(`fake-s3 on :${port}`));

// Local fault fixture. Proxies the production preview, but fails GLB requests.
// Run after npm start, then open http://localhost:3002/ to inspect fallback.
import { createServer, get } from 'node:http';
createServer((req, res) => {
  if (req.url?.split('?')[0].endsWith('.glb')) {
    res.writeHead(503, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store',
    });
    res.end('Deliberate local model-load failure');
    return;
  }
  const upstream = get(
    { hostname: '127.0.0.1', port: 3001, path: req.url },
    (response) => {
      res.writeHead(response.statusCode || 502, {
        ...response.headers,
        'Cache-Control': 'no-store',
      });
      response.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502);
    res.end('Start the production preview on port 3001 first.');
  });
}).listen(3002, '127.0.0.1', () =>
  console.log('Local model failure fixture: http://localhost:3002/'),
);

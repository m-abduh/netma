const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.FE_PORT || 3000;
const ROOT = path.resolve(__dirname, '..', 'client', 'out');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

http.createServer((req, res) => {
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(ROOT, '404.html'), (err2, data2) => {
        res.writeHead(err2 ? 404 : 404, { 'Content-Type': 'text/html' });
        res.end(err2 ? '404 Not Found' : data2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
});

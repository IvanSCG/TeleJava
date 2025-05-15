// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer  = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// -----------------------
// Express (subida de archivos)
// -----------------------
const app = express();
app.use(cors());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename:    (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });

  const filename = req.file.originalname;
  const id       = req.file.filename;
  const url      = `${req.protocol}://${req.get('host')}/downloads/${id}`;
  res.json({ filename, url });
});
app.use('/downloads', express.static(UPLOAD_DIR));

// -----------------------
// HTTP + WebSocket juntos
// -----------------------
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server }); // ← importante

// Guardar clientes conectados
const clients = new Set();

wss.on('connection', function connection(ws) {
  clients.add(ws);

  ws.on('message', function incoming(data) {
    // reenvía a todos menos al emisor (broadcast)
    for (const client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`HTTP + WebSocket escuchando en ${PORT}`);
});

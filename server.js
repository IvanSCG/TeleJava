// server.js
// ───────────────────────────────────────────────────────────
// 1)  CHAT TCP  – retransmite mensajes a todos los clientes
const net     = require('net');
const clients = [];

const CHAT_PORT = process.env.CHAT_PORT || 12345;

net.createServer(socket => {
  clients.push(socket);

  socket.on('data', data => {
    // reenvía a todos menos al emisor
    clients.forEach(c => { if (c !== socket) c.write(data); });
  });

  socket.on('end', () => {
    const i = clients.indexOf(socket);
    if (i !== -1) clients.splice(i, 1);
  });
}).listen(CHAT_PORT, () =>
  console.log(`Chat TCP escuchando en ${CHAT_PORT}`)
);

// ───────────────────────────────────────────────────────────
// 2)  HTTP/REST  – subida y descarga de ficheros
const path    = require('path');
const fs      = require('fs');
const express = require('express');
const multer  = require('multer');
const cors    = require('cors');

const HTTP_PORT  = process.env.HTTP_PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// crea la carpeta si no existe
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer: genera nombre único conservando la extensión
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename:    (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const app = express();
app.use(cors());                           // permite CORS al cliente Java

// POST /upload  – recibe 1 fichero y responde { filename, url }
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });

  const filename = req.file.originalname;
  const id       = req.file.filename;     // nombre real en disco
  const url      = `${req.protocol}://${req.hostname}:${HTTP_PORT}/downloads/${id}`;

  res.json({ filename, url });
});

// GET /downloads/:id  – sirve el fichero
app.use('/downloads', express.static(UPLOAD_DIR));

app.listen(HTTP_PORT, () =>
  console.log(`HTTP de ficheros escuchando en ${HTTP_PORT}`)
);

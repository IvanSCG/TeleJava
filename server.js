// server.js
// ──────────────────────────────────────────────────────────────────────────────
// 1)  CHAT TCP – inalterado
const net     = require('net');
const clients = [];

const CHAT_PORT = process.env.CHAT_PORT || 12345;

net.createServer(socket => {
  clients.push(socket);

  socket.on('data', data => {
    // broadcast al resto
    clients.forEach(c => { if (c !== socket) c.write(data); });
  });

  socket.on('end', () => {
    const i = clients.indexOf(socket);
    if (i !== -1) clients.splice(i, 1);
  });
}).listen(CHAT_PORT, () =>
  console.log(`Chat TCP escuchando en ${CHAT_PORT}`)
);

// ──────────────────────────────────────────────────────────────────────────────
// 2)  HTTP/REST  –  ficheros
const path    = require('path');
const fs      = require('fs');
const express = require('express');
const multer  = require('multer');
const cors    = require('cors');

const HTTP_PORT = process.env.HTTP_PORT || 12345;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// crear carpeta si no existe
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// configuración de Multer (nombre único conservando la extensión original)
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename   : (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const app = express();
app.use(cors());                               // para que el cliente Java pueda hacer la petición

// ---- POST /upload -----------------------------------------------------------
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });

  const fileName = req.file.originalname;
  const id       = req.file.filename;          // nombre real en disco
  const url      = `${req.protocol}://${req.hostname}:${HTTP_PORT}/downloads/${id}`;

  res.json({ filename: fileName, url });
});

// ---- GET /downloads/:id  ----------------------------------------------------
app.use('/downloads', express.static(UPLOAD_DIR));

app.listen(HTTP_PORT, () =>
  console.log(`HTTP de ficheros escuchando en ${HTTP_PORT}`)
);

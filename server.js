/*──────────────────────────────────────────────────────────
   TeleJava – Servidor combinado  (chat TCP + HTTP ficheros)
────────────────────────────────────────────────────────────*/
"use strict";

/*──────────── deps ────────────*/
const net     = require("net");
const express = require("express");
const multer  = require("multer");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");

/*──────── puertos ─────────────*/
const CHAT_PORT = process.env.CHAT_PORT || 23456;   // ←-socket crudo
const HTTP_PORT = process.env.PORT      || 3000;    // ←-subidas/descargas

if (CHAT_PORT === HTTP_PORT) {
  console.error(`❌  CHAT_PORT y HTTP_PORT no pueden ser iguales (${CHAT_PORT}).`);
  process.exit(1);
}

/*──────── carpeta de subidas ──*/
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/*================================================================
= 1) CHAT POR SOCKETS TCP                                        =
================================================================*/
const clients = [];

net.createServer(sock => {
  sock.setEncoding("utf8");
  clients.push(sock);

  sock.on("data", chunk => {
    chunk.split(/\r?\n/).forEach(msg => {
      if (!msg.trim()) return;
      clients.forEach(c => { if (c !== sock) c.write(msg + "\n"); });
    });
  });

  sock.on("end", () => {
    clients.splice(clients.indexOf(sock), 1);
  });

  sock.on("error", () => sock.destroy());
})
.listen(CHAT_PORT, () =>
  console.log(`✔️  Chat TCP escuchando en  ${CHAT_PORT}`)
);

/*================================================================
= 2) API HTTP: /upload  +  /downloads/:id                         =
================================================================*/
const storage = multer.diskStorage({
  destination: (_r, _f, cb) => cb(null, UPLOAD_DIR),
  filename: (_r, file, cb) => {
    const id = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, id + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const app = express();
app.use(cors());

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file" });
  const url = `${req.protocol}://${req.get("host")}/downloads/${req.file.filename}`;
  res.json({ filename: req.file.originalname, url });
});

app.use("/downloads", express.static(UPLOAD_DIR));

/* — healthcheck opcional — */
app.get("/", (_req, res) => res.send("TeleJava server online"));

app.listen(HTTP_PORT, () =>
  console.log(`✔️  HTTP-fileserver escuchando en ${HTTP_PORT}`)
);

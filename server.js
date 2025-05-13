/*───────────────────────────────────────────────────────────────
  TeleJava – servidor combinado
  1) Chat en crudo por sockets TCP      (JSON 1 línea = 1 mensaje)
  2) API HTTP para subir y descargar ficheros (Express + Multer)
─────────────────────────────────────────────────────────────────*/
"use strict";

/*──────── dependencias ────────*/
const net     = require("net");
const express = require("express");
const multer  = require("multer");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");

/*──────── configuración global ────────*/
const CHAT_PORT   = process.env.CHAT_PORT || 123456;  // ⇦ puerto TCP
const HTTP_PORT   = process.env.PORT      || 3000;   // ⇦ puerto HTTP
const UPLOAD_DIR  = path.join(__dirname, "uploads"); // ⇦ carpeta subidas
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/*================================================================
= 1)  SERVIDOR DE CHAT (TCP plano)                               =
================================================================*/
const clients = [];

const chatServer = net.createServer(socket => {
  socket.setEncoding("utf8");
  clients.push(socket);

  socket.on("data", data => {
    // puede venir más de un mensaje junto; partimos por saltos de línea
    data.split(/\r?\n/).forEach(chunk => {
      if (!chunk.trim()) return;
      // reenvía al resto
      clients.forEach(c => { if (c !== socket) c.write(chunk + "\n"); });
    });
  });

  socket.on("end", () => {
    clients.splice(clients.indexOf(socket), 1);
  });

  socket.on("error", () => socket.destroy());
});

chatServer.listen(CHAT_PORT, () =>
  console.log(`✔️  Chat TCP escuchando en puerto ${CHAT_PORT}`)
);

/*================================================================
= 2)  SERVIDOR HTTP (Express)                                    =
================================================================*/
// almacenamiento de ficheros con nombre único
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const id = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, id + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const app = express();
app.use(cors());                       // permite petición desde el cliente Java

/*----------  POST /upload  ----------*/
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file received" });

  const url = `${req.protocol}://${req.get("host")}/downloads/${req.file.filename}`;
  res.json({ filename: req.file.originalname, url });
});

/*----------  GET /downloads/:id  ----------*/
app.use("/downloads", express.static(UPLOAD_DIR));

/*----------  opcional: healthcheck  ----------*/
app.get("/", (_req, res) => res.send("TeleJava server online"));

app.listen(HTTP_PORT, () =>
  console.log(`✔️  HTTP-fileserver escuchando en puerto ${HTTP_PORT}`)
);

/*───────────────────────────
  Notas de uso
  ─────────────
  • Local:
      CHAT_PORT=59090      (por ejemplo)
      PORT=3000            node server.js
    El ChatClient ya conecta al TCP y hace POST a http://host:3000/upload

  • Railway / Render:
      – La plataforma inyecta PORT ⇒ subidas/descargas OK.
      – Pon un  CHAT_PORT distinto en variables de entorno (p.e. 23456)
        y usa ese valor al crear el ChatClient en Login.
───────────────────────────*/

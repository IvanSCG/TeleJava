const net = require('net');

const PORT = process.env.PORT || 12345;
const clients = {};          // username → socket
const sockets = [];          // todos los sockets abiertos

// ---------- helpers --------------------------------------------------------

function statusMessage(user, online) {
  return JSON.stringify({
    type  : 'STATUS',
    user  : user,
    status: online ? 'ONLINE' : 'OFFLINE'
  }) + '\n';
}

// Notifica a todos (o a todos menos uno) el cambio de presencia
function broadcastStatus(user, online, exceptSocket = null) {
  const msg = statusMessage(user, online);
  sockets.forEach(sock => {
    if (sock !== exceptSocket) {
      try { sock.write(msg); } catch { /*silencio*/ }
    }
  });
}

// ---------- servidor -------------------------------------------------------

net.createServer(socket => {
  let username = null;
  sockets.push(socket);

  socket.on('data', data => {
    // ⚠️ pueden venir varios mensajes en el mismo paquete TCP
    data.toString()
        .split('\n')
        .filter(line => line.trim())
        .forEach(line => {
          try {
            const msg = JSON.parse(line);

            // --------- keep-alive ping/pong -----------------
            if (msg.type === 'ping') {
              socket.write('{"type":"pong"}\n');
              return;
            }

            // --------- registro de usuario ------------------
            if (msg.type === 'register' && msg.username) {
              username = msg.username;
              clients[username] = socket;

              console.log('[SERVER] Registrado:', username);
              console.log('[SERVER] Conectados:', Object.keys(clients));

              // 1⃣   Envía al NUEVO la lista de quién está online
              Object.keys(clients).forEach(u => {
                socket.write(statusMessage(u, true));
              });

              // 2⃣   Informa a los DEMÁS de que este usuario está online
              broadcastStatus(username, true, socket);
              return;
            }

            // --------- broadcast de cualquier otro mensaje ---
            sockets.forEach(s => {
              if (s !== socket) s.write(line + '\n');
            });

          } catch {
            /* ignorar mensajes mal formados */
          }
        });
  });

  // ---------- desconexión (normal o error) ----------------
  function handleDisconnect() {
    const idx = sockets.indexOf(socket);
    if (idx !== -1) sockets.splice(idx, 1);

    if (username && clients[username] === socket) {
      delete clients[username];
      broadcastStatus(username, false);   // avisa OFFLINE
    }
  }

  socket.on('end'  , handleDisconnect);
  socket.on('error', handleDisconnect);

}).listen(PORT, () => console.log(`Chat TCP escuchando en ${PORT}`));

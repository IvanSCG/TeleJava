// SOLO EL CHAT TCP - NADA DE EXPRESS
const net = require('net');
const clients = [];
const PORT = process.env.PORT || 12345; // Railway asignará PORT automáticamente

net.createServer(socket => {
  clients.push(socket);
  socket.on('data', data => {
      try {
      const msg = JSON.parse(data);
      if (msg.type && msg.type === 'register') {
        // no reenviamos los registros
        return;
      }
    } catch (_) {
      // no es JSON, seguimos adelante
    }
    // retransmite a todos menos al emisor
    clients.forEach(c => { if (c !== socket) c.write(data); });  
  });
  socket.on('end', () => {
    const i = clients.indexOf(socket);
    if (i !== -1) clients.splice(i, 1);
  });
}).listen(PORT, () => console.log(`Chat TCP escuchando en ${PORT}`));

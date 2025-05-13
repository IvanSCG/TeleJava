// server.js
const net = require('net');
const clients = [];
//cange
const server = net.createServer(socket => {
  clients.push(socket);

  socket.on('data', data => {
    // Broadcast a todos los demás
    clients.forEach(c => {
      if (c !== socket) c.write(data);
    });
  });

  socket.on('end', () => {
    const i = clients.indexOf(socket);
    if (i !== -1) clients.splice(i, 1);
  });
});

server.listen(process.env.PORT || 12345);

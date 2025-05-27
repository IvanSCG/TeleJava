const net = require('net');
const clients = {};   // username: socket
const sockets = [];   // lista para broadcast
const PORT = process.env.PORT || 12345;

// Función para avisar de presencia a TODOS
function broadcastPresence(user, online, exceptSocket=null) {
    const presenceMsg = JSON.stringify({
        type: "presence",
        user: user,
        online: online
    });
    sockets.forEach(sock => {
        if (sock !== exceptSocket) {   // exceptSocket se usa para enviar SOLO a otros, opcional
            try { sock.write(presenceMsg + '\n'); } catch (e) {}
        }
    });
}

net.createServer(socket => {
    let username = null;
    sockets.push(socket);

    socket.on('data', data => {
        try {
            // Puede venir más de un mensaje junto
            const messages = data.toString().split('\n').filter(line => line.trim());
            messages.forEach(line => {
                const msg = JSON.parse(line);

                if (msg.type === "ping") {
                    socket.write(JSON.stringify({type: "pong"}) + "\n");
                    return;
                }

                if (msg.type === "register" && msg.username) {
                    username = msg.username;
                    clients[username] = socket;
                    // DEBUG: ¿Cuántos clientes hay y quiénes son?
    console.log("[SERVER] Usuario registrado:", username);
    console.log("[SERVER] Usuarios conectados ahora:", Object.keys(clients));
                    // 🔥 NUEVO: Al usuario que acaba de entrar, envíale la presencia de los ya conectados
                    Object.keys(clients).forEach(user => {
                        if (user !== username) {
                            console.log(`[SERVER] Enviando presence de ${user} a ${username}`);
                            // Solo le envío al nuevo usuario, no a todos
                            socket.write(JSON.stringify({
                                type: "presence",
                                user: user,
                                online: true
                            }) + '\n');
                        }
                    });

                    // Ahora, como antes, notificamos a los demás que este usuario está online
                    broadcastPresence(username, true, socket); // Ya le has enviado antes, no repetir

                    return;
                }

                // Broadcast solo a otros (como antes)
                sockets.forEach(c => { if (c !== socket) c.write(line + '\n'); });
            });
        } catch (e) { /* ignorar parsing errors */ }
    });

    socket.on('end', () => {
        // Borrar del listado sockets y del objeto clients
        const i = sockets.indexOf(socket);
        if (i !== -1) sockets.splice(i, 1);
        if (username && clients[username] === socket) {
            delete clients[username];
            broadcastPresence(username, false);
        }
    });

    socket.on('error', () => {
        // Manejar el cierre por error igual que 'end'
        socket.emit('end');
    });

}).listen(PORT, () => console.log(`Chat TCP escuchando en ${PORT}`));

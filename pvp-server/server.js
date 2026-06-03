const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const rooms = new Map();

io.on('connection', (socket) => {
    console.log('✅ Игрок подключился:', socket.id);

    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        socket.join(roomId);
        rooms.set(roomId, { players: [socket.id] });
        socket.emit('roomCreated', roomId);
        console.log(`📦 Комната создана: ${roomId}`);
    });

    socket.on('joinRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.players.length < 2) {
            room.players.push(socket.id);
            socket.join(roomId);
            io.to(roomId).emit('gameStart');
            console.log(`🎮 Игрок подключился к комнате ${roomId}`);
        } else {
            socket.emit('error', '❌ Комната не найдена');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PvP сервер запущен на порту ${PORT}`);
});

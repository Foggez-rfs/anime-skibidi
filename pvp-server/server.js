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
        console.log(`🔍 Попытка подключения к ${roomId}`);
        const room = rooms.get(roomId);
        
        if (!room) {
            socket.emit('error', 'Комната не найдена');
            return;
        }
        
        if (room.players.length >= 2) {
            socket.emit('error', 'Комната заполнена');
            return;
        }
        
        room.players.push(socket.id);
        socket.join(roomId);
        
        console.log(`✅ Игрок подключился, теперь игроков: ${room.players.length}`);
        
        // 👇 Если в комнате 2 игрока — отправляем gameStart ВСЕМ
        if (room.players.length === 2) {
            io.to(roomId).emit('gameStart');
            console.log(`🎮 Игра началась в комнате ${roomId}`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PvP сервер запущен на порту ${PORT}`);
});

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Хранилище комнат
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('✅ Игрок подключился:', socket.id);

    // СОЗДАНИЕ КОМНАТЫ
    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        socket.join(roomId);
        rooms.set(roomId, {
            players: [socket.id],
            createdAt: Date.now()
        });
        socket.emit('roomCreated', roomId);
        console.log(`📦 Комната создана: ${roomId}, игроков: ${rooms.get(roomId).players.length}`);
    });

    // ПРИСОЕДИНЕНИЕ К КОМНАТЕ
    socket.on('joinRoom', (roomId) => {
        console.log(`🔍 Попытка подключения к комнате: ${roomId}`);
        const room = rooms.get(roomId);
        
        if (!room) {
            console.log(`❌ Комната ${roomId} не найдена`);
            socket.emit('error', 'Комната не найдена');
            return;
        }
        
        if (room.players.length >= 2) {
            console.log(`❌ Комната ${roomId} заполнена`);
            socket.emit('error', 'Комната заполнена');
            return;
        }
        
        socket.join(roomId);
        room.players.push(socket.id);
        console.log(`✅ Игрок ${socket.id} подключился к комнате ${roomId}, теперь игроков: ${room.players.length}`);
        
        // Уведомляем всех в комнате, что можно начинать бой
        io.to(roomId).emit('gameStart', { players: room.players });
    });

    // ОТПРАВКА ХОДА В БОЮ
    socket.on('move', (roomId, data) => {
        socket.to(roomId).emit('opponentMove', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PvP сервер запущен на порту ${PORT}`);
    console.log(`📊 Активных комнат: ${rooms.size}`);
});

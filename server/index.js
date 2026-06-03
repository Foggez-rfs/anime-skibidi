const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(path.join(__dirname, '../client')));

// ========== ДАННЫЕ ПЕРСОНАЖЕЙ ==========
const charactersData = {
  anime: [
    { id: 'zoro', name: 'Зоро', rarity: 'starter', hp: 2600, damage: 300, hits: 3, side: 'anime' },
    { id: 'naruto', name: 'Наруто', rarity: 'common', hp: 3000, damage: 550, hits: 1, side: 'anime' },
    { id: 'sasuke', name: 'Саске', rarity: 'common', hp: 3000, damage: 550, hits: 1, side: 'anime' },
    { id: 'levi', name: 'Леви', rarity: 'rare', hp: 7500, damage: 1350, hits: 1, side: 'anime' },
    { id: 'tanjiro', name: 'Танджиро', rarity: 'rare', hp: 10000, damage: 1800, hits: 1, side: 'anime' },
    { id: 'gojo', name: 'Годжо', rarity: 'epic', hp: 12000, damage: 2150, hits: 1, side: 'anime' },
    { id: 'goku', name: 'Гоку', rarity: 'legendary', hp: 18000, damage: 3200, hits: 1, side: 'anime' },
    { id: 'saitama', name: 'Сайтама', rarity: 'mythical', hp: 27000, damage: 4800, hits: 1, side: 'anime' },
    { id: 'ui_goku', name: 'УИ Гоку', rarity: 'secret', hp: 35000, damage: 6300, hits: 1, side: 'anime' },
    { id: 'zeno', name: 'Дзено', rarity: 'ultra', hp: 50000, damage: 9000, hits: 1, side: 'anime' },
    { id: 'aizen', name: 'Айзен', rarity: 'admin', hp: 100000, damage: 18000, hits: 1, side: 'anime' }
  ],
  skibidi: [
    { id: 'camera_men', name: 'Камера Мен', rarity: 'starter', hp: 2600, damage: 450, hits: 1, side: 'skibidi' },
    { id: 'big_camera', name: 'Большой Камера Мен', rarity: 'common', hp: 3000, damage: 550, hits: 1, side: 'skibidi' },
    { id: 'skibidi_toilet', name: 'Скибиди Туалет', rarity: 'common', hp: 3000, damage: 550, hits: 1, side: 'skibidi' },
    { id: 'speaker_men', name: 'Спикер Мен', rarity: 'rare', hp: 7500, damage: 1350, hits: 1, side: 'skibidi' },
    { id: 'tv_men', name: 'ТВ Мен', rarity: 'epic', hp: 12000, damage: 2150, hits: 1, side: 'skibidi' },
    { id: 'tv_women', name: 'ТВ Вумен', rarity: 'epic', hp: 10000, damage: 8000, hits: 1, side: 'skibidi' },
    { id: 'speaker_executor', name: 'Спикер Исполнитель', rarity: 'mythical', hp: 27000, damage: 4800, hits: 1, side: 'skibidi' },
    { id: 'titan_siren', name: 'Титан Сирена', rarity: 'ultra', hp: 50000, damage: 9000, hits: 1, side: 'skibidi' }
  ]
};

const caseRates = { starter: 40, common: 30, rare: 15, epic: 8, legendary: 4, mythical: 2, secret: 0.8, ultra: 0.2 };

const rooms = {};
const inventories = {};

function getRandomCharacter(side) {
  const list = charactersData[side];
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const char of list) {
    cumulative += caseRates[char.rarity] || 1;
    if (rand <= cumulative) return { ...char, hp: char.hp, maxHp: char.hp, damage: char.damage, medkits: 3 };
  }
  return { ...list[0], hp: list[0].hp, maxHp: list[0].hp, damage: list[0].damage, medkits: 3 };
}

function createBot() {
  return {
    id: 'bot_' + Math.random(),
    name: 'Бот',
    hp: 2600,
    maxHp: 2600,
    damage: 450,
    hits: 1,
    medkits: 3,
    side: 'skibidi',
    isBot: true
  };
}

io.on('connection', (socket) => {
  console.log('Игрок подключился:', socket.id);
  
  if (!inventories[socket.id]) {
    inventories[socket.id] = {
      coins: 1000,
      gems: 50,
      characters: ['zoro', 'camera_men'],
      upgrades: {}
    };
  }
  
  socket.on('getInventory', () => {
    socket.emit('inventoryUpdate', inventories[socket.id]);
  });
  
  socket.on('buyCase', (side, priceType) => {
    const inv = inventories[socket.id];
    const cost = priceType === 'coins' ? 500 : 50;
    if ((priceType === 'coins' && inv.coins >= cost) || (priceType === 'gems' && inv.gems >= cost)) {
      if (priceType === 'coins') inv.coins -= cost;
      else inv.gems -= cost;
      const character = getRandomCharacter(side);
      inv.characters.push(character.id);
      socket.emit('caseResult', { character, coins: inv.coins, gems: inv.gems });
      socket.emit('inventoryUpdate', inv);
    } else {
      socket.emit('error', 'Недостаточно средств!');
    }
  });
  
  socket.on('upgradeChar', (charId) => {
    const inv = inventories[socket.id];
    if (inv.coins >= 500) {
      inv.coins -= 500;
      if (!inv.upgrades[charId]) inv.upgrades[charId] = 0;
      inv.upgrades[charId]++;
      socket.emit('upgradeResult', { charId, level: inv.upgrades[charId], coins: inv.coins });
      socket.emit('inventoryUpdate', inv);
    } else {
      socket.emit('error', 'Недостаточно монет!');
    }
  });
  
  // КРАФТ: запрос на получение списка персонажей для выбора
  socket.on('craftRequest', (type) => {
    const inv = inventories[socket.id];
    const characters = inv.characters.map(id => {
      let found = null;
      for (const side of ['anime', 'skibidi']) {
        found = charactersData[side].find(c => c.id === id);
        if (found) break;
      }
      return found;
    }).filter(c => c);
    socket.emit('craftCharactersList', { type, characters });
  });
  
  // КРАФТ: выбор 3 персонажей
  socket.on('craftExecute', (type, selectedIds) => {
    const inv = inventories[socket.id];
    const cost = type === 'golden' ? 250 : 700;
    
    if (inv.coins < cost) {
      socket.emit('craftResult', { success: false, message: '❌ Недостаточно монет!' });
      return;
    }
    
    // Проверяем, что у игрока есть все 3 выбранных персонажа
    const hasAll = selectedIds.every(id => inv.characters.includes(id));
    if (!hasAll) {
      socket.emit('craftResult', { success: false, message: '❌ У вас нет этих персонажей!' });
      return;
    }
    
    // Удаляем 3 персонажа
    for (const id of selectedIds) {
      const index = inv.characters.indexOf(id);
      if (index !== -1) inv.characters.splice(index, 1);
    }
    
    // Создаём нового персонажа
    inv.coins -= cost;
    let newChar = null;
    
    if (type === 'golden') {
      // Берём первого из удалённых как основу
      const baseChar = charactersData.anime.find(c => c.id === selectedIds[0]) || charactersData.skibidi.find(c => c.id === selectedIds[0]);
      if (baseChar) {
        const goldenId = `golden_${baseChar.id}`;
        inv.characters.push(goldenId);
        newChar = { ...baseChar, id: goldenId, name: `✨ ${baseChar.name} ✨`, rarity: 'golden', hp: Math.floor(baseChar.hp * 1.25), damage: Math.floor(baseChar.damage * 1.25) };
        socket.emit('craftResult', { success: true, message: `⭐ УСПЕШНО! Вы получили ЗОЛОТОГО персонажа: ${newChar.name}!`, newChar });
      }
    } else if (type === 'diamond') {
      const baseChar = charactersData.anime.find(c => c.id === selectedIds[0]) || charactersData.skibidi.find(c => c.id === selectedIds[0]);
      if (baseChar) {
        const diamondId = `diamond_${baseChar.id}`;
        inv.characters.push(diamondId);
        newChar = { ...baseChar, id: diamondId, name: `💎 ${baseChar.name} 💎`, rarity: 'diamond', hp: Math.floor(baseChar.hp * 1.5), damage: Math.floor(baseChar.damage * 1.5) };
        socket.emit('craftResult', { success: true, message: `💎 УСПЕШНО! Вы получили АЛМАЗНОГО персонажа: ${newChar.name}!`, newChar });
      }
    }
    
    socket.emit('inventoryUpdate', inv);
  });
  
  // ВЫБОР ПЕРСОНАЖА ДЛЯ БОЯ
  socket.on('selectCharacter', (charId) => {
    const inv = inventories[socket.id];
    if (inv.characters.includes(charId)) {
      inventories[socket.id].selectedCharacter = charId;
      socket.emit('characterSelected', { success: true, charId });
    } else {
      socket.emit('characterSelected', { success: false, message: 'У вас нет этого персонажа!' });
    }
  });
  
  socket.on('playWithBot', () => {
    const roomId = 'bot_' + socket.id;
    const inv = inventories[socket.id];
    const selectedCharId = inv.selectedCharacter || inv.characters[0];
    
    let playerChar = null;
    for (const side of ['anime', 'skibidi']) {
      playerChar = charactersData[side].find(c => c.id === selectedCharId);
      if (playerChar) break;
    }
    
    if (!playerChar) playerChar = charactersData.anime[0];
    
    const upgradeLevel = inv.upgrades[playerChar.id] || 0;
    const bonus = 1 + upgradeLevel * 0.15;
    
    const player = {
      id: socket.id,
      name: playerChar.name,
      hp: Math.floor(playerChar.hp * bonus),
      maxHp: Math.floor(playerChar.hp * bonus),
      damage: Math.floor(playerChar.damage * bonus),
      hits: playerChar.hits || 1,
      medkits: 3,
      side: playerChar.side,
      isBot: false
    };
    
    const bot = createBot();
    
    rooms[roomId] = {
      players: [socket.id, bot.id],
      gameState: { players: [player, bot] },
      currentTurn: socket.id,
      isBot: true,
      botId: bot.id
    };
    
    socket.join(roomId);
    socket.emit('gameStart', rooms[roomId].gameState);
    socket.emit('turnUpdate', socket.id);
  });
  
  socket.on('attack', (roomId) => {
    const room = rooms[roomId];
    if (!room || room.currentTurn !== socket.id) return;
    
    const state = room.gameState;
    const attacker = state.players.find(p => p.id === socket.id);
    const target = state.players.find(p => p.id !== socket.id);
    
    const damage = attacker.damage * (attacker.hits || 1);
    target.hp = Math.max(0, target.hp - damage);
    
    if (target.hp <= 0) {
      const inv = inventories[socket.id];
      inv.coins += 100;
      socket.emit('inventoryUpdate', inv);
      socket.emit('gameOver', `${attacker.name} победил! +100 монет`);
      delete rooms[roomId];
      return;
    }
    
    room.currentTurn = target.id;
    socket.emit('stateUpdate', state);
    socket.emit('turnUpdate', target.id);
    
    if (room.isBot && target.id === room.botId) {
      setTimeout(() => {
        const bot = state.players.find(p => p.id === room.botId);
        const player = state.players.find(p => p.id === socket.id);
        if (bot && player && bot.hp > 0 && player.hp > 0 && rooms[roomId]) {
          const botDamage = bot.damage * (bot.hits || 1);
          player.hp = Math.max(0, player.hp - botDamage);
          
          if (player.hp <= 0) {
            socket.emit('gameOver', `${bot.name} победил!`);
            delete rooms[roomId];
            return;
          }
          
          room.currentTurn = socket.id;
          socket.emit('stateUpdate', state);
          socket.emit('turnUpdate', socket.id);
        }
      }, 1000);
    }
  });
  
  socket.on('useMedkit', (roomId) => {
    const room = rooms[roomId];
    if (!room || room.currentTurn !== socket.id) return;
    
    const state = room.gameState;
    const player = state.players.find(p => p.id === socket.id);
    
    if (player.medkits > 0) {
      const heal = Math.floor(player.maxHp * 0.2);
      player.hp = Math.min(player.maxHp, player.hp + heal);
      player.medkits--;
      
      room.currentTurn = state.players.find(p => p.id !== socket.id).id;
      socket.emit('stateUpdate', state);
      socket.emit('turnUpdate', room.currentTurn);
      
      if (room.isBot && room.currentTurn === room.botId) {
        setTimeout(() => {
          const bot = state.players.find(p => p.id === room.botId);
          const playerTarget = state.players.find(p => p.id === socket.id);
          if (bot && playerTarget && bot.hp > 0 && playerTarget.hp > 0 && rooms[roomId]) {
            const botDamage = bot.damage * (bot.hits || 1);
            playerTarget.hp = Math.max(0, playerTarget.hp - botDamage);
            
            if (playerTarget.hp <= 0) {
              socket.emit('gameOver', `${bot.name} победил!`);
              delete rooms[roomId];
              return;
            }
            
            room.currentTurn = socket.id;
            socket.emit('stateUpdate', state);
            socket.emit('turnUpdate', socket.id);
          }
        }, 1000);
      }
    }
  });
  
  socket.on('disconnect', () => {
    for (let roomId in rooms) {
      if (rooms[roomId].players.includes(socket.id)) delete rooms[roomId];
    }
  });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});

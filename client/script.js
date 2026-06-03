const socket = io();

// ========== ДАННЫЕ ПЕРСОНАЖЕЙ (заглушка) ==========
const charactersData = {
    anime: [
        { id: 'zoro', name: 'Зоро', rarity: 'starter', hp: 2600, damage: 450, side: 'anime', hits: 3 },
        { id: 'naruto', name: 'Наруто', rarity: 'common', hp: 3000, damage: 550, side: 'anime', hits: 1 },
        { id: 'gojo', name: 'Годжо', rarity: 'epic', hp: 12000, damage: 2150, side: 'anime', hits: 1 }
    ],
    skibidi: [
        { id: 'camera_men', name: 'Камера Мен', rarity: 'starter', hp: 2600, damage: 450, side: 'skibidi', hits: 1 },
        { id: 'big_camera', name: 'Большой Камера Мен', rarity: 'common', hp: 3000, damage: 550, side: 'skibidi', hits: 1 },
        { id: 'speaker_men', name: 'Спикер Мен', rarity: 'rare', hp: 7500, damage: 1350, side: 'skibidi', hits: 1 }
    ]
};

// Инвентарь игрока
let inventory = {
    coins: 1000,
    gems: 50,
    characters: ['zoro', 'camera_men'],
    upgrades: {},
    rank: { league: 'bronze', division: 5, points: 0 }
};

let currentRoomId = null;
let gameState = null;
let isMyTurn = false;

// DOM элементы
const loadingDiv = document.getElementById('loading');
const coinsSpan = document.getElementById('coins');
const gemsSpan = document.getElementById('gems');
const charactersDiv = document.getElementById('characters');
const turnIndicator = document.getElementById('turnIndicator');
const attackBtn = document.getElementById('attackBtn');
const medkitBtn = document.getElementById('medkitBtn');
const fightMessage = document.getElementById('fightMessage');
const inventoryList = document.getElementById('inventoryList');
const upgradeList = document.getElementById('upgradeList');
const caseResult = document.getElementById('caseResult');
const craftResult = document.getElementById('craftResult');
const currentRankSpan = document.getElementById('currentRank');
const rankProgressBar = document.getElementById('rankProgress');
const rankPointsSpan = document.getElementById('rankPoints');

// Вкладки
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    };
});

// Обновление UI
function updateUI() {
    coinsSpan.innerText = inventory.coins;
    gemsSpan.innerText = inventory.gems;
    
    // Ранг
    const leagueNames = { bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', diamond: 'Алмаз', emerald: 'Изумруд', platinum: 'Платина' };
    currentRankSpan.innerText = `${leagueNames[inventory.rank.league]} ${inventory.rank.division}`;
    rankPointsSpan.innerText = `${inventory.rank.points} / 100 очков`;
    rankProgressBar.style.width = `${inventory.rank.points}%`;
    
    // Инвентарь
    if (inventoryList) {
        inventoryList.innerHTML = inventory.characters.map(charId => {
            let char = [...charactersData.anime, ...charactersData.skibidi].find(c => c.id === charId);
            const level = inventory.upgrades[charId] || 0;
            const bonus = 1 + level * 0.15;
            return char ? `<div class="inventory-item"><strong>${char.name}</strong><br>⭐ Редкость: ${char.rarity}<br>🔰 Уровень: +${Math.round((bonus-1)*100)}%</div>` : '';
        }).join('');
    }
    
    // Улучшения
    if (upgradeList) {
        const owned = [...new Set(inventory.characters)];
        upgradeList.innerHTML = owned.map(charId => {
            let char = [...charactersData.anime, ...charactersData.skibidi].find(c => c.id === charId);
            const level = inventory.upgrades[charId] || 0;
            return char ? `<div class="upgrade-item"><strong>${char.name}</strong><br>Уровень: ${level}<br>⬆️ +${level*15}%<br><button onclick="upgradeChar('${charId}')">Улучшить (500🪙)</button></div>` : '';
        }).join('');
    }
}

function upgradeChar(charId) {
    if (inventory.coins >= 500) {
        inventory.coins -= 500;
        if (!inventory.upgrades[charId]) inventory.upgrades[charId] = 0;
        inventory.upgrades[charId]++;
        updateUI();
        fightMessage.innerText = `⬆️ Персонаж улучшен до уровня ${inventory.upgrades[charId]}!`;
        setTimeout(() => fightMessage.innerText = '', 2000);
    } else {
        fightMessage.innerText = '❌ Недостаточно монет!';
        setTimeout(() => fightMessage.innerText = '', 2000);
    }
}

// Кейсы
function openCase(side, priceType) {
    const cost = priceType === 'coins' ? 500 : 50;
    if (priceType === 'coins' && inventory.coins >= cost) {
        inventory.coins -= cost;
        const char = getRandomCharacter(side);
        inventory.characters.push(char.id);
        caseResult.innerHTML = `<div>🎉 Вам выпал: <strong>${char.name}</strong> (${char.rarity})! 🎉</div>`;
        updateUI();
        setTimeout(() => caseResult.innerHTML = '', 3000);
    } else if (priceType === 'gems' && inventory.gems >= cost) {
        inventory.gems -= cost;
        const char = getRandomCharacter(side);
        inventory.characters.push(char.id);
        caseResult.innerHTML = `<div>🎉 Вам выпал: <strong>${char.name}</strong> (${char.rarity})! 🎉</div>`;
        updateUI();
        setTimeout(() => caseResult.innerHTML = '', 3000);
    } else {
        caseResult.innerHTML = '<div>❌ Недостаточно средств!</div>';
        setTimeout(() => caseResult.innerHTML = '', 2000);
    }
}

function getRandomCharacter(side) {
    const list = charactersData[side];
    const rand = Math.random() * 100;
    let cumulative = 0;
    const rates = { starter: 40, common: 30, rare: 15, epic: 8, legendary: 4, mythical: 2, secret: 0.8, ultra: 0.2 };
    for (const char of list) {
        cumulative += rates[char.rarity] || 1;
        if (rand <= cumulative) return char;
    }
    return list[0];
}

// Крафт
function craft(type) {
    if (type === 'golden') {
        if (inventory.coins >= 250) {
            inventory.coins -= 250;
            craftResult.innerHTML = '<div>⭐ Золотая машина: крафт выполнен!</div>';
            updateUI();
            setTimeout(() => craftResult.innerHTML = '', 2000);
        } else {
            craftResult.innerHTML = '<div>❌ Недостаточно монет!</div>';
            setTimeout(() => craftResult.innerHTML = '', 2000);
        }
    } else if (type === 'diamond') {
        if (inventory.coins >= 700) {
            inventory.coins -= 700;
            craftResult.innerHTML = '<div>💎 Алмазная машина: крафт выполнен!</div>';
            updateUI();
            setTimeout(() => craftResult.innerHTML = '', 2000);
        } else {
            craftResult.innerHTML = '<div>❌ Недостаточно монет!</div>';
            setTimeout(() => craftResult.innerHTML = '', 2000);
        }
    }
}

// Бой
function updateBattleUI() {
    if (!gameState) return;
    let html = '';
    gameState.players.forEach(player => {
        const hpPercent = (player.hp / player.maxHp) * 100;
        const isMe = player.id === socket.id;
        html += `
            <div class="character-card">
                <div class="character-name">${player.name} ${isMe ? '(ВЫ)' : '(Противник)'}</div>
                <div class="hp-bar">
                    <div class="hp-fill" style="width: ${hpPercent}%">${player.hp}/${player.maxHp}</div>
                </div>
                <div>⚔️ Урон: ${player.damage}</div>
                <div>💊 Аптечки: ${player.medkits}/3</div>
            </div>
        `;
    });
    charactersDiv.innerHTML = html;
}

// ========== СОКЕТЫ ==========
socket.on('connect', () => {
    console.log('Подключено к серверу');
    loadingDiv.classList.add('hide');
});

socket.on('gameStart', (state) => {
    gameState = state;
    isMyTurn = true;
    updateBattleUI();
    turnIndicator.innerHTML = '🟢 ВАШ ХОД! 🟢';
    turnIndicator.style.color = '#2ecc71';
    attackBtn.disabled = false;
    medkitBtn.disabled = false;
    fightMessage.innerHTML = '';
});

socket.on('stateUpdate', (state) => {
    gameState = state;
    updateBattleUI();
});

socket.on('turnUpdate', (playerId) => {
    isMyTurn = (playerId === socket.id);
    if (isMyTurn) {
        turnIndicator.innerHTML = '🟢 ВАШ ХОД! 🟢';
        turnIndicator.style.color = '#2ecc71';
        attackBtn.disabled = false;
        medkitBtn.disabled = false;
    } else {
        turnIndicator.innerHTML = '🔴 ХОД ПРОТИВНИКА 🔴';
        turnIndicator.style.color = '#e74c3c';
        attackBtn.disabled = true;
        medkitBtn.disabled = true;
    }
});

socket.on('gameOver', (msg) => {
    fightMessage.innerHTML = `<h2>🏆 ${msg} 🏆</h2>`;
    attackBtn.disabled = true;
    medkitBtn.disabled = true;
    gameState = null;
    setTimeout(() => location.reload(), 5000);
});

socket.on('error', (msg) => {
    fightMessage.innerHTML = `<span style="color:red">❌ ${msg}</span>`;
    setTimeout(() => fightMessage.innerHTML = '', 3000);
});

// Кнопки
document.getElementById('botBtn').onclick = () => {
    socket.emit('playWithBot');
    currentRoomId = 'bot_' + socket.id;
    fightMessage.innerHTML = '🤖 Поиск бота...';
};

attackBtn.onclick = () => {
    if (isMyTurn && gameState) {
        socket.emit('attack', currentRoomId);
    } else {
        fightMessage.innerHTML = 'Сейчас не ваш ход!';
        setTimeout(() => fightMessage.innerHTML = '', 1000);
    }
};

medkitBtn.onclick = () => {
    if (isMyTurn && gameState) {
        socket.emit('useMedkit', currentRoomId);
    } else {
        fightMessage.innerHTML = 'Сейчас не ваш ход!';
        setTimeout(() => fightMessage.innerHTML = '', 1000);
    }
};

document.querySelectorAll('.case-card').forEach(card => {
    card.onclick = () => {
        const side = card.dataset.side;
        const price = card.dataset.price;
        openCase(side, price);
    };
});

document.querySelectorAll('.craft-btn').forEach(btn => {
    btn.onclick = () => {
        const type = btn.dataset.craft;
        craft(type);
    };
});

updateUI();

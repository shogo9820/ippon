const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

const PORT = process.env.PORT || 3000;
const baseUrl = `http://${getLocalIp()}:${PORT}`;

let gameState = {
    phase: 'setup', // 'setup' -> 'recruiting' -> 'playing' -> 'ranking'
    mode: null,     // 'ippon' または 'buzzer'
    status: 'waiting', 
    questions: [
      { q: '日本の首都はどこ？', a: '東京' },
      { q: '1+1は？', a: '2' }
    ],
    currentQuestionIndex: 0,
    currentQuestion: '',
    currentAnswer: '',
    votes: {},
    buzzerQueue: [], // 早押し順位キュー [{playerName, timestamp}]
    voteMode: '10-1',
    scores: {},
    baseUrl: baseUrl 
};

io.on('connection', (socket) => {
    socket.emit('updateState', gameState);

    socket.on('selectMode', (mode) => {
        gameState.phase = 'recruiting';
        gameState.mode = mode;
        gameState.scores = {};
        io.emit('updateState', gameState);
    });

    socket.on('startGame', () => {
        gameState.phase = 'playing';
        gameState.status = 'waiting';
        io.emit('updateState', gameState);
    });

    // 共通・IPPONお題送信用（お題を出した瞬間から自動で投票状態='voting'へ移行）
    socket.on('showQuestionText', (questionText) => {
        gameState.status = (gameState.mode === 'ippon') ? 'voting' : 'question';
        gameState.currentQuestion = questionText;
        gameState.votes = {};
        gameState.buzzerQueue = [];
        io.emit('updateState', gameState);
    });

    // 早押し用問題の動的追加
    socket.on('addQuestion', (data) => {
        gameState.questions.push({ q: data.q, a: data.a });
        io.emit('updateState', gameState);
    });

    socket.on('setVoteMode', (voteMode) => {
        gameState.voteMode = voteMode;
        io.emit('updateState', gameState);
    });

    // 早押し用リストから問題出題
    socket.on('showQuestionByIndex', (index) => {
        if (gameState.questions[index]) {
            gameState.currentQuestionIndex = index;
            gameState.currentQuestion = gameState.questions[index].q;
            gameState.currentAnswer = gameState.questions[index].a;
        }
        gameState.status = 'question';
        gameState.votes = {};
        gameState.buzzerQueue = [];
        io.emit('updateState', gameState);
    });

    socket.on('startVoting', () => {
        gameState.status = 'voting';
        io.emit('updateState', gameState);
    });

    socket.on('sendVote', (data) => {
        gameState.votes[data.voterId] = data.points;
        io.emit('updateVotes', gameState.votes);
    });

    socket.on('finishVoting', () => {
        gameState.status = 'result';
        io.emit('updateState', gameState);
    });

    socket.on('endQuestion', () => {
        gameState.status = 'waiting';
        gameState.currentQuestion = '';
        gameState.currentAnswer = '';
        gameState.buzzerQueue = [];
        io.emit('updateState', gameState);
    });

    // 早押しボタン受付（同時押し対応・重複防止）
    socket.on('pressBuzzer', (data) => {
        if (gameState.status === 'question' && gameState.mode === 'buzzer') {
            const alreadyPressed = gameState.buzzerQueue.some(p => p.playerName === data.playerName);
            if (!alreadyPressed) {
                gameState.buzzerQueue.push({
                    playerName: data.playerName,
                    timestamp: Date.now()
                });
                if (!gameState.scores[data.playerName]) {
                    gameState.scores[data.playerName] = 0;
                }
                io.emit('buzzerPressed', gameState.buzzerQueue);
                io.emit('updateState', gameState);
            }
        }
    });

    // 早押し正解判定（得点加算）
    socket.on('correctAnswer', (playerName) => {
        if (!gameState.scores[playerName]) gameState.scores[playerName] = 0;
        gameState.scores[playerName] += 1;
        gameState.status = 'result';
        io.emit('updateState', gameState);
    });

    // 早押し不正解判定（お手付き：先頭の人間を除外して早押し再開）
    socket.on('wrongAnswer', () => {
        gameState.buzzerQueue.shift();
        gameState.status = 'question';
        io.emit('updateState', gameState);
    });
    
    socket.on('requestRanking', () => {
        gameState.phase = 'ranking';
        io.emit('updateState', gameState);
    });

    socket.on('restartGame', () => {
        gameState.status = 'waiting';
        gameState.currentQuestion = '';
        gameState.currentAnswer = '';
        gameState.buzzerQueue = [];
        gameState.scores = {};
        gameState.phase = 'playing';
        io.emit('updateState', gameState);
    });

    socket.on('resetGame', () => {
        gameState = {
            phase: 'setup',
            mode: null,
            status: 'waiting',
            questions: gameState.questions,
            currentQuestionIndex: 0,
            currentQuestion: '',
            currentAnswer: '',
            votes: {},
            buzzerQueue: [],
            voteMode: '10-1',
            scores: {},
            baseUrl: baseUrl
        };
        io.emit('updateState', gameState);
    });
});

server.listen(PORT, () => {
    console.log(`サーバー起動: ${baseUrl}`);
});
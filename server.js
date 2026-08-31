const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ローカルIPアドレスを取得する関数
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

// サーバー側の状態管理
let gameState = {
  phase: 'setup', // 'setup' -> 'recruiting' -> 'playing' -> 'ranking'
  mode: null,
  status: 'waiting', 
  currentQuestion: '',
  votes: {},
  buzzerWinner: null,
  voteMode: '10-1',
  scores: {}, // プレイヤーごとの得点
  baseUrl: baseUrl 
};

io.on('connection', (socket) => {
  socket.emit('updateState', gameState);

  // モード選択
  socket.on('selectMode', (mode) => {
    gameState.phase = 'recruiting';
    gameState.mode = mode;
    gameState.scores = {};
    io.emit('updateState', gameState);
  });

  // ゲームスタート
  socket.on('startGame', () => {
    gameState.phase = 'playing';
    gameState.status = 'waiting';
    io.emit('updateState', gameState);
  });

  socket.on('setVoteMode', (voteMode) => {
    gameState.voteMode = voteMode;
    io.emit('updateState', gameState);
  });

  socket.on('showQuestion', (questionText) => {
    gameState.status = 'question';
    gameState.currentQuestion = questionText;
    gameState.votes = {};
    gameState.buzzerWinner = null;
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
    gameState.votes = {};
    io.emit('updateState', gameState);
  });

  socket.on('pressBuzzer', (data) => {
    if (!gameState.buzzerWinner && gameState.status === 'question') {
      gameState.buzzerWinner = data.playerName;
      if (!gameState.scores[data.playerName]) {
        gameState.scores[data.playerName] = 0;
      }
      io.emit('buzzerPressed', gameState.buzzerWinner);
      io.emit('updateState', gameState);
    }
  });

  socket.on('resetBuzzer', () => {
    gameState.buzzerWinner = null;
    gameState.status = 'waiting';
    io.emit('updateState', gameState);
  });

  // ランキング画面へ移行
  socket.on('requestRanking', () => {
    gameState.phase = 'ranking';
    io.emit('updateState', gameState);
  });

  // もう一度同じモードで再戦
  socket.on('restartGame', () => {
    gameState.status = 'waiting';
    gameState.currentQuestion = '';
    gameState.votes = {};
    gameState.buzzerWinner = null;
    gameState.scores = {};
    gameState.phase = 'playing';
    io.emit('updateState', gameState);
  });

  // タイトルに戻る（完全リセット）
  socket.on('resetGame', () => {
    gameState = {
      phase: 'setup',
      mode: null,
      status: 'waiting',
      currentQuestion: '',
      votes: {},
      buzzerWinner: null,
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
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const quizData = require('./public/js/data.js');

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
    phase: 'setup', 
    mode: null,     
    status: 'waiting', 
    questions: quizData.buzzerQuestions || [],
    ipponQuestions: quizData.ipponQuestions || [],
    currentQuestionIndex: 0,
    currentQuestion: '',
    currentAnswer: '',
    votes: {},
    buzzerQueue: [], 
    voteMode: '10-1',
    scores: {},
    baseUrl: baseUrl 
};

let connectedUsers = [];

io.on('connection', (socket) => {
    socket.emit('updateState', gameState);
    socket.emit('updateUserList', connectedUsers);

    socket.on('joinUser', (data) => {
        const existingUserIndex = connectedUsers.findIndex(u => u.id === socket.id);
        if (existingUserIndex >= 0) {
            connectedUsers[existingUserIndex].name = data.name;
            connectedUsers[existingUserIndex].role = data.role;
        } else {
            connectedUsers.push({
                id: socket.id,
                name: data.name,
                role: data.role
            });
        }
        io.emit('updateUserList', connectedUsers);
    });

    socket.on('selectMode', (mode) => {
        gameState.phase = 'recruiting';
        gameState.mode = mode;
        gameState.scores = {};
        gameState.currentQuestionIndex = 0; 
        io.emit('updateState', gameState);
    });

    socket.on('startGame', () => {
        gameState.phase = 'playing';
        gameState.status = 'waiting';
        io.emit('updateState', gameState);
    });

    socket.on('showQuestionText', (questionText) => {
        if (gameState.mode === 'ippon') {
            if (!questionText) {
                if (gameState.ipponQuestions && gameState.ipponQuestions.length > 0) {
                    gameState.currentQuestionIndex = (gameState.currentQuestionIndex + 1) % gameState.ipponQuestions.length;
                    gameState.currentQuestion = gameState.ipponQuestions[gameState.currentQuestionIndex];
                }
            } else {
                gameState.currentQuestion = questionText;
            }
            gameState.status = 'voting';
            gameState.currentPresenter = '';
        } else {
            gameState.status = 'question';
            gameState.currentQuestion = questionText;
        }
        gameState.votes = {};
        gameState.buzzerQueue = [];
        io.emit('updateState', gameState);
    });

    socket.on('addQuestion', (data) => {
        gameState.questions.push({ q: data.q, a: data.a });
        io.emit('updateState', gameState);
    });

    socket.on('addIpponQuestion', (qText) => {
        if (qText) {
            gameState.ipponQuestions.push(qText);
            io.emit('updateState', gameState);
        }
    });

    socket.on('setVoteMode', (voteMode) => {
        gameState.voteMode = voteMode;
        io.emit('updateState', gameState);
    });

    socket.on('showQuestionByIndex', (index) => {
        if (gameState.questions && gameState.questions.length > 0) {
            if (index === undefined || index === '' || index === null) {
                gameState.currentQuestionIndex = (gameState.currentQuestionIndex + 1) % gameState.questions.length;
            } else {
                gameState.currentQuestionIndex = parseInt(index, 10);
            }

            if (gameState.questions[gameState.currentQuestionIndex]) {
                gameState.currentQuestion = gameState.questions[gameState.currentQuestionIndex].q;
                gameState.currentAnswer = gameState.questions[gameState.currentQuestionIndex].a;
            }
        }
        gameState.status = 'question';
        gameState.votes = {};
        gameState.buzzerQueue = [];
        io.emit('updateState', gameState);
    });

    socket.on('nextQuestion', () => {
        if (gameState.mode === 'buzzer') {
            if (gameState.questions && gameState.questions.length > 0) {
                gameState.currentQuestionIndex = (gameState.currentQuestionIndex + 1) % gameState.questions.length;
                const nextQ = gameState.questions[gameState.currentQuestionIndex];
                gameState.currentQuestion = nextQ.q;
                gameState.currentAnswer = nextQ.a;
            }
        } else if (gameState.mode === 'ippon') {
            if (gameState.ipponQuestions && gameState.ipponQuestions.length > 0) {
                gameState.currentQuestionIndex = (gameState.currentQuestionIndex + 1) % gameState.ipponQuestions.length;
                gameState.currentQuestion = gameState.ipponQuestions[gameState.currentQuestionIndex];
                gameState.currentPresenter = '';
            }
        }
        gameState.status = (gameState.mode === 'ippon') ? 'voting' : 'question';
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
                
                // 早押しされたら問題文を非表示にして「解答権獲得（回答者名表示）」用のステータスにする
                gameState.status = 'answered';

                io.emit('buzzerPressed', gameState.buzzerQueue);
                io.emit('updateState', gameState);
            }
        }
    });

    socket.on('correctAnswer', (playerName) => {
        if (!gameState.scores[playerName]) gameState.scores[playerName] = 0;
        gameState.scores[playerName] += 1;
        
        // 正解された瞬間に、PC画面に問題文と答えを両方表示させるためのステータスに変更
        gameState.status = 'correct'; 
        io.emit('updateState', gameState);
    });

    socket.on('wrongAnswer', () => {
        gameState.buzzerQueue.shift();
        if (gameState.buzzerQueue.length > 0) {
            // まだ次の早押し者がいれば解答権状態を維持
            gameState.status = 'answered';
        } else {
            // 全員不正解なら問題文を再び表示して早押し再開
            gameState.status = 'question';
        }
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
            questions: quizData.buzzerQuestions || [],
            ipponQuestions: quizData.ipponQuestions || [],
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

    socket.on('disconnect', () => {
        connectedUsers = connectedUsers.filter(u => u.id !== socket.id);
        io.emit('updateUserList', connectedUsers);
    });
});

server.listen(PORT, () => {
    console.log(`サーバー起動: ${baseUrl}`);
});
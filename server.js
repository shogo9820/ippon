<<<<<<< HEAD
// server.js (共通リアルタイムハブサーバー - 大喜利ループ進行 確定版)
=======
>>>>>>> 4a82d9c738828a3197cee2465ce4687b4398168c
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
<<<<<<< HEAD
const QRCode = require('qrcode'); 
=======
const quizData = require('./public/js/data.js');
>>>>>>> 4a82d9c738828a3197cee2465ce4687b4398168c

const app = express();
const server = http.createServer(app);
const io = new Server(server);

<<<<<<< HEAD
const PORT = process.env.PORT || 3000;
=======
app.use(express.static(path.join(__dirname, 'public')));
>>>>>>> 4a82d9c738828a3197cee2465ce4687b4398168c

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

<<<<<<< HEAD
const BASE_URL = "http://" + getLocalIp() + ":" + PORT;
app.use(express.static(path.join(__dirname, 'public')));

// データのインポート
const { ipponQuestions } = require('./public/ippon/js/data.js');
const { buzzerQuestions } = require('./public/quiz/js/data.js');

let gameState = {
    phase: 'setup',
    mode: null,
    status: 'waiting',
    baseUrl: BASE_URL,
    scores: {},
    questions: buzzerQuestions || [],      
    currentQuestionIndex: -1,
    currentQuestion: '',
    currentAnswer: '',
    ipponQuestions: ipponQuestions || [],  
    currentPresenter: '',
    votes: {},
    nextIpponQuestionText: '',
    nextQuizQuestionText: ''
};

let ipponHistory = [];
let quizHistory = [];
let window_nextIpponId = null;
let window_nextQuizId = null;

function setNextIpponRandom() {
    if (!gameState.ipponQuestions || gameState.ipponQuestions.length === 0) return;
    let availableQuestions = gameState.ipponQuestions.filter(q => !ipponHistory.includes(q.id));
    if (availableQuestions.length === 0) { 
        ipponHistory = []; 
        availableQuestions = gameState.ipponQuestions; 
    }
    let pickedObj = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    gameState.nextIpponQuestionText = pickedObj.text;
    window_nextIpponId = pickedObj.id; 
}

function setNextQuizRandom() {
    if (!gameState.questions || gameState.questions.length === 0) return;
    let availableQuestions = gameState.questions.filter(q => !quizHistory.includes(q.id));
    if (availableQuestions.length === 0) { 
        quizHistory = []; 
        availableQuestions = gameState.questions; 
    }
    let pickedObj = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    gameState.nextQuizQuestionText = pickedObj.q;
    window_nextQuizId = pickedObj.id; 
}

let connectedUsers = [];
function sendState() { io.emit('updateState', gameState); }
=======
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
>>>>>>> 4a82d9c738828a3197cee2465ce4687b4398168c

io.on('connection', (socket) => {
    socket.emit('updateState', gameState);
    socket.emit('updateUserList', connectedUsers);

    socket.on('joinUser', (data) => {
<<<<<<< HEAD
        if (!data.name) return;
        socket.playerName = data.name;
        socket.playerRole = data.role;
        if (data.role === 'buzzer' && gameState.scores[data.name] === undefined) {
            gameState.scores[data.name] = 0;
        }
        connectedUsers = connectedUsers.filter(u => u.id !== socket.id);
        connectedUsers.push({ id: socket.id, name: data.name, role: data.role });
        io.emit('updateUserList', connectedUsers);
        sendState();
    });

    socket.on('requestQR', async (type) => {
        try {
            if (type === 'controller') {
                const qrImageUrl = await QRCode.toDataURL(gameState.baseUrl + "/index.html?device=control");
                socket.emit('responseControllerQR', qrImageUrl);
            } else if (type === 'ippon') {
                const buzzerQR = await QRCode.toDataURL(gameState.baseUrl + "/shared/buzzer.html");
                const voterQR = await QRCode.toDataURL(gameState.baseUrl + "/shared/voter.html");
                socket.emit('responseIpponQR', { buzzerQR, voterQR });
            } else if (type === 'quiz') {
                const buzzerQR = await QRCode.toDataURL(gameState.baseUrl + "/shared/buzzer.html");
                socket.emit('responseQuizQR', buzzerQR);
            }
        } catch (err) { console.error('QR生成エラー:', err); }
    });

    socket.on('selectMode', (mode) => {
        gameState.mode = mode;
        gameState.phase = 'recruiting';
        gameState.status = 'waiting';
        setNextIpponRandom();
        setNextQuizRandom();
        sendState();
=======
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
>>>>>>> 4a82d9c738828a3197cee2465ce4687b4398168c
    });

    socket.on('startGame', () => {
        gameState.phase = 'playing';
        gameState.status = 'waiting';
<<<<<<< HEAD
        gameState.votes = {};
        gameState.currentPresenter = '';
        gameState.currentQuestion = '';
        gameState.currentAnswer = '';
        ipponHistory = [];
        quizHistory = [];
        setNextIpponRandom();
        setNextQuizRandom();
        sendState();
    });

    // 🟨 大喜利（IPPON）用出題
    socket.on('showQuestionText', (selectedText) => {
        gameState.votes = {};
        gameState.currentPresenter = '';
        if (gameState.ipponQuestions && gameState.ipponQuestions.length > 0) {
            if (!selectedText || selectedText === "") {
                gameState.currentQuestion = gameState.nextIpponQuestionText;
                if (window_nextIpponId !== null) ipponHistory.push(window_nextIpponId); 
            } else {
                gameState.currentQuestion = selectedText;
                const picked = gameState.ipponQuestions.find(q => q.text === selectedText);
                if (picked) ipponHistory.push(Number(picked.id));
            }
            setNextIpponRandom();
        }
        gameState.status = 'question';
        sendState();
    });

    // 🟥 クイズ（QUIZ）用出題
    socket.on('showQuestionByIndex', (index) => {
        gameState.votes = {};
        gameState.currentPresenter = '';
        if (gameState.questions && gameState.questions.length > 0) {
            if (index === undefined || index === '' || index === null) {
                let pickedQuiz = gameState.questions.find(q => Number(q.id) === window_nextQuizId);
                if (!pickedQuiz) pickedQuiz = gameState.questions;
                gameState.currentQuestion = pickedQuiz.q;
                gameState.currentAnswer = pickedQuiz.a;
                if (window_nextQuizId !== null) quizHistory.push(window_nextQuizId); 
            } else {
                let idx = parseInt(index, 10);
                let pickedQuiz = gameState.questions[idx];
                if (pickedQuiz) {
                    gameState.currentQuestion = pickedQuiz.q;
                    gameState.currentAnswer = pickedQuiz.a;
                    quizHistory.push(Number(pickedQuiz.id));
                }
            }
            setNextQuizRandom();
        }
        gameState.status = 'question';
        sendState();
    });

    socket.on('pressBuzzer', (data) => {
        if (gameState.status === 'question') {
            gameState.currentPresenter = data.playerName;
            gameState.status = gameState.mode === 'ippon' ? 'voting' : 'answered';
            sendState();
        }
=======
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
>>>>>>> 4a82d9c738828a3197cee2465ce4687b4398168c
    });

    socket.on('endQuestion', () => {
        gameState.status = 'waiting';
<<<<<<< HEAD
        gameState.votes = {};
        gameState.currentPresenter = '';
        sendState();
    });

    // 🟨 大喜利（IPPON）：🏆 投票終了（全員2点の満票時のみ一本スコア加算）
    socket.on('finishVoting', () => {
        if (gameState.mode === 'ippon' && gameState.status === 'voting') {
            
            // 💡 現在のログインユーザーリストから「審査員(voter)」の正確な人数を割り出す
            const currentVotersCount = connectedUsers.filter(u => u.role === 'voter').length || 3;
            const maxPossiblePoints = currentVotersCount * 2; // 全員が2点を出したときの満票合計値
            
            // 現在の合計得点を算出
            var totalPoints = Object.values(gameState.votes || {}).reduce(function(a, b) { return a + b; }, 0);
            
            // 💡【要件変更】：審査員全員が2点を出した「満票（maxPossiblePoints）」のときのみスコア加算！
            if (totalPoints >= maxPossiblePoints && gameState.currentPresenter) {
                if (gameState.scores[gameState.currentPresenter] !== undefined) {
                    gameState.scores[gameState.currentPresenter] += 1;
                }
            }

            gameState.status = 'result';
            io.emit('updateState', gameState);

            // 1.8秒後に自動リセット復帰
            setTimeout(() => {
                if (gameState.mode === 'ippon' && gameState.status === 'result') {
                    gameState.votes = {};            
                    gameState.currentPresenter = ''; 
                    gameState.status = 'question';   
                    sendState();
                }
            }, 1800); 
        }
    });

    // 🟥 クイズ（QUIZ）：❌ 不正解
    socket.on('wrongAnswer', () => {
        gameState.currentPresenter = '';
        gameState.status = 'question';
        sendState();
    });

    // 🟥 クイズ（QUIZ）：⭕ 正解確定
    socket.on('correctAnswer', (winnerName) => {
        if (gameState.status === 'correct' || gameState.status === 'result') return;
        if (winnerName) {
            if (gameState.scores[winnerName] === undefined) gameState.scores[winnerName] = 0;
            gameState.scores[winnerName] += 1;
        }
        gameState.status = 'correct';
        sendState();
    });

    socket.on('sendVote', (data) => {
        if (gameState.mode === 'ippon' && gameState.status === 'voting') {
            gameState.votes[data.voterId] = data.points;
            io.emit('updateVotes', gameState.votes);
            sendState();
        }
    });

    socket.on('requestRanking', () => { gameState.phase = 'ranking'; sendState(); });

    socket.on('resetGame', () => {
        gameState.phase = 'setup'; gameState.mode = null; gameState.status = 'waiting';
        gameState.scores = {}; gameState.votes = {}; gameState.currentQuestionIndex = -1;
        gameState.currentQuestion = ''; gameState.currentAnswer = ''; gameState.currentPresenter = '';
        gameState.nextIpponQuestionText = ''; gameState.nextQuizQuestionText = '';
        ipponHistory = []; quizHistory = [];
        sendState();
=======
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
>>>>>>> 4a82d9c738828a3197cee2465ce4687b4398168c
    });

    socket.on('disconnect', () => {
        connectedUsers = connectedUsers.filter(u => u.id !== socket.id);
        io.emit('updateUserList', connectedUsers);
    });
});

server.listen(PORT, () => {
<<<<<<< HEAD
    console.log("==========================================================");
    console.log(" 🚀 共通マルチハブサーバー正常起動: " + BASE_URL + "/index.html");
    console.log("==========================================================");
});
=======
    console.log(`サーバー起動: ${baseUrl}`);
});
>>>>>>> 4a82d9c738828a3197cee2465ce4687b4398168c

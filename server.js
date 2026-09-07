// server.js (共通リアルタイムハブサーバー - 大喜利ループ進行 確定版)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

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

const BASE_URL = "https://ippon.onrender.com";
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
// 💡 gameStateを送信する直前に、最新のconnectedUsers（ログイン中のユーザー一覧）を合流させる！
function sendState() { 
    gameState.connectedUsers = connectedUsers; 
    io.emit('updateState', gameState); 
}

io.on('connection', (socket) => {
    socket.emit('updateState', gameState);
    socket.emit('updateUserList', connectedUsers);

    socket.on('joinUser', (data) => {
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
    });

    socket.on('startGame', () => {
        gameState.phase = 'playing';
        gameState.status = 'waiting';
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
    });

    socket.on('endQuestion', () => {
        gameState.status = 'waiting';
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

// --- server.js の一番下付近にある sendVote イベントを修正 ---

    socket.on('sendVote', (data) => {
        if (gameState.mode === 'ippon' && gameState.status === 'voting') {
            // リアルタイムに票を上書き保存
            gameState.votes[data.voterId] = data.points;
            io.emit('updateVotes', gameState.votes);
            
            // 💡 現在ログインしている審査員の正確な人数から、この瞬間の満票値を計算
            const currentVotersCount = connectedUsers.filter(u => u.role === 'voter').length || 3;
            const maxPossiblePoints = currentVotersCount * 2;
            
            // 現在の合計得点を算出
            const totalPoints = Object.values(gameState.votes || {}).reduce((a, b) => a + b, 0);
            
            // 🔥【仕様追加】もしリアルタイム投票中に自動で満票に達したら、その瞬間に自動で「一本判定」をキックする！
            if (totalPoints >= maxPossiblePoints && gameState.currentPresenter) {
                if (gameState.scores[gameState.currentPresenter] !== undefined) {
                    gameState.scores[gameState.currentPresenter] += 1;
                }
                
                gameState.status = 'result';
                sendState(); // 全体に状態を配信して、テレビ画面をゴールドアウトさせる！

                // 1.8秒後に自動リセットして次へ
                setTimeout(() => {
                    if (gameState.mode === 'ippon' && gameState.status === 'result') {
                        gameState.votes = {};            
                        gameState.currentPresenter = ''; 
                        gameState.status = 'question';   
                        sendState();
                    }
                }, 1800);
                return; // 自動終了したため、これ以降の処理はスキップ
            }

            // 満票に達していない場合は、そのままリアルタイムな状態を配信（何回でも投票変更可能）
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
    });

    socket.on('disconnect', () => {
        connectedUsers = connectedUsers.filter(u => u.id !== socket.id);
        io.emit('updateUserList', connectedUsers);
    });
});

server.listen(PORT, () => {
    console.log("==========================================================");
    console.log(" 🚀 共通マルチハブサーバー正常起動: " + BASE_URL + "/index.html");
    console.log("==========================================================");
});

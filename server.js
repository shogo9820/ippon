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
    // 💡【追加】新しく画面を開いたスマホへ、重ならない初期名前を提案する
    // 現在ログイン中の「答（buzzer）」と「審（voter）」の人数をそれぞれカウント
    const currentBuzzerCount = connectedUsers.filter(u => u.role === 'buzzer').length;
    const currentVoterCount = connectedUsers.filter(u => u.role === 'voter').length;

    // 次に入る人のためのおすすめ番号（現在の人数 + 1）
    socket.emit('initDefaultName', {
        defaultBuzzerName: `プレイヤー${currentBuzzerCount + 1}`,
        defaultVoterName: `投票者${currentVoterCount + 1}`
    });
    
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

// --- server.js の sendVote イベント完全版 ---

    socket.on('sendVote', (data) => {
        if (gameState.mode === 'ippon' && gameState.status === 'voting') {
            // リアルタイムに票（1点、2点）を保存
            gameState.votes[data.voterId] = data.points;
            io.emit('updateVotes', gameState.votes);
            
            // 💡 現在の合計得点（票数）を計算
            const totalPoints = Object.values(gameState.votes || {}).reduce((a, b) => a + b, 0);
            
            // 💡【変数：満票 ＝ 投票者 * 2】の計算
            const currentVotersCount = connectedUsers.filter(u => u.role === 'voter').length || 3;
            const maxPossiblePoints = currentVotersCount * 2;
            
            // 🔥【IF 票 ＝ 満票】に達したら、その瞬間に自動でIPPON（result）へ進める！
            if (totalPoints >= maxPossiblePoints && gameState.currentPresenter) {
                // スコア加算
                if (gameState.scores[gameState.currentPresenter] !== undefined) {
                    gameState.scores[gameState.currentPresenter] += 1;
                }
                
                gameState.status = 'result';
                sendState(); // テレビ画面に満票の「埋め尽くし＆IPPONの箱」を即座に伝える！

                // 1.8秒後に自動リセットして次のお題待機へ
                setTimeout(() => {
                    if (gameState.mode === 'ippon' && gameState.status === 'result') {
                        gameState.votes = {};            
                        gameState.currentPresenter = ''; 
                        gameState.status = 'question';   
                        sendState();
                    }
                }, 1800);
                return;
            }

            // 満票に達していない間（途中経過）は、いつでも上書き変更を受け付ける
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

    // --- server.js の下部（disconnectイベントの直前など）に追記 ---

    // 🟨 大喜利（IPPON）のお題をリアルタイムに追加する
    socket.on('addIpponQuestion', (text) => {
        if (!text) return;
        // 現在のリストの最大IDを取得して、新しいIDを採番する
        const nextId = gameState.ipponQuestions.length > 0 
            ? Math.max(...gameState.ipponQuestions.map(q => Number(q.id))) + 1 
            : 1;
        
        // サーバー側の配列に新しいお題を合流させる
        gameState.ipponQuestions.push({ id: nextId, text: text });
        console.log(`【お題追加】新しいお題が追加されました: ID=${nextId}, 内容=${text}`);
        
        // 追加された最新のリストを全端末に配信
        sendState();
    });

    // 🟥 クイズ（QUIZ）の問題をリアルタイムに追加する
    socket.on('addQuestion', (data) => {
        if (!data || !data.q || !data.a) return;
        // 現在のクイズリストの最大IDを取得して、新しいIDを採番する
        const nextId = gameState.questions.length > 0 
            ? Math.max(...gameState.questions.map(q => Number(q.id))) + 1 
            : 1;
        
        // サーバー側の配列に新しいクイズを合流させる
        gameState.questions.push({ id: nextId, q: data.q, a: data.a });
        console.log(`【クイズ追加】新しい問題が追加されました: ID=${nextId}, Q=${data.q}, A=${data.a}`);
        
        // 追加された最新のリストを全端末に配信
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

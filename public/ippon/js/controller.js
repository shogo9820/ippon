// --- public/ippon/js/controller.js 完全修正版 ---
const socket = io();
let startTime = null;
let timerInterval = null;

window.addEventListener('DOMContentLoaded', () => {
    socket.emit('joinUser', { name: '大喜利司会者', role: 'controller' });

    document.getElementById('menu-add-btn').addEventListener('click', () => openModal('add-modal'));
    document.getElementById('menu-end-btn').addEventListener('click', () => openModal('end-modal'));
    document.getElementById('modal-cancel-btn').addEventListener('click', () => closeModal('add-modal'));
    document.getElementById('end-close-btn').addEventListener('click', () => closeModal('end-modal'));
    
    document.getElementById('submit-q-btn').addEventListener('click', sendQuestion);
    document.getElementById('action-correct-btn').addEventListener('click', judgeCorrect);
    
    document.getElementById('modal-submit-btn').addEventListener('click', submitNewQuestion);
    document.getElementById('end-rank-btn').addEventListener('click', endGameAndRank);
    document.getElementById('end-restart-btn').addEventListener('click', () => socket.emit('startGame'));
    document.getElementById('end-back-btn').addEventListener('click', () => {
        socket.emit('resetGame');
        window.location.href = '/';
    });
});

// 💡 修正：存在しない配列を見に行かず、サーバーから送られてきたリストでプルダウンを再構築する
function initIpponSelect(questionsList) {
    const select = document.getElementById('ippon-select-q');
    if (!select || !questionsList) return;
    
    select.innerHTML = '<option value="">-- 通常はランダム出題 --</option>';
    questionsList.forEach((item, index) => {
        const opt = document.createElement('option');
        opt.value = item.text;
        opt.innerText = (index + 1) + ": " + item.text;
        select.appendChild(opt);
    });
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const diff = Date.now() - startTime;
        const min = String(Math.floor(diff / 60000)).padStart(2, '0');
        const sec = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
        document.getElementById('timer-display').innerText = min + ":" + sec;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('timer-display').innerText = "00:00";
}

function sendQuestion() {
    const select = document.getElementById('ippon-select-q');
    const selectedText = select ? select.value : "";
    socket.emit('showQuestionText', selectedText);
    if (select) select.value = "";
}

function judgeCorrect() { socket.emit('finishVoting'); } 
function endGameAndRank() { socket.emit('requestRanking'); }

function submitNewQuestion() {
    const text = document.getElementById('new-q-text').value.trim();
    if(text) {
        // サーバーへ追加信号を送信（server.jsでキャッチされて最新リストが折り返されます）
        socket.emit('addIpponQuestion', text);
        document.getElementById('new-q-text').value = '';
        closeModal('add-modal');
    }
}

// サーバー状態（State）を監視してリモコンのカンペを一斉同期
socket.on('updateState', (state) => {
    if (state.phase === 'setup') { window.location.href = '/index.html'; return; }

    // 🔥【重要】サーバーから送られてくる追加お題入りの最新リストでプルダウンを上書き更新
    if (state.ipponQuestions) {
        initIpponSelect(state.ipponQuestions);
    }

    document.getElementById('current-q').innerText = state.currentQuestion || "未出題";
    
    if (state.nextIpponQuestionText) {
        document.getElementById('next-q').innerText = state.nextIpponQuestionText;
    } else {
        document.getElementById('next-q').innerText = "次のお題はありません";
    }

    if (state.status === 'question') {
        if (state.buzzerQueue && state.buzzerQueue.length === 0 && state.votes && Object.keys(state.votes).length === 0) {
            startTimer();
        }
    } else if (state.status === 'waiting' || state.status === 'result') {
        stopTimer();
    }

    const btnCorrect = document.getElementById('action-correct-btn');
    if (btnCorrect) {
        if (state.currentPresenter) {
            btnCorrect.innerText = "🏆 投票終了 (" + state.currentPresenter + ")";
        } else {
            btnCorrect.innerText = "🏆 投票終了 (一本判定)";
        }
    }

    const rankList = document.getElementById('rank-list');
    if (rankList && state.scores) {
        rankList.innerHTML = "";
        const sorted = Object.entries(state.scores).sort((a,b) => b - a);
        sorted.forEach(([name, score], idx) => {
            const row = document.createElement('div');
            row.className = 'rank-item';
            row.innerHTML = '<span>第 ' + (idx + 1) + ' 位 : ' + name + '</span><span>' + score + ' pt</span>';
            rankList.appendChild(row);
        });
    }
});

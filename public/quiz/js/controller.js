// --- public/quiz/js/controller.js 完全修正版 ---
const socket = io();

window.addEventListener('DOMContentLoaded', () => {
    socket.emit('joinUser', { name: 'クイズ司会者', role: 'controller' });

    document.getElementById('menu-add-btn').addEventListener('click', () => openModal('add-modal'));
    document.getElementById('menu-end-btn').addEventListener('click', () => openModal('end-modal'));
    document.getElementById('modal-cancel-btn').addEventListener('click', () => closeModal('add-modal'));
    document.getElementById('end-close-btn').addEventListener('click', () => closeModal('end-modal'));
    
    document.getElementById('submit-q-btn').addEventListener('click', sendQuestion);
    
    document.getElementById('action-wrong-btn').addEventListener('click', judgeWrong);
    document.getElementById('action-correct-btn').addEventListener('click', judgeCorrect);
    
    document.getElementById('modal-submit-btn').addEventListener('click', submitNewQuestion);
    document.getElementById('end-rank-btn').addEventListener('click', endGameAndRank);
    document.getElementById('end-restart-btn').addEventListener('click', () => socket.emit('startGame'));
    document.getElementById('end-back-btn').addEventListener('click', () => {
        socket.emit('resetGame');
        window.location.href = '/';
    });
});

// 💡 修正：サーバーから届く最新のクイズリストを使ってプルダウンを再構築する
function initQuizSelect(questionsList) {
    const select = document.getElementById('quiz-select-q');
    if (!select || !questionsList) return;
    
    select.innerHTML = '<option value="">-- 通常はランダム出題 --</option>';
    questionsList.forEach((item, index) => {
        const opt = document.createElement('option');
        opt.value = index; 
        opt.innerText = (index + 1) + ": " + item.q.substring(0, 18) + "..."; 
        select.appendChild(opt);
    });
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function sendQuestion() {
    const select = document.getElementById('quiz-select-q');
    const selectedIndex = select ? select.value : "";
    if (selectedIndex === "") {
        socket.emit('showQuestionByIndex', undefined);
    } else {
        socket.emit('showQuestionByIndex', selectedIndex);
    }
    if (select) select.value = "";
}

function judgeCorrect() {
    if (window.lastState && window.lastState.currentPresenter) {
        socket.emit('correctAnswer', window.lastState.currentPresenter);
    } else {
        alert("現在、解答権を持っているプレイヤーがいません。");
    }
}

function judgeWrong() { socket.emit('wrongAnswer'); }
// エラー回避：もし既存のコードで使われていたら定義を残しておく
function judgeCorrectAction() { judgeCorrect(); }
function judgeWrongAction() { judgeWrong(); }

function endGameAndRank() { socket.emit('requestRanking'); }

function submitNewQuestion() {
    const q = document.getElementById('new-q-text').value.trim();
    const a = document.getElementById('new-a-text').value.trim();
    if(q && a) {
        // サーバーへ追加信号を送信
        socket.emit('addQuestion', { q: q, a: a });
        document.getElementById('new-q-text').value = '';
        document.getElementById('new-a-text').value = '';
        closeModal('add-modal');
    }
}

socket.on('updateState', (state) => {
    if (state.phase === 'setup') { window.location.href = '/index.html'; return; }

    window.lastState = state;

    // 🔥【重要】サーバーから送られてくる追加問題入りの最新リストでプルダウンを上書き更新
    if (state.questions) {
        initQuizSelect(state.questions);
    }

    document.getElementById('current-q').innerText = state.currentQuestion || "未出題";
    document.getElementById('current-a').innerText = state.currentAnswer || "-";
    
    if (state.nextQuizQuestionText) {
        document.getElementById('next-q').innerText = state.nextQuizQuestionText;
    } else {
        document.getElementById('next-q').innerText = "次の問題はありません";
    }

    const btnAction = document.getElementById('action-correct-btn');
    if (btnAction) {
        if (state.currentPresenter) {
            btnAction.innerText = "⭕ 正解 (" + state.currentPresenter + ")";
        } else {
            btnAction.innerText = "⭕ 正解";
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

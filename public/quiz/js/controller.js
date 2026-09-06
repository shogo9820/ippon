// public/quiz/js/controller.js
const socket = io();

window.addEventListener('DOMContentLoaded', () => {
    socket.emit('joinUser', { name: 'クイズ司会者', role: 'controller' });

    // 💡【重要】data.jsのクイズ問題一覧をセレクトボックスに自動で詰め込む
    initQuizSelect();

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

function initQuizSelect() {
    const select = document.getElementById('quiz-select-q');
    if (!select || typeof buzzerQuestions === 'undefined') return;
    
    select.innerHTML = '<option value="">-- 通常はランダム出題 --</option>';
    buzzerQuestions.forEach((item, index) => {
        const opt = document.createElement('option');
        opt.value = index; // 配列の添字をvalueにする
        opt.innerText = (index + 1) + ": " + item.q.substring(0, 18) + "..."; // 枠潰れ防止で先頭18文字をプレビュー
        select.appendChild(opt);
    });
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// 💡 出題ボタンが押されたときの処理
function sendQuestion() {
    const select = document.getElementById('quiz-select-q');
    const selectedIndex = select ? select.value : "";
    
    if (selectedIndex === "") {
        // 何も選ばれていなければ、undefinedを送ってサーバー側で通常ランダム出題を走らせる！
        socket.emit('showQuestionByIndex', undefined);
    } else {
        // 選ばれていれば、そのインデックスの番号を渡して狙い撃ち出題させる！
        socket.emit('showQuestionByIndex', selectedIndex);
    }
    
    // 出題後に選択をクリア
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
function endGameAndRank() { socket.emit('requestRanking'); }

function submitNewQuestion() {
    const q = document.getElementById('new-q-text').value.trim();
    const a = document.getElementById('new-a-text').value.trim();
    if(q && a) {
        socket.emit('addQuestion', { q: q, a: a });
        document.getElementById('new-q-text').value = '';
        document.getElementById('new-a-text').value = '';
        closeModal('add-modal');
        setTimeout(initQuizSelect, 200);
    }
}

socket.on('updateState', (state) => {
    if (state.phase === 'setup') { window.location.href = '/index.html'; return; }

    window.lastState = state;
    document.getElementById('current-q').innerText = state.currentQuestion || "未出題";
    document.getElementById('current-a').innerText = state.currentAnswer || "-";
    
    // 💡【バグ修正】サーバーの変数名「nextQuizQuestionText」と100%一致させて次問題カンペを表示！
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

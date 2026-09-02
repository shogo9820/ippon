const socket = io();

let ipponStartTime = null;
let ipponTimerInterval = null;

function selectMode(mode) { socket.emit('selectMode', mode); }
function startGame() { socket.emit('startGame'); }
function changeVoteMode() { socket.emit('setVoteMode', document.getElementById('vote-mode-select').value); }
function finishVoting() { socket.emit('finishVoting'); }
function endQuestion() { socket.emit('endQuestion'); }

function showIpponQuestion() {
    const qText = document.getElementById('ippon-question-input').value;
    if (qText) {
        socket.emit('showQuestionText', qText);
        startIpponTimer();
    }
}

function startIpponTimer() {
    ipponStartTime = Date.now();
    if (ipponTimerInterval) clearInterval(ipponTimerInterval);
    ipponTimerInterval = setInterval(() => {
        const diff = Math.floor((Date.now() - ipponStartTime) / 1000);
        const min = String(Math.floor(diff / 60)).padStart(2, '0');
        const sec = String(diff % 60).padStart(2, '0');
        const timerEl = document.getElementById('ippon-timer');
        if (timerEl) timerEl.innerText = `${min}:${sec}`;
    }, 1000);
}

function openIpponAddModal() {
    openAddModal();
}

// モダル制御 (早押し・共通)
function openAddModal() {
    document.getElementById('add-modal').style.display = 'flex';
}
function closeAddModal() {
    document.getElementById('add-modal').style.display = 'none';
    document.getElementById('new-q').value = '';
    document.getElementById('new-a').value = '';
}

function addQuestion() {
    const q = document.getElementById('new-q').value;
    const a = document.getElementById('new-a').value;
    if (q && a) {
        socket.emit('addQuestion', { q, a });
        closeAddModal();
        alert('問題を追加しました！');
    } else {
        alert('問題文と答えの両方を入力してください');
    }
}

function startSelectedQuestion() {
    const idx = document.getElementById('question-select').value;
    socket.emit('showQuestionByIndex', idx);
}

function judgeCorrect() {
    if (window.currentQueue && window.currentQueue.length > 0) {
        const winner = window.currentQueue[0].playerName;
        socket.emit('correctAnswer', winner);
    }
}

function judgeWrong() {
    socket.emit('wrongAnswer');
}

function requestRanking() {
    if (confirm('ランキングを表示しますか？')) socket.emit('requestRanking');
}
function restartGame() { socket.emit('restartGame'); }
function resetGame() { socket.emit('resetGame'); }

socket.on('updateState', (state) => {
    document.getElementById('setup-section').style.display = (state.phase === 'setup') ? 'block' : 'none';
    document.getElementById('recruit-section').style.display = (state.phase === 'recruiting') ? 'block' : 'none';
    document.getElementById('play-section').style.display = (state.phase === 'playing') ? 'block' : 'none';
    document.getElementById('ranking-section').style.display = (state.phase === 'ranking') ? 'block' : 'none';

    if (state.phase === 'playing') {
        if (state.mode === 'ippon') {
            document.getElementById('ippon-controls').style.display = 'flex';
            document.getElementById('buzzer-controls').style.display = 'none';
            if (ipponTimerInterval && !state.currentQuestion) {
                clearInterval(ipponTimerInterval);
                document.getElementById('ippon-timer').innerText = '00:00';
            }
            document.getElementById('vote-mode-select').value = state.voteMode;
            document.getElementById('ippon-current-q').innerText = state.currentQuestion || '未設定';

            // スコア・順位の反映
            const sortedScores = Object.entries(state.scores || {}).sort((a, b) => b[1] - a[1]);
            const allScoresEl = document.getElementById('ippon-all-scores');
            if (sortedScores.length > 0) {
                allScoresEl.innerHTML = sortedScores.map(([name, score], idx) => `${idx + 1}位: ${name} (${score}pt)`).join(' / ');
            } else {
                allScoresEl.innerHTML = 'まだスコアがありません';
            }

            // IPPON側の解答権保持者（回答中プレイヤーなどがいれば）
            const ipponFastestEl = document.getElementById('ippon-fastest');
            if (state.currentPresenter) {
                ipponFastestEl.innerText = state.currentPresenter;
            } else {
                ipponFastestEl.innerText = 'なし';
            }

        } else {
            document.getElementById('ippon-controls').style.display = 'none';
            document.getElementById('buzzer-controls').style.display = 'flex';
            if (ipponTimerInterval) clearInterval(ipponTimerInterval);

            const select = document.getElementById('question-select');
            select.innerHTML = '';
            state.questions.forEach((item, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                opt.innerText = `${index + 1}: ${item.q}`;
                if (index == state.currentQuestionIndex) opt.selected = true;
                select.appendChild(opt);
            });

            document.getElementById('ctrl-current-q').innerText = state.currentQuestion || '未選択';
            document.getElementById('ctrl-current-a').innerText = state.currentAnswer || '-';

            window.currentQueue = state.buzzerQueue;
            const fastestEl = document.getElementById('ctrl-fastest');
            const allScoresEl = document.getElementById('ctrl-all-scores');

            if (state.buzzerQueue && state.buzzerQueue.length > 0) {
                fastestEl.innerText = state.buzzerQueue[0].playerName;
            } else {
                fastestEl.innerText = 'なし';
            }

            const sortedScores = Object.entries(state.scores || {}).sort((a, b) => b[1] - a[1]);
            if (sortedScores.length > 0) {
                allScoresEl.innerHTML = sortedScores.map(([name, score], idx) => `${idx + 1}位: ${name} (${score}pt)`).join(' / ');
            } else {
                allScoresEl.innerHTML = 'まだスコアがありません';
            }
        }
    }
});
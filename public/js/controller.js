const socket = io();

function selectMode(mode) { socket.emit('selectMode', mode); }
function startGame() { socket.emit('startGame'); }
function changeVoteMode() { socket.emit('setVoteMode', document.getElementById('vote-mode-select').value); }
function showIpponQuestion() { socket.emit('showQuestionText', document.getElementById('ippon-question-input').value); }
function startVoting() { socket.emit('startVoting'); }
function finishVoting() { socket.emit('finishVoting'); }
function endQuestion() { socket.emit('endQuestion'); }

function addQuestion() {
    const q = document.getElementById('new-q').value;
    const a = document.getElementById('new-a').value;
    if (q && a) {
        socket.emit('addQuestion', { q, a });
        document.getElementById('new-q').value = '';
        document.getElementById('new-a').value = '';
        alert('問題を追加しました！');
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
            document.getElementById('ippon-controls').style.display = 'block';
            document.getElementById('buzzer-controls').style.display = 'none';
            document.getElementById('vote-mode-select').value = state.voteMode;
        } else {
            document.getElementById('ippon-controls').style.display = 'none';
            document.getElementById('buzzer-controls').style.display = 'block';

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
            const panel = document.getElementById('judgement-panel');
            const queueList = document.getElementById('queue-list');
            if (state.buzzerQueue && state.buzzerQueue.length > 0) {
                panel.style.display = 'block';
                queueList.innerHTML = state.buzzerQueue.map((p, i) => `${i + 1}位: ${p.playerName}`).join(' / ');
            } else {
                panel.style.display = 'none';
                queueList.innerHTML = '';
            }
        }
    }
});
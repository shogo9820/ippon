const socket = io();

function selectMode(mode) { socket.emit('selectMode', mode); }
function startGame() { socket.emit('startGame'); }
function changeVoteMode() { socket.emit('setVoteMode', document.getElementById('vote-mode-select').value); }
function showQuestion() { socket.emit('showQuestion', document.getElementById('question-input').value); }
function startVoting() { socket.emit('startVoting'); }
function finishVoting() { socket.emit('finishVoting'); }
function endQuestion() { socket.emit('endQuestion'); }
function resetBuzzer() { socket.emit('resetBuzzer'); }

function requestRanking() {
    if (confirm('ゲームを終了してプロジェクターにランキングを表示しますか？')) {
        socket.emit('requestRanking');
    }
}

function restartGame() {
    socket.emit('restartGame');
}

function resetGame() {
    if (confirm('タイトル画面に戻りますか？')) {
        socket.emit('resetGame');
    }
}

socket.on('updateState', (state) => {
    const setupSection = document.getElementById('setup-section');
    const recruitSection = document.getElementById('recruit-section');
    const playSection = document.getElementById('play-section');
    const rankingSection = document.getElementById('ranking-section');
    const ipponControls = document.getElementById('ippon-controls');
    const buzzerControls = document.getElementById('buzzer-controls');

    setupSection.style.display = 'none';
    recruitSection.style.display = 'none';
    playSection.style.display = 'none';
    if (rankingSection) rankingSection.style.display = 'none';

    if (state.phase === 'setup') {
        setupSection.style.display = 'block';
    } else if (state.phase === 'recruiting') {
        recruitSection.style.display = 'block';
    } else if (state.phase === 'playing') {
        playSection.style.display = 'block';
        if (state.mode === 'ippon') {
            ipponControls.style.display = 'block';
            buzzerControls.style.display = 'none';
        } else {
            ipponControls.style.display = 'none';
            buzzerControls.style.display = 'block';
        }
        document.getElementById('vote-mode-select').value = state.voteMode;
    } else if (state.phase === 'ranking') {
        if (rankingSection) rankingSection.style.display = 'block';
    }
});
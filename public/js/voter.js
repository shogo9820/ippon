const socket = io();
let currentVoteMode = '10-1';

// ページ読み込み時にサーバーへ参加（ログイン）を通知
window.addEventListener('DOMContentLoaded', () => {
    const voterIdInput = document.getElementById('voter-id');
    if (voterIdInput) {
        if (voterIdInput.value) {
            sendJoin(voterIdInput.value);
        }

        // 端末IDが変更されたときにも随時サーバーへ通知
        voterIdInput.addEventListener('input', () => {
            sendJoin(voterIdInput.value);
        });
        voterIdInput.addEventListener('change', () => {
            sendJoin(voterIdInput.value);
        });
    }
});

function sendJoin(name) {
    if (!name) return;
    // サーバーへ「審査員（voter）モードとして参加したよ」と通知
    socket.emit('joinUser', { name: name, role: 'voter' });
}

socket.on('updateState', (state) => {
    currentVoteMode = state.voteMode || '10-1';
    renderButtons();

    // ステータスや投票受付中の判定をここに連動させることも可能
    const statusDiv = document.getElementById('voter-status');
    if (statusDiv && state.status !== 'voting') {
        // 投票タイム以外なら送信完了表示などを調整してもOK
    }
});

function renderButtons() {
    const container = document.getElementById('voting-buttons');
    if (!container) return;
    container.innerHTML = '';

    if (currentVoteMode === '10-1' || currentVoteMode === '2-1') {
        container.innerHTML = `<button class="vote-btn" onclick="sendVote(1)">1点 (〇)</button>`;
    } else if (currentVoteMode === '5-2') {
        container.innerHTML = `
            <button class="vote-btn" onclick="sendVote(0)">0点 (×)</button>
            <button class="vote-btn" onclick="sendVote(1)">1点</button>
            <button class="vote-btn" onclick="sendVote(2)">2点 (〇〇)</button>
        `;
    }
}

function sendVote(points) {
    const voterIdInput = document.getElementById('voter-id');
    const voterId = voterIdInput ? voterIdInput.value.trim() : '';

    if (!voterId) {
        alert('端末ID（名前）を入力してください！');
        if (voterIdInput) voterIdInput.focus();
        return;
    }

    socket.emit('sendVote', { voterId, points });
    
    const statusDiv = document.getElementById('voter-status');
    if (statusDiv) {
        statusDiv.innerText = `${points}票を送信しました`;
        statusDiv.style.color = '#28a745';
    }
}
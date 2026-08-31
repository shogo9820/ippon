const socket = io();
let currentVoteMode = '10-1';

socket.on('updateState', (state) => {
    currentVoteMode = state.voteMode;
    renderButtons();
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
    const voterId = document.getElementById('voter-id').value;
    socket.emit('sendVote', { voterId, points });
    document.getElementById('voter-status').innerText = `${points}票を送信しました`;
}
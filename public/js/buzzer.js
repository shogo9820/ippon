const socket = io();

function pressBuzzer() {
    const playerName = document.getElementById('player-name').value;
    socket.emit('pressBuzzer', { playerName });
}

socket.on('updateState', (state) => {
    const playerName = document.getElementById('player-name').value;
    const scoreSpan = document.getElementById('my-score');
    
    if (state.scores && state.scores[playerName] !== undefined) {
        scoreSpan.innerText = state.scores[playerName];
    } else {
        scoreSpan.innerText = 0;
    }

    if (state.status === 'waiting' || state.status === 'question') {
        const status = document.getElementById('buzzer-status');
        if (status) status.innerText = '';
    }
});

socket.on('buzzerPressed', (queue) => {
    const playerName = document.getElementById('player-name').value;
    const status = document.getElementById('buzzer-status');
    if (status && queue && queue.length > 0) {
        const myIndex = queue.findIndex(p => p.playerName === playerName);
        if (myIndex === 0) {
            status.innerHTML = `<span style="color: #dc3545;">あなたが一番乗りで解答権獲得！</span>`;
        } else if (myIndex > 0) {
            status.innerHTML = `<span style="color: #ffc107;">第 ${myIndex + 1} 位でボタンを押しました</span>`;
        }
    }
});
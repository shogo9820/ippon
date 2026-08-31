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

socket.on('buzzerPressed', (winner) => {
    const status = document.getElementById('buzzer-status');
    if (status) {
        status.innerText = `${winner} が早押しを勝ち取りました！`;
    }
});
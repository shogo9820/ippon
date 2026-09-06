const socket = io();

// ページが読み込まれたとき（または名前が変更されたときなど）にサーバーへ参加を通知する
window.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('player-name');
    if (nameInput) {
        // 名前が入力されていれば初期送信
        if (nameInput.value) {
            sendJoin(nameInput.value);
        }

        // 名前が変更されたら随時サーバーに通知
        nameInput.addEventListener('input', () => {
            sendJoin(nameInput.value);
        });
        nameInput.addEventListener('change', () => {
            sendJoin(nameInput.value);
        });
    }
});

function sendJoin(name) {
    if (!name) return;
    // サーバーへ「早押しプレイヤーとして参加したよ」と通知
    socket.emit('joinUser', { name: name, role: 'buzzer' });
}

// 早押しボタンが押されたときの処理
function pressBuzzer() {
    const nameInput = document.getElementById('player-name');
    const playerName = nameInput ? nameInput.value.trim() : '';
    
    if (!playerName) {
        alert('プレイヤー名を入力してください！');
        if (nameInput) nameInput.focus();
        return;
    }

    // サーバーへ早押しボタンが押されたことを送信
    socket.emit('pressBuzzer', { playerName: playerName });
    
    const statusDiv = document.getElementById('buzzer-status');
    if (statusDiv) {
        statusDiv.innerText = 'ボタンを押しました！';
        statusDiv.style.color = '#ff3333';
    }
}

// サーバーからの状態更新を受け取る
socket.on('updateState', (state) => {
    const statusDiv = document.getElementById('buzzer-status');
    
    // 問題が出ていない、あるいは待機中のときはステータスをリセット
    if (state.status === 'waiting' || state.phase === 'setup' || state.phase === 'recruiting') {
        if (statusDiv && state.phase === 'playing') {
            statusDiv.innerText = '問題をお待ちください...';
            statusDiv.style.color = '#555555';
        }
    }

    // 自分の得点の更新があれば反映
    if (state.scores) {
        const nameInput = document.getElementById('player-name');
        const myName = nameInput ? nameInput.value.trim() : '';
        const myScoreSpan = document.getElementById('my-score');
        if (myScoreSpan && myName && state.scores[myName] !== undefined) {
            myScoreSpan.innerText = state.scores[myName];
        }
    }
});

// 早押し結果の通知（自分が何番目だったかなど）
socket.on('buzzerResult', (data) => {
    const statusDiv = document.getElementById('buzzer-status');
    if (!statusDiv) return;

    if (data.isFastest) {
        statusDiv.innerText = '一番乗り！回答権を獲得しました！';
        statusDiv.style.color = '#2e9e45';
    } else {
        statusDiv.innerText = `${data.rank}番手でした...`;
        statusDiv.style.color = '#555555';
    }
});
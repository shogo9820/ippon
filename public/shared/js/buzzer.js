// public/shared/js/buzzer.js
const socket = io();
let myConfirmedName = "";
let hasLoggedIn = false;

// 💡 画面内のHTML要素を直接生成して差し替える（HTMLを書き換えずにJSだけで綺麗に切り替えます）
window.addEventListener('DOMContentLoaded', () => {
    // 初期状態：名前入力画面を表示
    renderLoginScreen();
});

function renderLoginScreen() {
    const container = document.querySelector('.buzzer-container');
    if (!container) return;
    
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h2 style="font-weight:900; margin-top:0;">🔴 回答者 ログイン</h2>
            <label style="display:block; margin-bottom:8px; font-weight:bold; color:#444; text-align:left;">プレイヤー名：</label>
            <input type="text" id="player-name" placeholder="名前を入力してください" value="プレイヤー">
        </div>
        <button id="login-btn" onclick="submitLogin()" style="width:100%; padding:15px; background:#28a745; color:white; font-size:1.2rem; font-weight:bold; border:none; border-radius:10px; cursor:pointer;">部屋に入る 🚪</button>
        <p id="wait-msg" style="color:#666; font-weight:bold; margin-top:20px; display:none;">MCがゲームを開始するまでお待ちください...</p>
    `;
}

function submitLogin() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
        alert('名前を入力してください！');
        return;
    }
    myConfirmedName = name;
    hasLoggedIn = true;

    // サーバーに「回答者(buzzer)」として参加を通知
    socket.emit('joinUser', { name: name, role: 'buzzer' });

    // 入力フォームを隠して待機状態にする
    if (nameInput) nameInput.disabled = true;
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.style.display = 'none';
    const waitMsg = document.getElementById('wait-msg');
    if (waitMsg) waitMsg.style.display = 'block';
}

function triggerBuzzer() {
    if (!myConfirmedName) return;
    socket.emit('pressBuzzer', { playerName: myConfirmedName });
}

// サーバーからのゲーム状態更新を監視して、手元を「巨大ボタン」へトランスフォームさせる
socket.on('updateState', (state) => {
    if (!hasLoggedIn) return;

    const container = document.querySelector('.buzzer-container');
    if (!container) return;

    // 💡 MCがゲーム開始（playing）を押した瞬間に、手元をデカいボタン画面に切り替える！
    if (state.phase === 'playing') {
        const myScore = (state.scores && state.scores[myConfirmedName] !== undefined) ? state.scores[myConfirmedName] : 0;
        
        let statusText = "出題をお待ちください...";
        let btnDisabled = true;
        let textColor = "#555555";

        if (state.status === 'question') {
            statusText = "📢 ボタンを押せます！";
            btnDisabled = false;
            textColor = "#2e9e45";
        } else if (state.status === 'answered') {
            statusText = "🛑 誰かが回答中です";
            textColor = "#ff3333";
        } else if (state.status === 'correct') {
            statusText = "🎉 正解発表中";
            textColor = "#2e9e45";
        } else if (state.status === 'voting') {
            statusText = "🗳️ 大喜利 投票受付中";
            textColor = "#ffae00";
        }

        container.innerHTML = `
            <div class="score-display">現在のスコア: <span id="my-score">${myScore}</span> pt</div>
            <div id="buzzer-status" class="status-text" style="color: ${textColor};">${statusText}</div>
            <button id="buzzer-btn" onclick="triggerBuzzer()" ${btnDisabled ? 'disabled' : ''}>PUSH</button>
        `;
    } else if (state.phase === 'setup') {
        // 全リセット(setup)がかかったら名前入力に戻す
        hasLoggedIn = false;
        renderLoginScreen();
    }
});

socket.on('buzzerResult', (data) => {
    const statusDiv = document.getElementById('buzzer-status');
    if (!statusDiv) return;
    if (data.isFastest) {
        statusDiv.innerText = "🏆 一番乗り！解答権獲得！";
        statusDiv.style.color = "#2e9e45";
    }
});

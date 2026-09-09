const socket = io();
let myConfirmedName = "";
let hasLoggedIn = false;
let isMyTurn = false; 

window.addEventListener('DOMContentLoaded', () => {
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

    socket.emit('joinUser', { name: name, role: 'buzzer' });

    if (nameInput) nameInput.disabled = true;
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.style.display = 'none';
    const waitMsg = document.getElementById('wait-msg');
    if (waitMsg) waitMsg.style.display = 'block';
}

function triggerBuzzer() {
    if (!myConfirmedName) return;
    
    // 【連打防止】
    const btn = document.getElementById('buzzer-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "送信中...";
    }
    
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
    
    socket.emit('pressBuzzer', { playerName: myConfirmedName });
}

socket.on('updateState', (state) => {
    if (!hasLoggedIn) return;

    const container = document.querySelector('.buzzer-container');
    if (!container) return;

    if (state.phase === 'playing') {
        const myScore = (state.scores && state.scores[myConfirmedName] !== undefined) ? state.scores[myConfirmedName] : 0;
        const currentQuestionText = state.currentQuestion || "（出題をお待ちください）";

        isMyTurn = (state.currentPresenter === myConfirmedName);

        // 💡 自分の番ならランプを点灯させるクラスを付与
        const lampClass = isMyTurn ? "buzzer-lamp lamp-active" : "buzzer-lamp";

        let statusText = "待機中";
        let btnDisabled = true;

        if (isMyTurn) {
            // 💡 ご指示通り、回答権を獲得したときに「解答権の獲得」と表示
            statusText = "解答権の獲得";
            btnDisabled = true;
        } else {
            if (state.status === 'question') {
                statusText = "📢 ボタンを押せます！";
                btnDisabled = false;
            } else if (state.status === 'answered' || state.status === 'voting') {
                statusText = `🛑 ${state.currentPresenter || '誰か'}が回答中です`;
            } else if (state.status === 'correct') {
                statusText = "🎉 正解発表中";
            }
        }

        // 💡 ご指示いただいた通りの純粋な縦並びUI
        container.innerHTML = `
            <!-- ランプ -->
            <div class="${lampClass}"></div>

            <!-- プレイヤー名 -->
            <div style="font-size:1.1rem; font-weight:bold; margin-bottom:15px;">プレイヤー: ${myConfirmedName}</div>

            <!-- 問題文表示欄 -->
            <div style="border:1px solid #dcd6cd; padding:15px; border-radius:10px; margin-bottom:20px; font-size:1.2rem; font-weight:bold; background:#fafafa; color:#1a1a1a;">
                ${currentQuestionText}
            </div>

            <!-- スコア・回答権の有無・ボタン -->
            <div>
                <div class="score-display">現在のスコア: <span id="my-score">${myScore}</span> pt</div>
                <div style="font-size:1.1rem; font-weight:bold; margin-bottom:15px;">回答権の有無: ${statusText}</div>
                <button id="buzzer-btn" onclick="triggerBuzzer()" ${btnDisabled ? 'disabled' : ''}>PUSH</button>
            </div>
        `;
    } else if (state.phase === 'setup') {
        hasLoggedIn = false;
        isMyTurn = false;
        renderLoginScreen();
    }
});

socket.on('buzzerResult', (data) => {
    if (data.isFastest) {
        if (navigator.vibrate) { navigator.vibrate(); } 
    } else {
        if (navigator.vibrate) { navigator.vibrate(300); } 
    }
});

socket.on('initDefaultName', (data) => {
    const idInput = document.getElementById('player-name');
    if (idInput && (idInput.value === "プレイヤー" || idInput.value === "")) {
        idInput.value = data.defaultBuzzerName;
    }
});

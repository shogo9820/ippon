const socket = io();
let myConfirmedName = "";
let hasLoggedIn = false;
let isMyTurn = false; 

window.addEventListener('DOMContentLoaded', () => {
    renderLoginScreen();
});

function renderLoginScreen() {
    // 💡 ログイン画面も「白い箱」をなくすため、全体を覆うように構成します
    const container = document.querySelector('.buzzer-container');
    if (!container) return;
    
    container.innerHTML = `
        <div style="max-width:400px; margin:0 auto; padding-top:40px;">
            <h2 style="font-weight:900; margin-top:0;">🔴 回答者 ログイン</h2>
            <div style="margin-bottom: 20px;">
                <label style="display:block; margin-bottom:8px; font-weight:bold; text-align:left;">プレイヤー名：</label>
                <input type="text" id="player-name" placeholder="名前を入力してください" value="プレイヤー">
            </div>
            <button id="login-btn" onclick="submitLogin()" style="width:100%; padding:15px; background:#28a745; color:white; font-size:1.2rem; font-weight:bold; border:none; border-radius:10px; cursor:pointer;">部屋に入る 🚪</button>
            <p id="wait-msg" style="color:#666; font-weight:bold; margin-top:20px; display:none;">MCがゲームを開始するまでお待ちください...</p>
        </div>
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

        // モードに合わせてPCの大画面用クラス（stage-card）をそのまま適用
        const currentModeClass = (state.mode === 'ippon') ? 'stage-card ippon-mode' : 'stage-card quiz-mode';

        isMyTurn = (state.currentPresenter === myConfirmedName);
        const lampClass = isMyTurn ? "buzzer-lamp lamp-active" : "buzzer-lamp";

        let statusText = "待機中";
        let btnDisabled = true;

        if (isMyTurn) {
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

        // 💡 ご指示の縦並びを、画面いっぱい（幅100%）に配置
        container.innerHTML = `
            <!-- ① ランプ -->
            <div class="${lampClass}"></div>

            <!-- ② プレイヤー名 -->
            <div style="font-size:1.2rem; font-weight:bold; margin-bottom:15px;">${myConfirmedName}</div>

            <!-- ③ 問題文表示欄：PC画面（stage-card）の見た目と完全に一致させた額縁 -->
            <div class="${currentModeClass}">
                <div class="stage-text">${currentQuestionText}</div>
            </div>

            <!-- ④ 下部操作エリア -->
            <div style="max-width:400px; margin:0 auto;">
                <div class="score-display">現在のスコア: <span id="my-score">${myScore}</span> pt</div>
                <div style="font-size:1.1rem; font-weight:bold; margin-bottom:15px;">${statusText}</div>
                <button id="buzzer-btn" onclick="triggerBuzzer()" ${btnDisabled ? 'disabled' : ''}>PUSH</button>
            </div>
        `;
    } else if (state.phase === 'setup') {
        hasLoggedIn = false;
        isMyTurn = false;
        renderLoginScreen();
    }
});

// --- buzzer.js の一番下（または適当な場所）に追記してください ---
socket.on('joinError', (data) => {
    alert(data.message);
    hasLoggedIn = false;
    
    // 入力欄とログインボタンを復活させる
    const nameInput = document.getElementById('player-name');
    if (nameInput) nameInput.disabled = false;
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.style.display = 'block';
    const waitMsg = document.getElementById('wait-msg');
    if (waitMsg) waitMsg.style.display = 'none';
});

const socket = io();
let myConfirmedName = "";
let hasLoggedIn = false;
let isMyTurn = false; // 💡 自分が解答権を持っているかどうかのフラグ

window.addEventListener('DOMContentLoaded', () => {
    renderLoginScreen();
});

function renderLoginScreen() {
    const container = document.querySelector('.buzzer-container');
    if (!container) return;
    
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h2 style="font-weight:900; margin-top:0; color:#ff3333;">🔴 回答者 ログイン</h2>
            <label style="display:block; margin-bottom:8px; font-weight:bold; color:#444; text-align:left;">プレイヤー名：</label>
            <input type="text" id="player-name" placeholder="名前を入力してください" value="プレイヤー">
        </div>
        <button id="login-btn" onclick="submitLogin()" style="width:100%; padding:15px; background:#28a745; color white; font-size:1.2rem; font-weight:bold; border:none; border-radius:10px; cursor:pointer;">部屋に入る 🚪</button>
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
        
        // 💡 サーバー上の「現在の発言者」が自分自身であるかチェック
        isMyTurn = (state.currentPresenter === myConfirmedName);

        // 💡 もし自分の番なら、特別仕様の「あなたが解答権獲得！」画面を全画面に表示
        if (isMyTurn) {
            container.className = "buzzer-container my-turn-flash"; // 特殊な背景アニメーション用のクラス
            container.innerHTML = `
                <div class="score-display">現在のスコア: <span>${myScore}</span> pt</div>
                <div class="turn-announcement">
                    <div class="turn-emoji">👑</div>
                    <h2>あなたの解答権です！</h2>
                    <p class="turn-subtext">思いっきり回答してください！</p>
                </div>
            `;
            return; // 自分の番の演出のときは、下の通常ボタン生成をスキップ
        }

        // --- 以下、自分以外のターン、または待機中の通常表示 ---
        container.className = "buzzer-container"; // クラスを元に戻す
        
        let statusText = "出題をお待ちください...";
        let btnDisabled = true;
        let btnClass = "btn-disabled"; 
        let textColor = "#555555";

        if (state.status === 'question') {
            statusText = "📢 ボタンを押せます！";
            btnDisabled = false;
            btnClass = "btn-ready";
            textColor = "#2e9e45";
        } else if (state.status === 'answered' || state.status === 'voting') {
            // 誰かが押した（自分ではない）状態
            statusText = `🛑 ${state.currentPresenter || '誰か'}が回答中です`;
            btnClass = "btn-locked";
            textColor = "#ff3333";
        } else if (state.status === 'correct') {
            statusText = "🎉 正解発表中";
            textColor = "#2e9e45";
        }

        container.innerHTML = `
            <div class="score-display">現在のスコア: <span id="my-score">${myScore}</span> pt</div>
            <div id="buzzer-status" class="status-text" style="color: ${textColor};">${statusText}</div>
            <button id="buzzer-btn" class="${btnClass}" onclick="triggerBuzzer()" ${btnDisabled ? 'disabled' : ''}>PUSH</button>
        `;
    } else if (state.phase === 'setup') {
        hasLoggedIn = false;
        isMyTurn = false;
        container.className = "buzzer-container";
        renderLoginScreen();
    }
});

// 💡 サーバーから直接早押し合戦の結果が届いた時の処理（念のためのバイブ補強）
socket.on('buzzerResult', (data) => {
    if (data.isFastest) {
        if (navigator.vibrate) {
            // 自分が取れたら「トントントン！」と小気味よく3回振動
            navigator.vibrate([80, 50, 80, 50, 100]);
        }
    } else {
        if (navigator.vibrate) {
            // 競り負けたら「ブーーー」と長めに1回振動
            navigator.vibrate(300);
        }
    }
});

socket.on('initDefaultName', (data) => {
    const idInput = document.getElementById('player-name');
    if (idInput && (idInput.value === "プレイヤー" || idInput.value === "")) {
        idInput.value = data.defaultBuzzerName;
    }
});

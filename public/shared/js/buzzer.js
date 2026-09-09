const socket = io();
let myConfirmedName = "";
let hasLoggedIn = false;
let isMyTurn = false; // 自分が解答権を持っているかどうかのフラグ

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
    
    // 【連打・誤爆防止】押した瞬間にボタンをグレーアウトして即ロック
    const btn = document.getElementById('buzzer-btn');
    if (btn) {
        btn.disabled = true;
        btn.className = "btn-disabled"; 
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
        
        // サーバーから届く現在のお題テキスト（無ければ待機文字）
        const currentQuestionText = state.currentQuestion || "（出題をお待ちください）";

        // 💡 1. サーバー上の「現在の発言者」が自分自身であるかを最優先でチェック
        isMyTurn = (state.currentPresenter === myConfirmedName);

        // 💡 自分の番ならランプをアクティブ（点灯）にする
        const lampClass = isMyTurn ? "buzzer-lamp lamp-active" : "buzzer-lamp";

        // 💡 状態に応じた「回答権の有無」のテキストとボタンの見た目の設定
        let statusText = "待機中";
        let btnDisabled = true;
        let btnClass = "btn-disabled"; 
        let statusColor = "#888888";

        if (isMyTurn) {
            // 💡 解答権を獲得した瞬間
            statusText = "👑 解答権獲得！";
            statusColor = "#ffaa00"; // 華やかなゴールド
            btnDisabled = true;      // 獲得済みのときはボタンは押せなくてOK
            btnClass = "btn-disabled";
        } else {
            // 💡 それ以外の通常のゲームステータス判定
            if (state.status === 'question') {
                statusText = "📢 ボタンを押せます！";
                btnDisabled = false;
                btnClass = "btn-ready";
                statusColor = "#2e9e45";
            } else if (state.status === 'answered' || state.status === 'voting') {
                statusText = `🛑 ${state.currentPresenter || '誰か'}が回答中です`;
                btnClass = "btn-locked";
                statusColor = "#ff3333";
            } else if (state.status === 'correct') {
                statusText = "🎉 正解発表中";
                statusColor = "#2e9e45";
            }
        }

        // 💡【ご指定のUIレイアウト】上から順番に要素を綺麗に配置します
        container.innerHTML = `
            <!-- ① ランプ -->
            <div class="${lampClass}"></div>

            <!-- ② プレイヤー名 -->
            <div class="player-name-display">👤 プレイヤー: <span>${myConfirmedName}</span></div>

            <!-- ③ 問題文表示欄 -->
            <div class="question-board">
                <div class="question-board-title">Q. 問題・お題</div>
                <div class="question-board-text">${currentQuestionText}</div>
            </div>

            <!-- ④ 下部情報・操作エリア -->
            <div class="control-area">
                <div class="score-display">現在のスコア: <span>${myScore}</span> pt</div>
                <div class="status-display" style="color: ${statusColor};">回答権の有無: <strong>${statusText}</strong></div>
                <button id="buzzer-btn" class="${btnClass}" onclick="triggerBuzzer()" ${btnDisabled ? 'disabled' : ''}>PUSH</button>
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

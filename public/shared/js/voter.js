// public/shared/js/voter.js
const socket = io();
let myConfirmedName = "";
let hasLoggedIn = false;

window.addEventListener('DOMContentLoaded', () => {
    renderLoginScreen();
});

function renderLoginScreen() {
    const container = document.querySelector('.voter-box');
    if (!container) return;
    
    container.innerHTML = `
        <h2 style="font-weight:900; margin-top:0;">🗳️ 審査員 ログイン</h2>
        <div style="margin-bottom: 20px;">
            <label style="display:block; margin-bottom:8px; font-weight:bold; font-size:0.9rem; color:#555; text-align:left;">審査員名（端末ID）：</label>
            <input type="text" id="voter-id" placeholder="名前を入力してください" value="審査員A">
        </div>
        <button id="login-btn" onclick="submitLogin()" style="width:100%; padding:15px; background:#ffd400; color:#1a1a1a; font-size:1.2rem; font-weight:bold; border:none; border-radius:10px; cursor:pointer;">部屋に入る 🚪</button>
        <p id="wait-msg" style="color:#666; font-weight:bold; margin-top:20px; display:none;">MCがゲームを開始するまでお待ちください...</p>
    `;
}

function submitLogin() {
    const idInput = document.getElementById('voter-id');
    const name = idInput ? idInput.value.trim() : "";
    if (!name) {
        alert('名前を入力してください！');
        return;
    }
    myConfirmedName = name;
    hasLoggedIn = true;

    // サーバーに「審査員(voter)」として参加を通知
    socket.emit('joinUser', { name: name, role: 'voter' });

    if (idInput) idInput.disabled = true;
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.style.display = 'none';
    const waitMsg = document.getElementById('wait-msg');
    if (waitMsg) waitMsg.style.display = 'block';
}

function submitVote(points) {
    if (!myConfirmedName) return;
    socket.emit('sendVote', { voterId: myConfirmedName, points: points });
    const statusDiv = document.getElementById('voter-status');
    if (statusDiv) statusDiv.innerText = points + " 点を送信しました！";
}

// 💡 本戦が始まったら、手元を審査用の3ボタンパネルへ自動切り替え！
socket.on('updateState', (state) => {
    if (!hasLoggedIn) return;

    const container = document.querySelector('.voter-box');
    if (!container) return;

    if (state.phase === 'playing' && state.mode === 'ippon') {
        // 大喜利モード中のみ投票ボタンを出現させる
        if (!document.getElementById('voting-buttons')) {
            container.innerHTML = `
                <h2>IPPON 審査員パネル</h2>
                <div style="font-size:0.9rem; color:#666; margin-bottom:15px;">ログイン名: ${myConfirmedName}</div>
                <div id="voting-buttons">
                    <button class="vote-btn vote-btn-0" onclick="submitVote(0)">0点 (スルー)</button>
                    <button class="vote-btn" onclick="submitVote(1)">💛 1点 (おもろい)</button>
                    <button class="vote-btn vote-btn-2" onclick="submitVote(2)">🔥 2点 (大爆笑)</button>
                </div>
                <div id="voter-status" class="status">おもろいと思ったらボタンをタップ！</div>
            `;
        }
        
        // お題が新しく切り替わったら、ステータス文字を元に戻す
        if (state.status === 'question') {
            const statusDiv = document.getElementById('voter-status');
            if (statusDiv) statusDiv.innerText = "おもろいと思ったらボタンをタップ！";
        }
    } else if (state.phase === 'setup') {
        hasLoggedIn = false;
        renderLoginScreen();
    }
});

// 💡 サーバーから重ならないおすすめの初期名前を受け取って入力欄にはめ込む
socket.on('initDefaultName', (data) => {
    const idInput = document.getElementById('voter-id');
    // すでに文字を入力し始めていない場合（初期状態の「審査員A」や空っぽの時）だけ上書き
    if (idInput && (idInput.value === "審査員A" || idInput.value === "")) {
        idInput.value = data.defaultVoterName; // 「投票者1」「投票者2」等が入る
    }
});


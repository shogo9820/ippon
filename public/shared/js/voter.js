const socket = io();
let myConfirmedName = "";
let hasLoggedIn = false;
let localTapCount = 0; // 💡 今回の肝：お題毎のボタンタップ回数（0, 1, 2）

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

    socket.emit('joinUser', { name: name, role: 'voter' });

    if (idInput) idInput.disabled = true;
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.style.display = 'none';
    const waitMsg = document.getElementById('wait-msg');
    if (waitMsg) waitMsg.style.display = 'block';
}

// 💡【新方式】ボタンを押すたびにカウントアップして点数をリアルタイムに送る関数
function handleVoteClick() {
    if (!myConfirmedName || localTapCount >= 2) return;

    localTapCount++; // タップ数を増やす（最大2）

    if (navigator.vibrate) {
        navigator.vibrate(60); 
    }

    // サーバーに現在の点数を送信（1回目なら1点、2回目なら2点）
    socket.emit('sendVote', { voterId: myConfirmedName, points: localTapCount });

    // 手元の表示をリアルタイムに変更
    updateVoteButtonUI();
}

// 💡 タップ数に応じてボタンとミニランプの色・テキストをアップデートするUI制御
function updateVoteButtonUI() {
    const btn = document.getElementById('action-vote-btn');
    const lamp = document.getElementById('voter-status-lamp');
    const statusText = document.getElementById('voter-status-text');
    if (!btn || !lamp || !statusText) return;

    if (localTapCount === 1) {
        btn.innerText = "おもろい！ (あと1回押せます)";
        btn.className = "single-vote-btn pts-1";
        lamp.className = "voter-lamp lamp-1";
        statusText.innerText = "現在: 1点送信中 💛";
    } else if (localTapCount === 2) {
        btn.innerText = "満点制限ロック (2点送信済)";
        btn.className = "single-vote-btn pts-2";
        btn.disabled = true; // 2点入ったら物理的にロック
        lamp.className = "voter-lamp lamp-2";
        statusText.innerText = "現在: 2点送信中 🔥 (上限到達)";
    } else {
        // 0点時（初期化状態）
        btn.innerText = "おもろい！";
        btn.className = "single-vote-btn pts-0";
        btn.disabled = false;
        lamp.className = "voter-lamp lamp-0";
        statusText.innerText = "おもろいと思ったらボタンをプッシュ！";
    }
}

socket.on('updateState', (state) => {
    if (!hasLoggedIn) return;

    const container = document.querySelector('.voter-box');
    if (!container) return;

    if (state.phase === 'playing' && state.mode === 'ippon') {
        // 1ボタン式の審査員UIパネルを生成
        if (!document.getElementById('voting-panel-wrapper')) {
            container.innerHTML = `
                <div id="voting-panel-wrapper">
                    <h2>IPPON 審査員パネル</h2>
                    <div style="font-size:0.9rem; color:#666; margin-bottom:15px;">ログイン名: ${myConfirmedName}</div>
                    
                    <!-- タップ状態を視覚化するランプ -->
                    <div id="voter-status-lamp" class="voter-lamp lamp-0"></div>

                    <!-- 統合された1つのプッシュボタン -->
                    <button id="action-vote-btn" class="single-vote-btn pts-0" onclick="handleVoteClick()">おもろい！</button>
                    
                    <div id="voter-status-text" class="status-msg">おもろいと思ったらボタンをプッシュ！</div>
                </div>
            `;
        }
        
        // 💡 MCが次の問題に進めるか、または自動復帰で「question」状態に戻ったらカウントを0クリア！
        if (state.status === 'question' && localTapCount !== 0) {
            localTapCount = 0;
            updateVoteButtonUI();
        }
    } else if (state.phase === 'setup') {
        hasLoggedIn = false;
        localTapCount = 0;
        renderLoginScreen();
    }
});

// 💡【追加】サーバーから重複ログインエラーが返ってきたときの処理
socket.on('joinError', (data) => {
    alert(data.message);
    hasLoggedIn = false;
    
    const idInput = document.getElementById('voter-id');
    if (idInput) idInput.disabled = false;
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.style.display = 'block';
    const waitMsg = document.getElementById('wait-msg');
    if (waitMsg) waitMsg.style.display = 'none';
});

socket.on('initDefaultName', (data) => {
    const idInput = document.getElementById('voter-id');
    if (idInput && (idInput.value === "審査員A" || idInput.value === "")) {
        idInput.value = data.defaultVoterName;
    }
});

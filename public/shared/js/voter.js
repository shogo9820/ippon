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

// --- public/shared/js/voter.js の handleVoteClick 以降を以下に差し替えてください ---

function handleVoteClick() {
    if (!myConfirmedName || localTapCount >= 2) return;

    localTapCount++; 

    if (navigator.vibrate) {
        navigator.vibrate(60); 
    }

    // サーバーに現在の点数を送信（1回目なら1点、2回目なら2点）
    socket.emit('sendVote', { voterId: myConfirmedName, points: localTapCount });

    // 手元の表示をリアルタイムに変更
    // 💡【修正】引数に true を渡して、投票中であることを伝える
    updateVoteButtonUI(true);
}

// 💡【修正】現在投票受付フェーズかどうかのフラグ（isVotingTime）を引数で受け取るように変更
function updateVoteButtonUI(isVotingTime) {
    const btn = document.getElementById('action-vote-btn');
    const lamp = document.getElementById('voter-status-lamp');
    const statusText = document.getElementById('voter-status-text');
    if (!btn || !lamp || !statusText) return;

    // 💡【追加ガード】そもそも今が「投票受付中」じゃないなら、点数に関わらず一律で強制ロック！
    if (!isVotingTime) {
        btn.innerText = "回答者を待っています...";
        btn.className = "single-vote-btn pts-2"; // グレーアウト用の見た目クラスを使い回し
        btn.disabled = true; // 物理ロック
        lamp.className = "voter-lamp lamp-0";
        statusText.innerText = "誰かがボタンを押すまでお待ちください";
        return;
    }

    // 💡 以下は、投票受付中の時のカウントに応じた表示切り替え
    if (localTapCount === 1) {
        btn.innerText = "おもろい！ (あと1回押せます)";
        btn.className = "single-vote-btn pts-1";
        btn.disabled = false; // 1点時はまだ押せる
        lamp.className = "voter-lamp lamp-1";
        statusText.innerText = "現在: 1点送信中 💛";
    } else if (localTapCount === 2) {
        btn.innerText = "満点制限ロック (2点送信済)";
        btn.className = "single-vote-btn pts-2";
        btn.disabled = true; // 2点入ったら物理的にロック
        lamp.className = "voter-lamp lamp-2";
        statusText.innerText = "現在: 2点送信中 🔥 (上限到達)";
    } else {
        // 0点時（投票時間になった直後の初期状態）
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
        
        // 💡【重要：今回の追加制御】
        // サーバーの状態が 'voting'（誰かが回答権を獲得した状態）のときだけ、投票時間を true にする
        const isVotingTime = (state.status === 'voting');

        // 💡 お題が新しく切り替わった、あるいはリセットされて「question」状態に戻ったらカウントを0クリア！
        if (state.status === 'question' && localTapCount !== 0) {
            localTapCount = 0;
        }

        // 💡 サーバーから届いた最新のステータス（投票中か、待機中か）を元にボタンのロックを毎回更新する
        updateVoteButtonUI(isVotingTime);

    } else if (state.phase === 'setup') {
        hasLoggedIn = false;
        localTapCount = 0;
        renderLoginScreen();
    }
});

// 重複ログインエラー処理（既存のまま）
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

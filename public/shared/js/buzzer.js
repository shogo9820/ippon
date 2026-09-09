const socket = io();
let myConfirmedName = "";
let hasLoggedIn = false;
let isMyTurn = false; // 自分が解答権を持っているかどうかのフラグ

window.addEventListener("DOMContentLoaded", () => {
  renderLoginScreen();
});

function renderLoginScreen() {
  const container = document.querySelector(".buzzer-container");
  if (!container) return;

  container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h2 style="font-weight:900; margin-top:0; color:#ff3333;">🔴 回答者 ログイン</h2>
            <label style="display:block; margin-bottom:8px; font-weight:bold; color:#444; text-align:left;">プレイヤー名：</label>
            <!-- 💡 IDは「player-name」になっています -->
            <input type="text" id="player-name" placeholder="名前を入力してください" value="プレイヤー">
        </div>
        <button id="login-btn" onclick="submitLogin()" style="width:100%; padding:15px; background:#28a745; color:white; font-size:1.2rem; font-weight:bold; border:none; border-radius:10px; cursor:pointer;">部屋に入る 🚪</button>
        <p id="wait-msg" style="color:#666; font-weight:bold; margin-top:20px; display:none;">MCがゲームを開始するまでお待ちください...</p>
    `;
}

function submitLogin() {
  const nameInput = document.getElementById("player-name");
  const name = nameInput ? nameInput.value.trim() : "";
  if (!name) {
    alert("名前を入力してください！");
    return;
  }
  myConfirmedName = name;
  hasLoggedIn = true;

  socket.emit("joinUser", { name: name, role: "buzzer" });

  if (nameInput) nameInput.disabled = true;
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) loginBtn.style.display = "none";
  const waitMsg = document.getElementById("wait-msg");
  if (waitMsg) waitMsg.style.display = "block";
}

function triggerBuzzer() {
  if (!myConfirmedName) return;

  // 💡【重要：連打・誤爆防止】
  // タップされた瞬間に、画面上のボタンを即座に「グレーアウト＆クリック不可」にします。
  // これにより、画面切り替え時の一瞬の指の残りで2回目が誤爆するのを物理的に防ぎます。
  const btn = document.getElementById("buzzer-btn");
  if (btn) {
    btn.disabled = true;
    btn.className = "btn-disabled";
    btn.innerText = "送信中...";
  }

  if (navigator.vibrate) {
    navigator.vibrate(100);
  }

  socket.emit("pressBuzzer", { playerName: myConfirmedName });
}

socket.on("updateState", (state) => {
  if (!hasLoggedIn) return;

  const container = document.querySelector(".buzzer-container");
  if (!container) return;

  // 💡 以下、socket.on('updateState', (state) => { ... }) 内の該当部分を差し替え

  if (state.phase === "playing") {
    const myScore =
      state.scores && state.scores[myConfirmedName] !== undefined
        ? state.scores[myConfirmedName]
        : 0;

    // 💡【追加】現在の問題文（お題）を取得。まだ出ていないときは待機メッセージ
    const currentQuestionText =
      state.currentQuestion || "（ＭＣからの出題をお待ちください）";

    // サーバー上の「現在の発言者」が自分自身であるかをチェック
    isMyTurn = state.currentPresenter === myConfirmedName;

    // 💡 自分の番（解答権獲得）の画面
    if (isMyTurn) {
      container.className = "buzzer-container my-turn-flash";
      container.innerHTML = `
                <!-- 💡【追加】画面上部に問題掲示板を設置 -->
                <div class="question-display">
                    <div class="question-tag">Q. 現在の問題・お題</div>
                    <div class="question-text">${currentQuestionText}</div>
                </div>

                <div class="score-display">現在のスコア: <span>${myScore}</span> pt</div>
                <div class="turn-announcement">
                    <div class="turn-emoji">👑</div>
                    <h2>あなたの解答権です！</h2>
                    <p class="turn-subtext">思いっきり回答してください！</p>
                </div>
            `;
      return;
    }

    // --- 💡 以下は、自分「以外」のターン、または問題待機中の通常表示 ---
    container.className = "buzzer-container";

    let statusText = "出題をお待ちください...";
    let btnDisabled = true;
    let btnClass = "btn-disabled";
    let textColor = "#555555";

    if (state.status === "question") {
      statusText = "📢 ボタンを押せます！";
      btnDisabled = false;
      btnClass = "btn-ready";
      textColor = "#2e9e45";
    } else if (state.status === "answered" || state.status === "voting") {
      statusText = `🛑 ${state.currentPresenter || "誰か"}が回答中です`;
      btnClass = "btn-locked";
      textColor = "#ff3333";
    } else if (state.status === "correct") {
      statusText = "🎉 正解発表中";
      textColor = "#2e9e45";
    }

    container.innerHTML = `
            <!-- 💡【追加】画面上部に問題掲示板を設置 -->
            <div class="question-display">
                <div class="question-tag">Q. 現在の問題・お題</div>
                <div class="question-text">${currentQuestionText}</div>
            </div>

            <div class="score-display">現在のスコア: <span id="my-score">${myScore}</span> pt</div>
            <div id="buzzer-status" class="status-text" style="color: ${textColor};">${statusText}</div>
            <button id="buzzer-btn" class="${btnClass}" onclick="triggerBuzzer()" ${btnDisabled ? "disabled" : ""}>PUSH</button>
        `;
  } else if (state.phase === "setup") {
    hasLoggedIn = false;
    isMyTurn = false;
    container.className = "buzzer-container";
    renderLoginScreen();
  }
});

socket.on("buzzerResult", (data) => {
  if (data.isFastest) {
    if (navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    } // 獲得時のピピピッという振動
  } else {
    if (navigator.vibrate) {
      navigator.vibrate(300);
    } // 競り負け時のブーという振動
  }
});

// 💡 【バグ修正完了】
// player-id だった対象要素を、正しいHTMLのID「player-name」に書き換えました。
socket.on("initDefaultName", (data) => {
  const idInput = document.getElementById("player-name");
  if (idInput && (idInput.value === "プレイヤー" || idInput.value === "")) {
    idInput.value = data.defaultBuzzerName; // これで「プレイヤー1」「プレイヤー2」が自動で入ります！
  }
});

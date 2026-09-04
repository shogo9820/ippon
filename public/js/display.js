const socket = io();
let typingTimer = null;

// テーマに応じた色を返す関数（IPPONは黄色、早押しは赤）
function getThemeColor(mode) {
  return mode === "ippon" ? "#ffd400" : "#ff3333";
}

function generateQR(elementId, url, label, mode = "ippon") {
  const themeColor = getThemeColor(mode);
  const container = document.createElement("div");
  container.innerHTML = `<h3 style="color: ${themeColor}; font-size: 1.8rem; margin-bottom: 15px; font-weight: bold;">${label}</h3><div id="${elementId}" style="background: white; padding: 15px; border-radius: 10px;"></div>`;
  document.getElementById("qr-codes").appendChild(container);
  new QRCode(document.getElementById(elementId), {
    text: url,
    width: 250,
    height: 250,
  });
}

function typeWriter(text, elementId, speed = 80) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerText = "";
  let i = 0;
  if (typingTimer) clearInterval(typingTimer);

  typingTimer = setInterval(() => {
    if (i < text.length) {
      el.innerText += text.charAt(i);
      i++;
    } else {
      clearInterval(typingTimer);
    }
  }, speed);
}

// 投票数に応じてカードの最大幅やスケールを調整する処理
function updateIpponCardWidth(votes) {
  const card = document.getElementById("ippon-stage-card");
  if (!card) return;

  const totalVotes = Object.keys(votes || {}).length;
  const maxWidthBase = 1500;
  const shrinkStep = 40;
  const minWidth = 1100;

  const newMaxWidth = Math.max(
    minWidth,
    maxWidthBase - totalVotes * shrinkStep,
  );
  card.style.maxWidth = `${newMaxWidth}px`;

  if (totalVotes > 0) {
    card.style.transform = `scale(${1 - totalVotes * 0.005})`;
  } else {
    card.style.transform = "scale(1)";
  }
}

// ステージのテンプレート生成関数
function createStageHtml(contentHtml, mode = "ippon") {
  const themeClass = mode === "ippon" ? "ippon-theme" : "quiz-theme";

  return `
        <div id="ippon-stage-card" class="stage-card ${themeClass}">
            <div class="stage-inner-content" style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%;">
                ${contentHtml}
            </div>
        </div>
    `;
}

// 画面の描画を共通で行う関数
function renderScreen(state) {
  const qrContainer = document.getElementById("qr-container");
  const displayContainer = document.getElementById("display-container");

  const displayBody = document.querySelector(".display-body") || document.body;
  if (state.phase === "playing" || state.phase === "ranking") {
    displayBody.style.backgroundColor = "#000000";
    displayBody.style.margin = "0";
    displayBody.style.padding = "20px";
    displayBody.style.overflow = "hidden";
  }

  const qrMessage = document.getElementById("qr-message");
  if (qrMessage) {
    qrMessage.style.color = getThemeColor(state.mode);
    qrMessage.style.fontSize = "3rem";
    qrMessage.style.fontWeight = "bold";
    qrMessage.style.marginBottom = "20px";
  }

  if (state.phase === "setup") {
    displayContainer.style.display = "none";
    qrContainer.style.display = "block";
    document.getElementById("qr-codes").innerHTML = "";
    qrMessage.innerText = "制御用QRコード";
    generateQR(
      "qr-controller",
      `${state.baseUrl}/controller.html`,
      "制御用",
      state.mode,
    );
  } else if (state.phase === "recruiting") {
    displayContainer.style.display = "none";
    qrContainer.style.display = "block";
    document.getElementById("qr-codes").innerHTML = "";
    qrMessage.innerText =
      state.mode === "ippon"
        ? "IPPONグランプリ 参加者用QRコード"
        : "早押しクイズ 参加者用QRコード";

    generateQR(
      "qr-buzzer",
      `${state.baseUrl}/buzzer.html`,
      "早押し用",
      state.mode,
    );
    if (state.mode === "ippon") {
      generateQR(
        "qr-voter",
        `${state.baseUrl}/voter.html`,
        "審査員用",
        state.mode,
      );
    }
  } else if (state.phase === "playing") {
    qrContainer.style.display = "none";
    displayContainer.style.display = "block";

    const title = document.getElementById("main-title");
    if (title) title.innerText = "";

    const content = document.getElementById("content-area");
    const effect = document.getElementById("effect-area");
    if (effect) effect.innerHTML = "";

    if (state.mode === "ippon") {
      // --- IPPONグランプリモードの表示制御 ---
      if (state.status === "waiting") {
        const inner = `<div style="font-size: 4rem; font-weight: 900; color: #000000;">次の問題をお待ちください</div>`;
        content.innerHTML = createStageHtml(inner, "ippon");
      } else if (state.status === "result") {
        let totalPoints = Object.values(state.votes || {}).reduce(
          (a, b) => a + b,
          0,
        );
        let inner = `
                    <div style="font-size: 5rem; font-weight: 900; color: #000000;">合計得点: ${totalPoints} 票</div>
                `;
        content.innerHTML = createStageHtml(inner, "ippon");
        updateIpponCardWidth(state.votes);
        if (totalPoints >= 5 && effect)
          effect.innerHTML = '<h1 class="ippon-flash">一本！！</h1>';
      } else if (state.status === "answered" || (state.buzzerQueue && state.buzzerQueue.length > 0) || state.status === "voting") {
        // 早押しされて解答権を取った状態、または投票中の状態
        if (typingTimer) clearInterval(typingTimer);
        const fastest = state.buzzerQueue && state.buzzerQueue.length > 0 ? state.buzzerQueue[0].playerName : (state.currentPresenter || '');

        let inner = `
          <div style="font-size: 2.5rem; color: #333333; margin-bottom: 20px; font-weight: bold;">お題: ${state.currentQuestion || ''}</div>
          <div style="font-size: 5.5rem; font-weight: 900; color: #000000;">${fastest} さん</div>
        `;
        if (state.buzzerQueue && state.buzzerQueue.length > 1) {
          inner += `<div style="font-size: 1.8rem; margin-top: 30px; color: #555555;">2位以降: ${state.buzzerQueue
            .slice(1)
            .map((p) => p.playerName)
            .join(", ")}</div>`;
        }
        content.innerHTML = createStageHtml(inner, "ippon");
        updateIpponCardWidth(state.votes);
      } else {
        // 出題中（問題文をタイピング表示）
        let inner = `<div id="typing-text" class="stage-text"></div>`;
        content.innerHTML = createStageHtml(inner, "ippon");
        updateIpponCardWidth(state.votes);
        if (state.status === "question" && state.currentQuestion) {
          typeWriter(state.currentQuestion, "typing-text", 100);
        } else {
          let waitInner = `<div class="stage-text">問題準備中...</div>`;
          content.innerHTML = createStageHtml(waitInner, "ippon");
        }
      }
    } else if (state.mode === "buzzer") {
      // --- 早押しクイズモードの表示制御 ---
      if (state.status === "result") {
        let inner = `
          <div style="font-size: 3rem; font-weight: bold; color: #2e9e45; margin-bottom: 20px;">正解！得点加算！</div>
          <div style="font-size: 2.2rem; color: #333333; margin-bottom: 10px;">問題: ${state.currentQuestion || ''}</div>
          <div style="font-size: 3.5rem; font-weight: 900; color: #ff3333;">答え: ${state.currentAnswer || ''}</div>
        `;
        content.innerHTML = createStageHtml(inner, "buzzer");
      } else if (state.status === "answered" || (state.buzzerQueue && state.buzzerQueue.length > 0)) {
        if (typingTimer) clearInterval(typingTimer);
        const fastest = state.buzzerQueue && state.buzzerQueue.length > 0 ? state.buzzerQueue[0].playerName : '';

        let inner = `
                    <div style="font-size: 2.5rem; color: #ff3333; margin-bottom: 20px; font-weight: bold;">回答権獲得！</div>
                    <div style="font-size: 5.5rem; font-weight: 900; color: #000000;">${fastest} さん</div>
                `;
        if (state.buzzerQueue && state.buzzerQueue.length > 1) {
          inner += `<div style="font-size: 1.8rem; margin-top: 30px; color: #555555;">2位以降: ${state.buzzerQueue
            .slice(1)
            .map((p) => p.playerName)
            .join(", ")}</div>`;
        }
        content.innerHTML = createStageHtml(inner, "buzzer");
      } else {
        let inner = `<div id="typing-text" class="stage-text"></div>`;
        content.innerHTML = createStageHtml(inner, "buzzer");
        if (state.status === "question" && state.currentQuestion) {
          typeWriter(state.currentQuestion, "typing-text", 100);
        } else {
          let waitInner = `<div class="stage-text">問題準備中...</div>`;
          content.innerHTML = createStageHtml(waitInner, "buzzer");
        }
      }
    }
  } else if (state.phase === "ranking") {
    qrContainer.style.display = "none";
    displayContainer.style.display = "block";

    const content = document.getElementById("content-area");
    if (content) {
      let scoreHtml = `<ul style="list-style: none; padding: 0; margin: 0; width: 100%;">`;
      const sorted = Object.entries(state.scores || {}).sort(
        (a, b) => b[1] - a[1],
      );
      if (sorted.length === 0) {
        scoreHtml +=
          '<li style="font-size: 3rem; font-weight: 900; color: #000;">得点記録なし</li>';
      } else {
        sorted.forEach(([name, score], idx) => {
          scoreHtml += `<li style="margin: 20px 0; font-size: 3rem; font-weight: 900; color: #000;">第 ${idx + 1} 位： ${name} （ ${score} ポイント）</li>`;
        });
      }
      scoreHtml += `</ul>`;
      content.innerHTML = createStageHtml(scoreHtml, "buzzer");
    }
  }
}

// サーバーからの状態変更を受け取る
socket.on("updateState", (state) => {
  window.lastState = state; // 現在の状態を保持
  renderScreen(state);
});

socket.on("updateVotes", (votes) => {
  updateIpponCardWidth(votes);
});

// 早押しボタンが押された瞬間のイベントをキャッチして即座に画面を更新する
socket.on("buzzerPressed", (queue) => {
  if (window.lastState) {
    window.lastState.buzzerQueue = queue;
    window.lastState.status = 'answered'; // 即座に解答権状態に更新
    renderScreen(window.lastState);
  }
});

// サーバーから送られてくるログインメンバーリストを処理して画面に表示
socket.on('updateUserList', (users) => {
    const loginListContainer = document.getElementById('login-users-list');
    if (!loginListContainer) return;

    if (!users || users.length === 0) {
        loginListContainer.innerHTML = '<p style="color: #aaa;">まだ誰もログインしていません...</p>';
    } else {
        loginListContainer.innerHTML = `
            <p style="font-weight: bold; margin-bottom: 15px; font-size: 1.8rem;">ログイン完了メンバー (${users.length}人)</p>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; max-width: 1000px; margin: 0 auto;">
                ${users.map(u => `
                    <span style="background: rgba(255, 255, 255, 0.15); border: 2px solid ${u.role === 'buzzer' ? '#ff3333' : '#ffd400'}; padding: 8px 20px; border-radius: 30px; font-size: 1.3rem;">
                        ${u.name} <span style="font-size: 0.9rem; opacity: 0.8; margin-left: 5px;">(${u.role === 'buzzer' ? '早押し' : '審査員'})</span>
                    </span>
                `).join('')}
            </div>
        `;
    }
});
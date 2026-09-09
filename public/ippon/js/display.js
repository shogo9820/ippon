// public/ippon/js/display.js
const socket = io();
let typingTimer = null;
let lastDisplayedQuestion = ""; 

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

// --- public/ippon/js/display.js の updateIpponCardFramework を差し替え ---

// --- public/ippon/js/display.js の updateIpponCardFramework を極太版に差し替え ---

// --- public/ippon/js/display.js の updateIpponCardFramework を以下に丸ごと差し替え ---

function updateIpponCardFramework(votes, currentVotersCount = 5) {
  const card = document.getElementById("ippon-stage-card");
  const effect = document.getElementById("effect-area");
  if (!card) return;

  // 1. 現在の「合計得点（票数）」を算出
  const totalVotes = Object.values(votes || {}).reduce((a, b) => a + b, 0);
  
  // 【満票 ＝ 投票者 * 2】
  const maxPossiblePoints = currentVotersCount * 2;

  // 🔥 【満票（IPPON）に達した瞬間】
  if (totalVotes >= maxPossiblePoints && maxPossiblePoints > 0) {
      card.style.background = "#ffcc00"; // 一面ゴールド
      // 既存の枠を全て消去
      const oldContainers = card.querySelectorAll('.ippon-framework-container');
      oldContainers.forEach(el => el.remove());
      
      if (effect) {
          effect.innerHTML = '<div class="ippon-gold-box">IPPON</div>';
      }
      return;
  } else {
      if (effect) effect.innerHTML = "";
  }

  // 2. 💡【新方式】カードの内側に、満票数に応じた入れ子（マトリョーシカ状）の枠線ブロックを生成する
  // 既に生成済みの枠がなければ、1回だけ枠の土台を綺麗に組み立てる
  let frameworkContainer = card.querySelector('.ippon-framework-container');
  if (!frameworkContainer) {
      // 古い枠があれば念のため削除
      const oldContainers = card.querySelectorAll('.ippon-framework-container');
      oldContainers.forEach(el => el.remove());

      // 一番外側のコンテナ
      frameworkContainer = document.createElement('div');
      frameworkContainer.className = 'ippon-framework-container';
      card.appendChild(frameworkContainer);

      let currentParent = frameworkContainer;
      
      // 満票の数だけ、内側へ内側へと「入れ子構造」の箱を作っていく
      for (let i = 0; i < maxPossiblePoints; i++) {
          const frameBox = document.createElement('div');
          frameBox.className = `ippon-nest-frame frame-index-${i}`;
          
          currentParent.appendChild(frameBox);
          currentParent = frameBox; // 次のループではこの箱の内側にさらに箱を作る
      }
  }

  // 3. 💡【重要】現在の合計票数（totalVotes）に応じて、外側の箱から順番に「点灯クラス（active）」を付与する
  // 外側（インデックスが小さい箱）から色が変わっていきます
  for (let i = 0; i < maxPossiblePoints; i++) {
      const targetFrame = card.querySelector(`.frame-index-${i}`);
      if (targetFrame) {
          if (i < totalVotes) {
              targetFrame.classList.add('active'); // 票が入ったので極太ゴールド化
          } else {
              targetFrame.classList.remove('active'); // まだ票が入っていないので黒枠
          }
      }
  }
}

socket.on('responseIpponQR', (data) => {
  const content = document.getElementById("content-area");
  if (!content) return;
  const card = document.getElementById("ippon-stage-card");
  if (card) { card.classList.remove("black-out"); card.style.boxShadow = ""; }

  content.innerHTML = '<div style="display:flex; justify-content:center; gap:40px;">' +
               '<div><h3 style="color:#000; font-size:1.5rem; font-weight:900; margin-bottom:10px;">🔴回答者用</h3><img src="' + data.buzzerQR + '" style="width:220px; height:220px; background:white; padding:10px; border-radius:8px; display:block;"></div>' +
               '<div><h3 style="color:#000; font-size:1.5rem; font-weight:900; margin-bottom:10px;">🗳️審査員用</h3><img src="' + data.voterQR + '" style="width:220px; height:220px; background:white; padding:10px; border-radius:8px; display:block;"></div>' +
               '</div>';
});

socket.on("updateState", (state) => {
  if (state.phase === "setup") { window.location.href = "/index.html"; return; }

  const card = document.getElementById("ippon-stage-card");
  const content = document.getElementById("content-area");
  const effect = document.getElementById("effect-area");
  
  if (!card || !content) return;
  if (effect) effect.innerHTML = "";

  if (state.phase === "setup" || state.phase === "recruiting") {
    content.innerHTML = '<div class="stage-text">QRコード生成中...</div>';
    socket.emit('requestQR', 'ippon');
    return;
  }

// --- public/ippon/js/display.js の 72行目〜125行目付近（playingブロック）を以下に丸ごと差し替え ---

  if (state.phase === "playing") {
    const totalVotersCount = (state.connectedUsers || []).filter(u => u.role === 'voter').length || 3; 
    const maxPossibleVotes = totalVotersCount * 2; 
    const currentTotalVotes = Object.values(state.votes || {}).reduce((a, b) => a + b, 0);

    // 📭 1. 待機中
    if (state.status === "waiting") {
      card.classList.remove("black-out");
      content.innerHTML = '<div class="stage-text">次の問題をお待ちください</div>';
      updateIpponCardFramework({});
      
    // 📝 2. 出題中（問題文タイピング）
    } else if (state.status === "question" && state.currentQuestion) {
      card.classList.remove("black-out");
      updateIpponCardFramework({});

      if (state.currentQuestion !== lastDisplayedQuestion) {
        content.innerHTML = '<div id="typing-text" class="stage-text"></div>';
        typeWriter(state.currentQuestion, "typing-text", 80);
        lastDisplayedQuestion = state.currentQuestion;
      } else {
        if (typingTimer) clearInterval(typingTimer);
        content.innerHTML = '<div class="stage-text">' + state.currentQuestion + '</div>';
      }
      
    // 🗳️ 3. 回答権獲得・投票中・および「一本発生の瞬間（resultかつ満票）」
// --- public/ippon/js/display.js 内の該当箇所を修正 ---

    } else if (state.status === "voting" || state.currentPresenter || state.status === "result") {
      if (typingTimer) clearInterval(typingTimer);
      const fastest = state.currentPresenter || "回答者";
      
      // 現在の合計得点（票数）と満票を算出
      const currentTotalVotes = Object.values(state.votes || {}).reduce((a, b) => a + b, 0);
      const maxPossiblePoints = totalVotersCount * 2;

      // 💡 票 ＝ 満票 になった瞬間はブラックアウト（黒背景）を解除して黄金と一体化
      if (currentTotalVotes >= maxPossiblePoints) {
          card.classList.remove("black-out");
          content.innerHTML = ''; // 満票で中央の長方形が埋まったら名前の文字を消す
      } else {
          card.classList.add("black-out");
          // 💡 満票に達するまでは、真ん中の開いている長方形部分にずっと名前を表示し続ける！
          content.innerHTML = '<div class="presenter-text">' + fastest + ' さん</div>';
      }
      
      // 現在の投票データと、ログイン中の審査員人数をそのまま渡して演出発動
      updateIpponCardFramework(state.votes, totalVotersCount);
        
    // 📊 4. 一本にならずに司会者が手動で打ち切ったとき（純粋な結果発表）
    } else if (state.status === "result") {
      card.classList.remove("black-out");
      const totalPoints = Object.values(state.votes || {}).reduce((a, b) => a + b, 0);

      var resultHtml = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:40px; width:100%; height:100%; text-align:center;">' +
                       '<div class="stage-text" style="font-size:3.2rem; color:#000;">' + (state.currentQuestion || "") + '</div>' +
                       '<div style="font-size: 4.8rem; font-weight: 900; color: #ff3333; background:rgba(0,0,0,0.05); padding:15px 50px; border-radius:12px; border:4px solid #ff3333; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">合計得点: ' + totalPoints + ' 票</div>' +
                       '</div>';
      content.innerHTML = resultHtml;
      updateIpponCardFramework(state.votes, totalVotersCount);
    }
  }
});

socket.on("updateVotes", (votes) => {
    const card = document.getElementById("ippon-stage-card");
    // 💡 サーバーから直接票の更新（updateVotes）が来たら、状態に関わらず枠を即座に増殖させる！
    if(card) {
        updateIpponCardFramework(votes);
    }
});

// // --- public/ippon/js/display.js の一番下（テストボタン部分）を完全修正 ---

// window.addEventListener('DOMContentLoaded', () => {
//   const testBtn = document.createElement('button');
//   testBtn.innerText = "⚡ 本番通信テスト開始（審査員5人×2点）";
//   testBtn.style.position = 'fixed';
//   testBtn.style.top = '10px';
//   testBtn.style.left = '10px';
//   testBtn.style.zIndex = '9999';
//   testBtn.style.padding = '8px 12px';
//   testBtn.style.background = '#007bff'; // 💡 通信テストだと分かりやすいよう「青色」に変更
//   testBtn.style.color = '#fff';
//   testBtn.style.border = 'none';
//   testBtn.style.borderRadius = '4px';
//   testBtn.style.cursor = 'pointer';
//   testBtn.style.fontWeight = 'bold';
//   testBtn.style.opacity = '0.3'; 
//   testBtn.onmouseover = () => testBtn.style.opacity = '1';
//   testBtn.onmouseout = () => testBtn.style.opacity = '0.3';
  
//   document.body.appendChild(testBtn);

//   testBtn.addEventListener('click', async () => {
//     testBtn.disabled = true;
//     testBtn.innerText = "⏳ サーバー通信中...";

//     console.log("【通信テスト】本番と同じ信号をサーバーに送信します...");

//     // 💡 1. 実際のスマホがログインした時と100%同じ信号をサーバーへ送る
//     socket.emit('joinUser', { name: 'テスト審査員1', role: 'voter' });
//     socket.emit('joinUser', { name: 'テスト審査員2', role: 'voter' });
//     socket.emit('joinUser', { name: 'テスト審査員3', role: 'voter' });
//     socket.emit('joinUser', { name: 'テスト審査員4', role: 'voter' });
//     socket.emit('joinUser', { name: 'テスト審査員5', role: 'voter' });

//     // 💡 サーバーがログインを処理して、テレビ画面の「totalVotersCount」が5人になるのを少し待つ
//     await new Promise(resolve => setTimeout(resolve, 500));

//     // 💡 2. 本番と同じ、1.5秒刻みでスマホから「2点」のボタンがタップされた信号だけをサーバーへ送る
//     const steps = [
//       { id: 'テスト審査員1', pts: 2 },
//       { id: 'テスト審査員2', pts: 2 },
//       { id: 'テスト審査員3', pts: 2 },
//       { id: 'テスト審査員4', pts: 2 },
//       { id: 'テスト審査員5', pts: 1 }
//     ];

//     for (let i = 0; i < steps.length; i++) {
//       console.log(`【通信テスト】${steps[i].id} からサーバーへ [${steps[i].pts}点] の信号を送信`);
      
//       // 🔥 画面の書き換え処理などは一切行わず、サーバー（server.js）へ信号を飛ばすだけ！
//       socket.emit('sendVote', { voterId: steps[i].id, points: steps[i].pts });
      
//       // 1.5秒待ってから次の人が投票する
//       await new Promise(resolve => setTimeout(resolve, 1500));
//     }

//     // サーバー側の自動リセットが完全に終わる頃にボタンを復活させる
//     setTimeout(() => {
//       testBtn.disabled = false;
//       testBtn.innerText = "⚡ 本番通信テスト開始（審査員5人×2点）";
//     }, 2500);
//   });
// });

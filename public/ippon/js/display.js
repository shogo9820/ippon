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

// --- public/ippon/js/display.js の updateIpponCardFramework を完全修正版に差し替え ---

function updateIpponCardFramework(votes, currentVotersCount = 5) {
  const card = document.getElementById("ippon-stage-card");
  const effect = document.getElementById("effect-area");
  if (!card) return;

  // 💡【完璧な仕様へ】1点なら1枠、2点なら2枠として、現在の「合計得点（票数）」を純粋に累積
  const totalVotes = Object.values(votes || {}).reduce((a, b) => a + b, 0);
  
  // 💡【変数：満票 ＝ 投票者 * 2】の計算
  const maxPossiblePoints = currentVotersCount * 2;

  // 💡【IF 票 ＝ 満票】なら中央の長方形を完全に埋めてIPPONの演出！
  if (totalVotes >= maxPossiblePoints && maxPossiblePoints > 0) {
      // 中央の開いている長方形部分を一瞬で黄金に埋め尽くす（card全体を黄金で覆う）
      card.style.boxShadow = "inset 0 0 0 14px #000000, inset 0 0 0 24px #fff2a3, inset 0 0 0 38px #000000, inset 0 0 0 48px #ffcc00, inset 0 0 0 62px #000000" +
                             ", inset 0 0 0 300vw #ffcc00, inset 0 0 0 300vh #ffcc00";
      
      // 中央に「IPPON」の金色の箱の演出をドカンと出現させる！
      if (effect) {
          effect.innerHTML = '<div class="ippon-gold-box">IPPON</div>';
      }
      return;
  } else {
      // 満票に達していない（1票目 〜 満票-1票目 の間）は演出エリアの箱を消しておく
      if (effect) effect.innerHTML = "";
  }

  // 通常時の黒と黄色のベース額縁デザイン
  let shadowString = "inset 0 0 0 14px #000000, inset 0 0 0 24px #fff2a3, inset 0 0 0 38px #000000, inset 0 0 0 48px #ffcc00, inset 0 0 0 62px #000000";
  
  // 💡 1票、2票……満票の直前まで、現在の合計得点（票数）の分だけ内枠を1枚ずつ綺麗に内側に増殖
  // 💡 どんな人数（4人, 5人, 6人）でも枠の締まり具合が綺麗に収まるよう、人数の最大値に合わせて幅を13pxに調整
  for (let i = 1; i <= totalVotes; i++) {
      let offsetBlack = 62 + (i * 13); 
      let offsetGold = offsetBlack + 5;
      let offsetNextLine = offsetGold + 7;
      
      shadowString += ", inset 0 0 0 " + offsetBlack + "px #ffcc00" +
                      ", inset 0 0 0 " + offsetGold + "px #fff2a3" +
                      ", inset 0 0 0 " + offsetNextLine + "px #000000";
  }
  
  card.style.boxShadow = shadowString;
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

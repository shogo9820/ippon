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

function updateIpponCardFramework(votes, currentVotersCount = 5) {
  const card = document.getElementById("ippon-stage-card");
  const effect = document.getElementById("effect-area");
  if (!card) return;

  // 💡 1点＝1枠、2点＝2枠として、現在の「累積枠数（合計得点）」を純粋に計算
  const totalSlots = Object.values(votes || {}).reduce((a, b) => a + b, 0);
  
  // 💡【5人仕様】：9点（9枠）以上になったら満票（一本）として判定
  if (totalSlots >= 9) {
      // 9枠に達した瞬間に、真ん中にIPPONテキスト入りの黄色い箱をドカンと出現させる！
      if (effect) {
          effect.innerHTML = '<div class="ippon-gold-box">IPPON</div>';
      }
      // 枠自体は最大（9段階目）の状態で固定して一体化させる
      card.style.boxShadow = "inset 0 0 0 14px #000000, inset 0 0 0 24px #fff2a3, inset 0 0 0 38px #000000, inset 0 0 0 48px #ffcc00, inset 0 0 0 62px #000000" +
                             ", inset 0 0 0 300vw #ffcc00, inset 0 0 0 300vh #ffcc00"; // 画面を黄金で満たす
      return;
  }

  // 通常時の黒と黄色のベース額縁
  let shadowString = "inset 0 0 0 14px #000000, inset 0 0 0 24px #fff2a3, inset 0 0 0 38px #000000, inset 0 0 0 48px #ffcc00, inset 0 0 0 62px #000000";
  
  // 💡 1点＝1枠、2点＝2枠として、点数の数（最大8枠まで）だけ綺麗に内枠を1段階ずつ増殖
  for (let i = 1; i <= totalSlots; i++) {
      let offsetBlack = 62 + (i * 18); // 1マス18px刻みで内側に締まっていく
      let offsetGold = offsetBlack + 8;
      let offsetNextLine = offsetGold + 10;
      
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
// --- public/ippon/js/display.js 内の該当ブロックを修正 ---

    } else if (state.status === "voting" || state.currentPresenter || state.status === "result") {
      if (typingTimer) clearInterval(typingTimer);
      const fastest = state.currentPresenter || "回答者";
      
      // 9枠（一本）に達したらブラックアウトを解除して黄金と融合させる
      const currentTotalVotes = Object.values(state.votes || {}).reduce((a, b) => a + b, 0);
      if (currentTotalVotes >= 9) {
          card.classList.remove("black-out");
      } else {
          card.classList.add("black-out");
      }
      
      // 💡 一本になっていない時だけ中央に「〇〇さん」の名前を表示する（一本時はIPPON箱が上書きする）
      if (currentTotalVotes < 9) {
          content.innerHTML = '<div class="presenter-text">' + fastest + ' さん</div>';
      } else {
          content.innerHTML = ''; // 一本時は名前を消して箱を目立たせる
      }
      
      // 枠と中央の箱のリアルタイム演出を発動
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

// --- public/ippon/js/display.js の一番下（テストボタン部分）を以下に差し替え ---

window.addEventListener('DOMContentLoaded', () => {
  const testBtn = document.createElement('button');
  testBtn.innerText = "⚡ 5人自動投票テスト開始（満票10点）";
  testBtn.style.position = 'fixed';
  testBtn.style.top = '10px';
  testBtn.style.left = '10px';
  testBtn.style.zIndex = '9999';
  testBtn.style.padding = '8px 12px';
  testBtn.style.background = '#28a745';
  testBtn.style.color = '#fff';
  testBtn.style.border = 'none';
  testBtn.style.borderRadius = '4px';
  testBtn.style.cursor = 'pointer';
  testBtn.style.fontWeight = 'bold';
  testBtn.style.opacity = '0.3'; 
  testBtn.onmouseover = () => testBtn.style.opacity = '1';
  testBtn.onmouseout = () => testBtn.style.opacity = '0.3';
  
  document.body.appendChild(testBtn);

  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    testBtn.innerText = "⏳ テスト進行中...";

    console.log("【テスト】擬似審査員5人をサーバーにログインさせます...");
    socket.emit('joinUser', { name: '📊 テスト審査員1', role: 'voter' });
    socket.emit('joinUser', { name: '📊 テスト審査員2', role: 'voter' });
    socket.emit('joinUser', { name: '📊 テスト審査員3', role: 'voter' });
    socket.emit('joinUser', { name: '📊 テスト審査員4', role: 'voter' });
    socket.emit('joinUser', { name: '📊 テスト審査員5', role: 'voter' });

    // お題をセット
    socket.emit('showQuestionText', "テスト用の長いお題文章です。スクロール制限のチェックも同時に行えます。");
    
    // サーバーの処理を少し待つ（800ms）
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 解答者がボタンを押した状態にする
    socket.emit('pressBuzzer', { playerName: '🎭 テスト解答者' });

    // 💡 演出がよく見えるよう、テンポを少し早めて「0.6秒（600ms）」刻みでガシャガシャと枠を増やします
    const steps = [
      { id: '📊 テスト審査員1', pts: 2 },
      { id: '📊 テスト審査員2', pts: 2 },
      { id: '📊 テスト審査員3', pts: 2 },
      { id: '📊 テスト審査員4', pts: 2 },
      { id: '📊 テスト審査員5', pts: 2 } // 👈 ここで満票に達し、サーバーの1.8秒タイマーが起動します
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600)); // 600ms刻み
      console.log(`【テスト】${steps[i].id} が ${steps[i].pts}点 を投票`);
      socket.emit('sendVote', { voterId: steps[i].id, points: steps[i].pts });
    }

    // 💡 満票に達した後はテスト側からは一切余計な通信を送らず、サーバーの自動リセット（1.8秒）をただ静かに待つ
    // 💡 サーバーの処理がすべて終わって落ち着いた頃（3秒後）に、テストボタンだけをそっと復活させる
    setTimeout(() => {
      testBtn.disabled = false;
      testBtn.innerText = "⚡ 5人自動投票テスト開始（満票10点）";
      console.log("【テスト】全工程が終了しました。ボタンを再有効化します。");
    }, 3500);
  });
});

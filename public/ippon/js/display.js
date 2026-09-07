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

// 💡 修正：現在のログイン人数から自動で満票を計算して枠を広げる
function updateIpponCardFramework(votes, currentVotersCount = 3) {
  const card = document.getElementById("ippon-stage-card");
  if (!card) return;

  const totalVotes = Object.values(votes || {}).reduce((a, b) => a + b, 0);
  
  // 💡 人数に合わせて満票基準を動的に変える（4人なら8、5人なら10、6人なら12）
  const maxPossibleVotes = currentVotersCount * 2;

  if (totalVotes >= maxPossibleVotes && maxPossibleVotes > 0) {
      // 満票になった瞬間に「画面を埋め尽くす」
      card.classList.add("full-voted");
      return;
  } else {
      // 満票未満ならいつでも枠は元のサイズに戻れる（票の変動に対応）
      card.classList.remove("full-voted");
  }

  // 通常時のベースシャドウ
  let shadowString = "inset 0 0 0 14px #000000, inset 0 0 0 24px #fff2a3, inset 0 0 0 38px #000000, inset 0 0 0 48px #ffcc00, inset 0 0 0 62px #000000";
  
  // 1点ごとに内枠をレイヤー状に追加
  for (let i = 1; i <= totalVotes; i++) {
      let offsetBlack = 62 + (i * 16);
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

  if (state.phase === "playing") {
    const totalVotersCount = (state.connectedUsers || []).filter(u => u.role === 'voter').length || 3; 
    const maxPossibleVotes = totalVotersCount * 2; 
    const currentTotalVotes = Object.values(state.votes || {}).reduce((a, b) => a + b, 0);

    if (state.status === "waiting") {
      card.classList.remove("black-out");
      content.innerHTML = '<div class="stage-text">次の問題をお待ちください</div>';
      updateIpponCardFramework({});
      
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
      
    } else if (state.status === "voting" || state.currentPresenter) {
      if (typingTimer) clearInterval(typingTimer);
      const fastest = state.currentPresenter || "回答者";
      card.classList.add("black-out");
      content.innerHTML = '<div class="presenter-text">' + fastest + ' さん</div>';
      
      // 💡 サーバーから送られてきた正確な審査員人数を枠の計算に渡す
      updateIpponCardFramework(state.votes, totalVotersCount);

      if (currentTotalVotes < maxPossibleVotes && currentTotalVotes > 0) {
          if (effect) {
              effect.innerHTML = '<div class="score-badge-container">' +
                                 '<span class="score-badge-num">' + currentTotalVotes + '</span>' +
                                 '<span class="score-badge-unit">点</span>' +
                                 '</div>';
          }
      }
        
    } else if (state.status === "result") {
      card.classList.remove("black-out");
      const totalPoints = Object.values(state.votes || {}).reduce((a, b) => a + b, 0);
      const maxPossibleVotesResult = totalVotersCount * 2;

      var resultHtml = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:40px; width:100%; height:100%; text-align:center;">' +
                       '<div class="stage-text" style="font-size:3.2rem; color:#000;">' + (state.currentQuestion || "") + '</div>' +
                       '<div style="font-size: 4.8rem; font-weight: 900; color: #ff3333; background:rgba(0,0,0,0.05); padding:15px 50px; border-radius:12px; border:4px solid #ff3333; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">合計得点: ' + totalPoints + ' 票</div>' +
                       '</div>';
      content.innerHTML = resultHtml;
      updateIpponCardFramework(state.votes);
      
      if (totalPoints >= maxPossibleVotesResult && effect) {
        effect.innerHTML = '<h1 class="ippon-flash">一本！！</h1>';
      }
    }
  } else if (state.phase === "ranking") {
    card.classList.remove("black-out");
    updateIpponCardFramework({});
    
    var scoreHtml = '<div style="width:100%;"><h2 style="font-size: 3.5rem; font-weight: 900; color: #000; margin-bottom: 30px; text-decoration: underline #000 6px;">🏆 IPPONグランプリ 得点ランキング</h2><ul style="list-style: none; padding: 0; margin: 0; width: 100%;">';
    var sorted = Object.entries(state.scores || {}).sort(function(a, b) { return b - a; });
    if (sorted.length === 0) {
      scoreHtml += '<li style="font-size: 3rem; font-weight: 900; color: #555; margin-top: 20px;">得点記録がありません</li>';
    } else {
      sorted.forEach(function(item, idx) {
        scoreHtml += '<li style="margin: 25px 0; font-size: 3.2rem; font-weight: 900; color: #000;">第 ' + (idx + 1) + ' 位 ： ' + item + ' （ ' + item + ' ポイント ）</li>';
      });
    }
    scoreHtml += '</ul></div>';
    content.innerHTML = scoreHtml;
  }
});

socket.on("updateVotes", (votes) => {
    const card = document.getElementById("ippon-stage-card");
    // 💡 サーバーから直接票の更新（updateVotes）が来たら、状態に関わらず枠を即座に増殖させる！
    if(card) {
        updateIpponCardFramework(votes);
    }
});

// --- public/ippon/js/display.js の一番下（テストボタン部分）の最新修正版 ---

window.addEventListener('DOMContentLoaded', () => {
  // 画面の左上に目立たないテストボタンを自動生成して配置
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
    // 💡 人数可変テストのため、今回は「5人（満票10点）」のパターンでシミュレートします
    socket.emit('joinUser', { name: '📊 テスト審査員1', role: 'voter' });
    socket.emit('joinUser', { name: '📊 テスト審査員2', role: 'voter' });
    socket.emit('joinUser', { name: '📊 テスト審査員3', role: 'voter' });
    socket.emit('joinUser', { name: '📊 テスト審査員4', role: 'voter' });
    socket.emit('joinUser', { name: '📊 テスト審査員5', role: 'voter' });

    // 司会者がお題を出した状態を強制的に作り出す
    socket.emit('showQuestionText', "テスト用の長いお題文章です。スクロールせずに全行綺麗に表示されているかも確認できます。");
    
    // サーバーが処理するのを少しだけ待つ
    await new Promise(resolve => setTimeout(resolve, 800));
    // 回答者がボタンを押した状態（voting）にする
    socket.emit('pressBuzzer', { playerName: '🎭 テスト解答者' });

    // 💡 1秒ごとに審査員が順番に2点ずつ投票していく流れを完全再現
    const steps = [
      { id: '📊 テスト審査員1', pts: 2 },
      { id: '📊 テスト審査員2', pts: 2 },
      { id: '📊 テスト審査員3', pts: 2 },
      { id: '📊 テスト審査員4', pts: 2 },
      { id: '📊 テスト審査員5', pts: 2 }
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒刻みで枠が増える
      console.log(`【テスト】${steps[i].id} が ${steps[i].pts}点 を投票`);
      
      // 💡 サーバーへ投票データを送信
      socket.emit('sendVote', { voterId: steps[i].id, points: steps[i].pts });
    }

    // すべて終わったら4秒後にボタンを元に戻す
    setTimeout(() => {
      testBtn.disabled = false;
      testBtn.innerText = "⚡ 5人自動投票テスト開始（満票10点）";
    }, 4000);
  });
});

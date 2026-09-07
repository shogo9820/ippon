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

// 💡 修正：新しい完璧なフレームバランスのさらに内側へ、等間隔で綺麗に枠を増殖させる
function updateIpponCardFramework(votes) {
  const card = document.getElementById("ippon-stage-card");
  if (!card) return;

  const totalVotes = Object.values(votes || {}).reduce((a, b) => a + b, 0);
  
  // クイズ画像と100%同じ太さで定義された、初期状態のベースシャドウ
  let shadowString = "inset 0 0 0 14px #000000, inset 0 0 0 24px #fff2a3, inset 0 0 0 38px #000000, inset 0 0 0 48px #ffcc00, inset 0 0 0 62px #000000";
  
  // 1票ごとにこの太いバランスを維持したまま、綺麗に内側にレイヤーペアを追加していく
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
      
      updateIpponCardFramework(state.votes);

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
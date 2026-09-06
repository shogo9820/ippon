// public/quiz/js/display.js
const socket = io();
let typingTimer = null;

function typeWriter(text, elementId, speed = 60) {
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

function createStageHtml(contentHtml) {
  return '<div id="ippon-stage-card" class="stage-card"><div class="stage-inner-content" style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%;">' + contentHtml + '</div></div>';
}

// 💡 サーバーからクイズ募集用の回答者QR画像が届いたときの処理
socket.on('responseQuizQR', (buzzerQR) => {
  const content = document.getElementById("content-area");
  if (!content) return;

  content.innerHTML = '<div>' +
               '<h3 style="color:#ff3333; font-size:1.8rem; font-weight:900; margin-bottom:15px;">🔴 早押しクイズ 回答者用QRコード</h3>' +
               '<div style="background:white; padding:15px; border-radius:10px; display:inline-block;"><img src="' + buzzerQR + '" style="width:250px; height:250px; display:block;"></div>' +
               '</div>';
});

socket.on("updateState", (state) => {
  // 💡【重要】全リセット（setup）がかかったら、PC画面を最初のURL（ポータル）へ確実に強制送還する
  if (state.phase === "setup") {
    window.location.href = "/index.html";
    return;
  }

  const content = document.getElementById("content-area");
  if (!content) return;

  // 1. 参加者募集フェーズ
  if (state.phase === "setup" || state.phase === "recruiting") {
    // 💡【バグ修正】古いモードの残像を消すため、おねだりする前に中身を一旦完全に空っぽにする！
    content.innerHTML = '<div class="stage-text">QRコード生成中...</div>';
    socket.emit('requestQR', 'quiz');
    return;
  }

  // 2. 本番プレイフェーズ
  if (state.phase === "playing") {
    if (state.status === "waiting") {
      content.innerHTML = '<div class="stage-text">次の問題をお待ちください...</div>';
      
    } else if (state.status === "question" && state.currentQuestion) {
      content.innerHTML = '<div id="typing-text" class="stage-text"></div>';
      typeWriter(state.currentQuestion, "typing-text", 60);
      
    } else if (state.status === "answered") {
      if (typingTimer) clearInterval(typingTimer);
      const fastest = state.currentPresenter || "";
      var inner = '<div style="font-size: 2.5rem; color: #ff3333; margin-bottom: 20px; font-weight: bold;">▲ 解答権獲得！</div>' +
                  '<div style="font-size: 5.5rem; font-weight: 900; color: #000000;">' + fastest + ' </div>';
      content.innerHTML = inner;
      
// public/quiz/js/display.js より該当箇所(correct / result時)のみ抜粋して上書き
    } else if (state.status === "correct" || state.status === "result") {
      if (typingTimer) clearInterval(typingTimer);
      const winner = state.currentPresenter || "";
      
      // 💡 ご要望：横並びを廃止し、問題文の「真下」に答えがドカンと中央配置される縦並びレイアウト！
      var inner = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:35px; width:100%; height:100%; text-align:center;">' +
                  '<div style="font-size: 2.5rem; font-weight: 900; color: #2e9e45;">🎉 正解！ （' + winner + ' 得点獲得）</div>' +
                  '<div class="stage-text" style="font-size: 2.8rem; padding: 0 40px; line-height:1.5;">問: ' + (state.currentQuestion || "") + '</div>' +
                  '<div style="font-size: 4.8rem; font-weight: 900; color: #ff3333; background: #fff0f0; padding: 15px 60px; border-radius: 12px; border: 4px dashed #ff3333; box-shadow: 0 10px 30px rgba(255,51,51,0.1);">答: ' + (state.currentAnswer || "") + '</div>' +
                  '</div>';
      content.innerHTML = inner;
    }
  } 
  // 3. ランキングフェーズ
  else if (state.phase === "ranking") {
    if (typingTimer) clearInterval(typingTimer);
    
    var scoreHtml = '<div style="width:100%;"><h2 style="font-size: 3.5rem; font-weight: 900; color: #ff3333; margin-bottom: 30px; text-decoration: underline #ff3333 6px;">🏆 早押しクイズ 得点ランキング</h2><ul style="list-style: none; padding: 0; margin: 0; width: 100%;">';
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

socket.on("updateUserList", (users) => {
  const loginListContainer = document.getElementById("login-users-list");
  if (!loginListContainer) return;

  if (!users || users.length === 0) {
    loginListContainer.innerHTML = '<p style="color: #aaa;">まだ誰もログインしていません...</p>';
  } else {
    const userSpans = (users || []).map(function(u) {
      return '<span style="background: rgba(255, 255, 255, 0.15); border: 2px solid #ff3333; padding: 8px 20px; border-radius: 30px; font-size: 1.3rem; margin: 0 6px; color:#fff;">' + u.name + '</span>';
    }).join("");
    loginListContainer.innerHTML = '<p style="font-weight: bold; margin-bottom: 15px; font-size: 1.8rem; color:#fff;">ログイン完了メンバー (' + users.length + '人)</p><div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; max-width: 1000px; margin: 0 auto;">' + userSpans + '</div>';
  }
});

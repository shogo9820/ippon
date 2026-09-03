const socket = io();
let typingTimer = null;

function generateQR(elementId, url, label) {
    const container = document.createElement('div');
    container.innerHTML = `<h3>${label}</h3><div id="${elementId}" style="background: white; padding: 15px; border-radius: 10px;"></div>`;
    document.getElementById('qr-codes').appendChild(container);
    new QRCode(document.getElementById(elementId), { text: url, width: 250, height: 250 });
}

function typeWriter(text, elementId, speed = 80) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerText = '';
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

// IPPONグランプリの投票数に応じてカードをキュッと狭める処理
function updateIpponCardWidth(votes) {
    const card = document.getElementById('ippon-stage-card');
    if (!card) return;
    
    const totalVotes = Object.keys(votes || {}).length;
    const maxWidthBase = 1500;
    const shrinkStep = 60;
    const minWidth = 800;
    
    const newMaxWidth = Math.max(minWidth, maxWidthBase - (totalVotes * shrinkStep));
    card.style.maxWidth = `${newMaxWidth}px`;

    if (totalVotes > 0) {
        card.style.transform = `scale(${1 - (totalVotes * 0.008)})`;
    } else {
        card.style.transform = 'scale(1)';
    }
}

socket.on('updateState', (state) => {
    const qrContainer = document.getElementById('qr-container');
    const displayContainer = document.getElementById('display-container');

    // 演出画面全体の背景を強制的に黒にする
    const displayBody = document.querySelector('.display-body') || document.body;
    if (state.phase === 'playing' || state.phase === 'ranking') {
        displayBody.style.backgroundColor = '#000000';
    }

    if (state.phase === 'setup') {
        displayContainer.style.display = 'none';
        qrContainer.style.display = 'block';
        document.getElementById('qr-codes').innerHTML = '';
        document.getElementById('qr-message').innerText = '制御用QRコード';
        generateQR('qr-controller', `${state.baseUrl}/controller.html`, '制御用');
    } else if (state.phase === 'recruiting') {
        displayContainer.style.display = 'none';
        qrContainer.style.display = 'block';
        document.getElementById('qr-codes').innerHTML = '';
        document.getElementById('qr-message').innerText = '参加者用QRコード';
        generateQR('qr-buzzer', `${state.baseUrl}/buzzer.html`, '早押し用');
        if (state.mode === 'ippon') {
            generateQR('qr-voter', `${state.baseUrl}/voter.html`, '審査員用');
        }
    } else if (state.phase === 'playing') {
        qrContainer.style.display = 'none';
        displayContainer.style.display = 'block';

        const title = document.getElementById('main-title');
        const content = document.getElementById('content-area');
        const effect = document.getElementById('effect-area');
        effect.innerHTML = '';

        if (state.mode === 'ippon') {
            if (state.status === 'waiting') {
                title.innerText = '待機中';
                content.innerHTML = `
                    <div style="position: relative; width: 94vw; max-width: 1500px; height: 78vh; margin: 0 auto; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #ffd400; color: #000000; clip-path: polygon(110px 0%, calc(100% - 110px) 0%, 100% 110px, 100% calc(100% - 110px), calc(100% - 110px) 100%, 110px 100%, 0% calc(100% - 110px), 0% 110px); box-shadow: inset 0 0 0 14px #000000, inset 0 0 0 24px #ffd400, inset 0 0 0 42px #000000, 0 25px 60px rgba(0,0,0,0.9);">
                        <div style="font-size: 4.2rem; font-weight: 900; line-height: 1.5; color: #000000;">次の問題をお待ちください</div>
                    </div>`;
            } else if (state.status === 'question' || state.status === 'voting') {
                if (typingTimer) clearInterval(typingTimer);
                
                // IPPON：お題＆回答者が決定している場合
                if (state.currentPresenter) {
                    title.innerText = state.status === 'voting' ? '【投票受付中】' : '【回答者】';
                    
                    let html = `<div id="ippon-stage-card" style="position: relative; width: 94vw; max-width: 1500px; height: 78vh; margin: 0 auto; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #ffd400; color: #000000; clip-path: polygon(110px 0%, calc(100% - 110px) 0%, 100% 110px, 100% calc(100% - 110px), calc(100% - 110px) 100%, 110px 100%, 0% calc(100% - 110px), 0% 110px); box-shadow: inset 0 0 0 14px #000000, inset 0 0 0 24px #ffd400, inset 0 0 0 42px #000000, 0 25px 60px rgba(0,0,0,0.9); transition: max-width 0.4s ease, transform 0.3s ease;">`;
                    html += `<div style="font-size: 2.2rem; color: #000; margin-bottom: 20px; font-weight: bold;">お題: ${state.currentQuestion}</div>`;
                    html += `<div style="font-size: 4.8rem; font-weight: 900; color: #000000;">${state.currentPresenter} さん</div>`;
                    html += `</div>`;
                    content.innerHTML = html;

                    updateIpponCardWidth(state.votes);
                } else {
                    // お題提示直後
                    title.innerText = '【お題】';
                    content.innerHTML = `
                        <div id="ippon-stage-card" style="position: relative; width: 94vw; max-width: 1500px; height: 78vh; margin: 0 auto; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #ffd400; color: #000000; clip-path: polygon(110px 0%, calc(100% - 110px) 0%, 100% 110px, 100% calc(100% - 110px), calc(100% - 110px) 100%, 110px 100%, 0% calc(100% - 110px), 0% 110px); box-shadow: inset 0 0 0 14px #000000, inset 0 0 0 24px #ffd400, inset 0 0 0 42px #000000, 0 25px 60px rgba(0,0,0,0.9); transition: max-width 0.4s ease, transform 0.3s ease;">
                            <div style="font-size: 4.2rem; font-weight: 900; line-height: 1.5; color: #000000; word-break: break-all;">${state.currentQuestion}</div>
                        </div>`;
                }
            } else if (state.status === 'result') {
                title.innerText = '【判定結果】';
                let totalPoints = Object.values(state.votes || {}).reduce((a, b) => a + b, 0);
                content.innerHTML = `
                    <div style="position: relative; width: 94vw; max-width: 1500px; height: 78vh; margin: 0 auto; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #ffd400; color: #000000; clip-path: polygon(110px 0%, calc(100% - 110px) 0%, 100% 110px, 100% calc(100% - 110px), calc(100% - 110px) 100%, 110px 100%, 0% calc(100% - 110px), 0% 110px); box-shadow: inset 0 0 0 14px #000000, inset 0 0 0 24px #ffd400, inset 0 0 0 42px #000000, 0 25px 60px rgba(0,0,0,0.9);">
                        <div style="font-size: 4.2rem; font-weight: 900; color: #000000;">合計得点: ${totalPoints} 票</div>
                    </div>`;
                if (totalPoints >= 5) effect.innerHTML = '<h1 class="ippon-flash">一本！！</h1>';
            }
        } else if (state.mode === 'buzzer') {
            title.innerText = '早押しクイズ';

            if (state.status === 'result') {
                content.innerHTML = `
                    <div style="position: relative; width: 94vw; max-width: 1500px; height: 78vh; margin: 0 auto; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #ffffff; color: #000000; clip-path: polygon(110px 0%, calc(100% - 110px) 0%, 100% 110px, 100% calc(100% - 110px), calc(100% - 110px) 100%, 110px 100%, 0% calc(100% - 110px), 0% 110px); box-shadow: inset 0 0 0 14px #ff3333, inset 0 0 0 24px #ffffff, inset 0 0 0 42px #ff3333, 0 25px 60px rgba(0,0,0,0.9);">
                        <div style="font-size: 4.2rem; font-weight: 900; color: #2e9e45;">正解！得点加算！</div>
                    </div>`;
            } else if (state.buzzerQueue && state.buzzerQueue.length > 0) {
                if (typingTimer) clearInterval(typingTimer);
                const fastest = state.buzzerQueue[0].playerName;
                
                let html = `<div style="position: relative; width: 94vw; max-width: 1500px; height: 78vh; margin: 0 auto; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #ffffff; color: #000000; clip-path: polygon(110px 0%, calc(100% - 110px) 0%, 100% 110px, 100% calc(100% - 110px), calc(100% - 110px) 100%, 110px 100%, 0% calc(100% - 110px), 0% 110px); box-shadow: inset 0 0 0 14px #ff3333, inset 0 0 0 24px #ffffff, inset 0 0 0 42px #ff3333, 0 25px 60px rgba(0,0,0,0.9);">`;
                html += `<div style="font-size: 2.2rem; color: #ff3333; margin-bottom: 20px; font-weight: bold;">回答権獲得！</div>`;
                html += `<div style="font-size: 4.8rem; font-weight: 900; color: #000000;">${fastest} さん</div>`;
                
                if (state.buzzerQueue.length > 1) {
                    html += `<div style="font-size: 1.5rem; margin-top: 30px; color: #555555;">2位以降: ${state.buzzerQueue.slice(1).map(p => p.playerName).join(', ')}</div>`;
                }
                html += `</div>`;
                content.innerHTML = html;
            } else {
                content.innerHTML = `
                    <div style="position: relative; width: 94vw; max-width: 1500px; height: 78vh; margin: 0 auto; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #ffffff; color: #000000; clip-path: polygon(110px 0%, calc(100% - 110px) 0%, 100% 110px, 100% calc(100% - 110px), calc(100% - 110px) 100%, 110px 100%, 0% calc(100% - 110px), 0% 110px); box-shadow: inset 0 0 0 14px #ff3333, inset 0 0 0 24px #ffffff, inset 0 0 0 42px #ff3333, 0 25px 60px rgba(0,0,0,0.9);">
                        <div id="typing-text" style="font-size: 4.2rem; font-weight: 900; line-height: 1.5; color: #000000;"></div>
                    </div>`;
                if (state.status === 'question' && state.currentQuestion) {
                    typeWriter(state.currentQuestion, 'typing-text', 100);
                } else {
                    content.innerHTML = `
                        <div style="position: relative; width: 94vw; max-width: 1500px; height: 78vh; margin: 0 auto; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #ffffff; color: #000000; clip-path: polygon(110px 0%, calc(100% - 110px) 0%, 100% 110px, 100% calc(100% - 110px), calc(100% - 110px) 100%, 110px 100%, 0% calc(100% - 110px), 0% 110px); box-shadow: inset 0 0 0 14px #ff3333, inset 0 0 0 24px #ffffff, inset 0 0 0 42px #ff3333, 0 25px 60px rgba(0,0,0,0.9);">
                            <div style="font-size: 4.2rem; font-weight: 900; color: #000000;">問題準備中...</div>
                        </div>`;
                }
            }
        }
    } else if (state.phase === 'ranking') {
        qrContainer.style.display = 'none';
        displayContainer.style.display = 'block';
        document.getElementById('main-title').innerText = '【 最終結果 】';
        
        let scoreHtml = `
            <div style="position: relative; width: 94vw; max-width: 1500px; height: 78vh; margin: 0 auto; padding: 60px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #ffffff; color: #000000; clip-path: polygon(110px 0%, calc(100% - 110px) 0%, 100% 110px, 100% calc(100% - 110px), calc(100% - 110px) 100%, 110px 100%, 0% calc(100% - 110px), 0% 110px); box-shadow: inset 0 0 0 14px #ff3333, inset 0 0 0 24px #ffffff, inset 0 0 0 42px #ff3333, 0 25px 60px rgba(0,0,0,0.9);">
                <ul style="list-style: none; padding: 0; margin: 0; width: 100%;">`;
        
        const sorted = Object.entries(state.scores || {}).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) {
            scoreHtml += '<li style="font-size: 3rem; font-weight: 900; color: #000;">得点記録なし</li>';
        } else {
            sorted.forEach(([name, score], idx) => {
                scoreHtml += `<li style="margin: 15px 0; font-size: 2.5rem; font-weight: 900; color: #000;">第 ${idx + 1} 位： ${name} （ ${score} ポイント）</li>`;
            });
        }
        scoreHtml += '</ul></div>';
        document.getElementById('content-area').innerHTML = scoreHtml;
    }
});

socket.on('updateVotes', (votes) => {
    updateIpponCardWidth(votes);
});

socket.on('buzzerPressed', (queue) => {});
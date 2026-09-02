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

socket.on('updateState', (state) => {
    const qrContainer = document.getElementById('qr-container');
    const displayContainer = document.getElementById('display-container');

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
                title.innerText = '待機中'; content.innerText = '次の問題をお待ちください';
            } else if (state.status === 'question' || state.status === 'voting') {
                title.innerText = state.status === 'question' ? '【お題】' : '【投票中】';
                content.innerText = state.currentQuestion;
            } else if (state.status === 'result') {
                title.innerText = '【判定結果】';
                let totalPoints = Object.values(state.votes).reduce((a, b) => a + b, 0);
                content.innerText = `合計得点: ${totalPoints} 票`;
                if (totalPoints >= 5) effect.innerHTML = '<h1 class="ippon-flash">一本！！</h1>';
            }
        } else if (state.mode === 'buzzer') {
            title.innerText = '早押しクイズ';

            if (state.status === 'result') {
                content.innerHTML = `<div style="font-size: 3rem; color: #28a745;">正解！得点加算！</div>`;
            } else if (state.buzzerQueue && state.buzzerQueue.length > 0) {
                if (typingTimer) clearInterval(typingTimer);
                const fastest = state.buzzerQueue[0].playerName;
                
                let html = `<div style="font-size: 2rem; color: #ffc107; margin-bottom: 20px;">回答権獲得！</div>`;
                html += `<div style="font-size: 4rem; font-weight: bold; color: #dc3545;">${fastest} さん</div>`;
                
                if (state.buzzerQueue.length > 1) {
                    html += `<div style="font-size: 1.5rem; margin-top: 30px; color: #aaa;">2位以降: ${state.buzzerQueue.slice(1).map(p => p.playerName).join(', ')}</div>`;
                }
                content.innerHTML = html;
            } else {
                content.innerHTML = `<div id="typing-text" style="font-size: 3rem; line-height: 1.4;"></div>`;
                if (state.status === 'question' && state.currentQuestion) {
                    typeWriter(state.currentQuestion, 'typing-text', 100);
                } else {
                    content.innerHTML = '問題準備中...';
                }
            }
        }
    } else if (state.phase === 'ranking') {
        qrContainer.style.display = 'none';
        displayContainer.style.display = 'block';
        document.getElementById('main-title').innerText = '【 最終結果 】';
        
        let scoreHtml = '<ul style="list-style: none; padding: 0; font-size: 2rem;">';
        const sorted = Object.entries(state.scores || {}).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) {
            scoreHtml += '<li>得点記録なし</li>';
        } else {
            sorted.forEach(([name, score], idx) => {
                scoreHtml += `<li style="margin: 10px 0;">第 ${idx + 1} 位： ${name} （ ${score} ポイント）</li>`;
            });
        }
        scoreHtml += '</ul>';
        document.getElementById('content-area').innerHTML = scoreHtml;
    }
});

socket.on('buzzerPressed', (queue) => {
    // 必要に応じて演出のトリガーとして使用
});
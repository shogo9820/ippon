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

// 投票数に応じてカードの最大幅やスケールを調整する処理
function updateIpponCardWidth(votes) {
    const card = document.getElementById('ippon-stage-card');
    if (!card) return;
    
    const totalVotes = Object.keys(votes || {}).length;
    const maxWidthBase = 1500;
    const shrinkStep = 40;
    const minWidth = 1100;
    
    const newMaxWidth = Math.max(minWidth, maxWidthBase - (totalVotes * shrinkStep));
    card.style.maxWidth = `${newMaxWidth}px`;

    if (totalVotes > 0) {
        card.style.transform = `scale(${1 - (totalVotes * 0.005)})`;
    } else {
        card.style.transform = 'scale(1)';
    }
}

// ステージのテンプレート生成関数（CSS側で定義したクラスを付与）
function createStageHtml(contentHtml, mode = 'ippon') {
    const themeClass = mode === 'ippon' ? 'ippon-theme' : 'quiz-theme';
    
    return `
        <div id="ippon-stage-card" class="stage-card ${themeClass}">
            <div class="stage-inner-content" style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%;">
                ${contentHtml}
            </div>
        </div>
    `;
}

socket.on('updateState', (state) => {
    const qrContainer = document.getElementById('qr-container');
    const displayContainer = document.getElementById('display-container');

    const displayBody = document.querySelector('.display-body') || document.body;
    if (state.phase === 'playing' || state.phase === 'ranking') {
        displayBody.style.backgroundColor = '#000000';
        displayBody.style.margin = '0';
        displayBody.style.padding = '20px';
        displayBody.style.overflow = 'hidden';
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
        if (title) title.innerText = '';

        const content = document.getElementById('content-area');
        const effect = document.getElementById('effect-area');
        effect.innerHTML = '';

        if (state.mode === 'ippon') {
            if (state.status === 'waiting') {
                const inner = `<div style="font-size: 4rem; font-weight: 900; color: #000000;">次の問題をお待ちください</div>`;
                content.innerHTML = createStageHtml(inner, 'ippon');
            } else if (state.status === 'question' || state.status === 'voting') {
                if (typingTimer) clearInterval(typingTimer);
                
                if (state.currentPresenter) {
                    let inner = `
                        <div style="font-size: 2.5rem; color: #000000; margin-bottom: 20px; font-weight: bold;">お題: ${state.currentQuestion}</div>
                        <div style="font-size: 5.5rem; font-weight: 900; color: #000000;">${state.currentPresenter} さん</div>
                    `;
                    content.innerHTML = createStageHtml(inner, 'ippon');
                    updateIpponCardWidth(state.votes);
                } else {
                    let inner = `
                        <div class="stage-text">${state.currentQuestion}</div>
                    `;
                    content.innerHTML = createStageHtml(inner, 'ippon');
                }
            } else if (state.status === 'result') {
                let totalPoints = Object.values(state.votes || {}).reduce((a, b) => a + b, 0);
                let inner = `
                    <div style="font-size: 5rem; font-weight: 900; color: #000000;">合計得点: ${totalPoints} 票</div>
                `;
                content.innerHTML = createStageHtml(inner, 'ippon');
                if (totalPoints >= 5) effect.innerHTML = '<h1 class="ippon-flash">一本！！</h1>';
            }
        } else if (state.mode === 'buzzer') {
            if (state.status === 'result') {
                let inner = `<div style="font-size: 4.5rem; font-weight: 900; color: #2e9e45;">正解！得点加算！</div>`;
                content.innerHTML = createStageHtml(inner, 'buzzer');
            } else if (state.buzzerQueue && state.buzzerQueue.length > 0) {
                if (typingTimer) clearInterval(typingTimer);
                const fastest = state.buzzerQueue[0].playerName;
                
                let inner = `
                    <div style="font-size: 2.5rem; color: #ff3333; margin-bottom: 20px; font-weight: bold;">回答権獲得！</div>
                    <div style="font-size: 5.5rem; font-weight: 900; color: #000000;">${fastest} さん</div>
                `;
                if (state.buzzerQueue.length > 1) {
                    inner += `<div style="font-size: 1.8rem; margin-top: 30px; color: #555555;">2位以降: ${state.buzzerQueue.slice(1).map(p => p.playerName).join(', ')}</div>`;
                }
                content.innerHTML = createStageHtml(inner, 'buzzer');
            } else {
                let inner = `<div id="typing-text" class="stage-text"></div>`;
                content.innerHTML = createStageHtml(inner, 'buzzer');
                if (state.status === 'question' && state.currentQuestion) {
                    typeWriter(state.currentQuestion, 'typing-text', 100);
                } else {
                    let waitInner = `<div class="stage-text">問題準備中...</div>`;
                    content.innerHTML = createStageHtml(waitInner, 'buzzer');
                }
            }
        }
    } else if (state.phase === 'ranking') {
        qrContainer.style.display = 'none';
        displayContainer.style.display = 'block';
        
        let scoreHtml = `<ul style="list-style: none; padding: 0; margin: 0; width: 100%;">`;
        const sorted = Object.entries(state.scores || {}).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) {
            scoreHtml += '<li style="font-size: 3rem; font-weight: 900; color: #000;">得点記録なし</li>';
        } else {
            sorted.forEach(([name, score], idx) => {
                scoreHtml += `<li style="margin: 20px 0; font-size: 3rem; font-weight: 900; color: #000;">第 ${idx + 1} 位： ${name} （ ${score} ポイント）</li>`;
            });
        }
        scoreHtml += `</ul>`;
        content.innerHTML = createStageHtml(scoreHtml, 'buzzer');
    }
});

socket.on('updateVotes', (votes) => {
    updateIpponCardWidth(votes);
});

socket.on('buzzerPressed', (queue) => {});
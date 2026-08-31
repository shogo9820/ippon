const socket = io();

function generateQR(elementId, url, label) {
    const container = document.createElement('div');
    container.innerHTML = `<h3>${label}</h3><div id="${elementId}" style="background: white; padding: 15px; border-radius: 10px;"></div>`;
    document.getElementById('qr-codes').appendChild(container);
    new QRCode(document.getElementById(elementId), { text: url, width: 250, height: 250 });
}

socket.on('updateState', (state) => {
    const qrContainer = document.getElementById('qr-container');
    const qrCodesDiv = document.getElementById('qr-codes');
    const displayContainer = document.getElementById('display-container');
    const qrMessage = document.getElementById('qr-message');

    if (state.phase === 'setup') {
        displayContainer.style.display = 'none';
        qrContainer.style.display = 'block';
        qrCodesDiv.innerHTML = '';
        qrMessage.innerText = '主催者はスマホで以下のQRを読み取り、制御画面にアクセスしてください';
        generateQR('qr-controller', `${state.baseUrl}/controller.html`, '制御用アクセスQR');

    } else if (state.phase === 'recruiting') {
        displayContainer.style.display = 'none';
        qrContainer.style.display = 'block';
        qrCodesDiv.innerHTML = '';
        qrMessage.innerText = '参加者はスマホでQRを読み取ってください';
        
        generateQR('qr-buzzer', `${state.baseUrl}/buzzer.html`, '回答者 (早押し) 用QR');
        if (state.mode === 'ippon') {
            generateQR('qr-voter', `${state.baseUrl}/voter.html`, '審査員 (投票) 用QR');
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
        } else {
            title.innerText = '早押しクイズ';
            content.innerText = state.buzzerWinner ? `回答権: ${state.buzzerWinner}` : '問題準備中...';
        }
    } else if (state.phase === 'ranking') {
        qrContainer.style.display = 'none';
        displayContainer.style.display = 'block';

        const title = document.getElementById('main-title');
        const content = document.getElementById('content-area');
        const effect = document.getElementById('effect-area');
        effect.innerHTML = '';

        title.innerText = '【 最終結果 ・ ランキング 】';
        
        let scoreHtml = '<ul style="list-style: none; padding: 0; font-size: 2rem;">';
        const sortedScores = Object.entries(state.scores || {}).sort((a, b) => b[1] - a[1]);
        
        if (sortedScores.length === 0) {
            scoreHtml += '<li>記録された得点はありません</li>';
        } else {
            sortedScores.forEach(([name, score], index) => {
                scoreHtml += `<li style="margin: 10px 0;">第 ${index + 1} 位： ${name} （ ${score} ポイント）</li>`;
            });
        }
        scoreHtml += '</ul>';
        content.innerHTML = scoreHtml;
    }
});

socket.on('buzzerPressed', (winnerName) => {
    const content = document.getElementById('content-area');
    if (content) {
        content.innerText = `一番早いボタン: ${winnerName} さん！`;
    }
});
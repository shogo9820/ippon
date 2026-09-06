// public/js/script.js
const socket = io();

// PCのブラウザかスマホ（モバイル）かを判定
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

// 💡 PC大画面の場合のみ、サーバーへ制御スマホ用のQRコード画像をおねだりする
if (!isMobile) {
    socket.emit('requestQR', 'controller');
}

// サーバーから生成されたQR画像データを受け取ってPCの画面にはめ込む
socket.on('responseControllerQR', (qrImageUrl) => {
    const img = document.getElementById('qr-image');
    if (img) img.src = qrImageUrl;
});

// 💡 ボタン操作：モード（大喜利かクイズか）が選ばれたとき
function chooseMode(mode) {
    socket.emit('selectMode', mode);
}

// 💡 ボタン操作：ゲームスタートが押されたとき
function startGame() {
    socket.emit('startGame');
    
    // 手元のスマホ画面をそのまま各モード専用の本番リモコン（controller.html）へ進める！
    const currentMode = window.lastStateMode === 'ippon' ? 'ippon' : 'quiz';
    window.location.href = "/" + currentMode + "/controller.html";
}

// 💡 ボタン操作：モード選択に戻るが押されたとき
function backToMenu() {
    socket.emit('resetGame');
}

// サーバーからのゲーム状態更新を受けてPC画面とスマホ画面を完全連動
socket.on("updateState", (state) => {
    window.lastStateMode = state.mode;

    // 【PC大画面側の処理】モードが選ばれたら自動的に各大喜利/クイズ専用PC画面へリダイレクト！
    if (!isMobile) {
        if (state.phase === "recruiting" || state.phase === "playing" || state.phase === "ranking") {
            if (state.mode === "ippon") { window.location.href = "/ippon/display.html"; return; } 
            else if (state.mode === "buzzer") { window.location.href = "/quiz/display.html"; return; }
        }
    }

    // 【スマホ制御端末側の処理】フェーズに合わせてボタン表示をパチパチ切り替える
    if (state.phase === "setup") {
        if (isMobile) {
            // スマホ初期：2つのモード選択ボタンのみを表示！
            document.getElementById("mobile-menu-container").style.display = "block";
            document.getElementById("mode-select-screen").style.display = "block";
            document.getElementById("game-control-screen").style.display = "none";
            document.getElementById("pc-setup-container").style.display = "none";
        } else {
            // PC初期：QRコード表示画面
            document.getElementById("pc-setup-container").style.display = "block";
            document.getElementById("mobile-menu-container").style.display = "none";
        }
    } else if (state.phase === "recruiting") {
        if (isMobile) {
            // モード選択後：ゲームスタートと戻るボタン ＆ 参加者リストの画面へ切り替え！
            document.getElementById("mobile-menu-container").style.display = "block";
            document.getElementById("mode-select-screen").style.display = "none";
            document.getElementById("game-control-screen").style.display = "block";
            
            const titleEl = document.getElementById("selected-mode-title");
            if (titleEl) {
                titleEl.innerText = state.mode === "ippon" ? "🟨 大喜利モード 準備中" : "🟥 クイズモード 準備中";
                titleEl.style.color = state.mode === "ippon" ? "#ccaa00" : "#ff3333";
            }
        }
    }
});

// 💡 参加者がスマホでログインした名前を、手元のコントロール画面の下へリアルタイム表示！
socket.on("updateUserList", (users) => {
    const listContainer = document.getElementById("ctrl-user-list");
    const countContainer = document.getElementById("current-voters-count");
    if (!listContainer) return;

    // プレイヤー(buzzer)と審査員(voter)のみを抽出
    const filteredUsers = (users || []).filter(u => u.role === 'buzzer' || u.role === 'voter');
    if (countContainer) {
        countContainer.innerText = "👥 ログインした参加者 (" + filteredUsers.length + "人)";
    }

    if (filteredUsers.length === 0) {
        listContainer.innerHTML = '<span style="color:#888; font-size:0.9rem;">まだ誰も参加していません...</span>';
    } else {
        listContainer.innerHTML = filteredUsers.map(function(u) {
            const color = u.role === 'buzzer' ? '#ff3333' : '#ffae00';
            const tag = u.role === 'buzzer' ? '答' : '審';
            return '<span style="background:#eee; color:#1a1a1a; padding:6px 12px; border-radius:20px; font-size:0.9rem; font-weight:bold; border-left:4px solid ' + color + '">' + u.name + ' <small style="color:#777; font-size:0.75rem;">(' + tag + ')</small></span>';
        }).join("");
    }
});

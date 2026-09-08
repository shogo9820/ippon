// --- public/js/script.js 修正完成版 ---
const socket = io();

// 💡 【重要】手動で選んだ役割を記憶するためのフラグ変数
let isMobileHandChosen = false;
let isRoleSelected = false; // 最初の選択が終わったかどうかの目印

// 💡 1. 最初の画面でどちらかを選んだときの処理
function chooseRole(role) {
    isRoleSelected = true;

    if (role === 'pc-display') {
        // 📺 PC（テレビ大画面）として進める場合
        isMobileHandChosen = false;
        
        // 元々のコードと同じく、サーバーへ制御用のQRコード画像をおねだりする
        socket.emit('requestQR', 'controller');
        
        // 画面の表示切り替え（最初の画面を消して、元々あったPCセットアップ用の画面を出す）
        document.getElementById("role-select-screen").style.display = "none";
        document.getElementById("pc-setup-container").style.display = "block";
        document.getElementById("mobile-menu-container").style.display = "none";
        
    } else if (role === 'controller-setup') {
        // 📱 制御スマホ（司会者リモコン）として進める場合
        isMobileHandChosen = true;
        
        // 最初の選択画面を消して、元々あったスマホ初期メニュー（モード選択肢）を出す
        document.getElementById("role-select-screen").style.display = "none";
        document.getElementById("mobile-menu-container").style.display = "block";
        document.getElementById("mode-select-screen").style.display = "block";
        document.getElementById("game-control-screen").style.display = "none";
    }
}

// サーバーから生成されたQR画像データを受け取ってPCの画面にはめ込む（今までと同じ）
socket.on('responseControllerQR', (qrImageUrl) => {
    const img = document.getElementById('qr-image');
    if (img) img.src = qrImageUrl;
});

// ボタン操作：モード（大喜利かクイズか）が選ばれたとき（今までと同じ）
function chooseMode(mode) {
    socket.emit('selectMode', mode);
}

// ボタン操作：ゲームスタートが押されたとき（今までと同じ）
function startGame() {
    socket.emit('startGame');
    const currentMode = window.lastStateMode === 'ippon' ? 'ippon' : 'quiz';
    window.location.href = "/" + currentMode + "/controller.html";
}

// ボタン操作：モード選択に戻るが押されたとき（今までと同じ）
function backToMenu() {
    socket.emit('resetGame');
}

// サーバーからのゲーム状態更新（手動選択に合わせて同期させるよう修正）
socket.on("updateState", (state) => {
    window.lastStateMode = state.mode;

    // 💡 最初の「PCか制御スマホか」の選択がまだ終わっていない場合は、強制的に最初の画面で止めます
    if (!isRoleSelected) {
        document.getElementById("role-select-screen").style.display = "block";
        document.getElementById("pc-setup-container").style.display = "none";
        document.getElementById("mobile-menu-container").style.display = "none";
        return;
    }

    // 【PC大画面側の処理】モードが選ばれたら自動的に各大喜利/クイズ専用PC画面へリダイレクト！（今までと同じ）
    if (!isMobileHandChosen) {
        if (state.phase === "recruiting" || state.phase === "playing" || state.phase === "ranking") {
            if (state.mode === "ippon") { window.location.href = "/ippon/display.html"; return; } 
            else if (state.mode === "buzzer") { window.location.href = "/quiz/display.html"; return; }
        }
    }

    // 【スマホ制御端末側の処理】フェーズに合わせてボタン表示をパチパチ切り替える（今までと同じ）
    if (state.phase === "setup") {
        if (isMobileHandChosen) {
            document.getElementById("mobile-menu-container").style.display = "block";
            document.getElementById("mode-select-screen").style.display = "block";
            document.getElementById("game-control-screen").style.display = "none";
        }
    } else if (state.phase === "recruiting") {
        if (isMobileHandChosen) {
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

// ログイン参加者リスト表示（今までと同じ）
socket.on("updateUserList", (users) => {
    const listContainer = document.getElementById("ctrl-user-list");
    const countContainer = document.getElementById("current-voters-count");
    if (!listContainer) return;

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

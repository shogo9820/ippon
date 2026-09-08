// --- public/js/script.js 完全書き換え版 ---
const socket = io();

// 💡 PWA対応：自動判定による強制リダイレクトを完全に廃止。
// 💡 index.htmlのボタンから、手動で役割（テレビ画面か制御スマホか）を選ばせる仕様に変更！
function chooseRole(role) {
    if (role === 'pc-display') {
        // 🟨 この端末を「PC（テレビ・メイン演出）画面」として進める場合
        // （モードが決定するまでは recruiting フェーズとして各 display.html へ直接リダイレクト）
        socket.emit('selectMode', 'ippon'); // デフォルトで大喜利モードを選択させて即座に進める場合
        window.location.href = "/ippon/display.html";
    } else if (role === 'controller-setup') {
        // 📱 この端末を「制御スマホ（司会者リモコン）」として進める場合
        // モード選択ボタンを画面に出現させる
        document.getElementById("role-select-screen").style.display = "none";
        document.getElementById("mode-select-screen").style.display = "block";
    }
}

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
    // PWAでの操作性を考慮し、役割選択の最初の画面へ綺麗に戻す
    document.getElementById("mode-select-screen").style.display = "none";
    document.getElementById("game-control-screen").style.display = "none";
    document.getElementById("role-select-screen").style.display = "block";
}

// サーバーからのゲーム状態更新を受けて画面の要素をパチパチ切り替える
socket.on("updateState", (state) => {
    window.lastStateMode = state.mode;

    // 💡【バグ防止】自動判定リダイレクトコードは完全に削除されました。
    // これにより、司会者のスマホが勝手にテレビ画面に切り替わってしまう不具合を100%防ぎます。

    if (state.phase === "setup") {
        // 初期状態：役割選択画面を表示
        const roleScreen = document.getElementById("role-select-screen");
        if (roleScreen && roleScreen.style.display !== "none") {
            roleScreen.style.display = "block";
            document.getElementById("mode-select-screen").style.display = "none";
            document.getElementById("game-control-screen").style.display = "none";
        }
    } else if (state.phase === "recruiting") {
        // モード選択後：司会者リモコン側に「ゲームスタート」と「戻る」ボタン ＆ 参加者リストを表示！
        const modeSelect = document.getElementById("mode-select-screen");
        if (modeSelect && modeSelect.style.display === "block") {
            modeSelect.style.display = "none";
            document.getElementById("game-control-screen").style.display = "block";
            
            const titleEl = document.getElementById("selected-mode-title");
            if (titleEl) {
                titleEl.innerText = state.mode === "ippon" ? "🟨 大喜利モード 準備中" : "🟥 クイズモード 準備中";
                titleEl.style.color = state.mode === "ippon" ? "#ccaa00" : "#ff3333";
            }
        }
    }
});

// 参加者がスマホでログインした名前を、手元のコントロール画面の下へリアルタイム表示！
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

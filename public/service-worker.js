// 💡 リアルタイムゲームの同期バグを防ぐため、あえて一切キャッシュをしないクリーンな設定
self.addEventListener('install', function(event) {
  // インストールされたら即座にアクティベート（有効化）する
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(event) {
  // すべての通信をキャッシュからではなく、インターネットのサーバー（Render）から直接引っ張る
  event.respondWith(fetch(event.request));
});

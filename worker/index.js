// worker/index.js
// next-pwa의 customWorker 진입점. 자동 생성된 sw.js 끝에 append됨.
// dev(turbopack)에서는 SW 비활성 — production preview/production에서만 동작.
//

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = {};
  }

  const title = payload.title || '오늘 체크인 안 됐어요';
  const body = payload.body || '1분이면 한 줄 남길 수 있어요.';
  const url = payload.url || '/checkin';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: url },
      tag: 'checkin-reminder', // 동일 tag는 합쳐짐 — 중복 알림 방지
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || '/checkin';

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const existing = wins.find((w) => w.url.includes(url));
      if (existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});

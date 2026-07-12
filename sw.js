// OOG CRM Service Worker
const CACHE_NAME = 'oog-crm-v1';
const URLS_TO_CACHE = ['/oog-crm/', '/oog-crm/index.html'];

// 설치 시 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// 활성화 시 이전 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 네트워크 우선, 실패 시 캐시 사용
// → 새 배포가 있어도 현재 사용 중엔 캐시 버전 유지
// → 다음 번 직접 새로고침할 때 새 버전 적용
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // index.html은 네트워크 우선이지만, 네트워크 실패 시 캐시 사용
  // 단, 이미 페이지가 열린 상태에서 자동 재검사로 인한 리로드는 방지
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 새 버전 캐시에 저장 (다음 번 새로고침 때 사용)
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // JS, CSS 등 기타 리소스는 캐시 우선
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});

// 새 버전 배포 감지 시 클라이언트에 알림 (강제 새로고침 하지 않음)
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

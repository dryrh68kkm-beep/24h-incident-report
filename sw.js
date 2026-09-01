/* sw.js — cache-first offline support สำหรับ 24H Incident Report
   ไม่มี dependency ภายนอก ไม่เรียก network ใด ๆ นอกจาก asset ของแอปเอง (index.html/manifest.json)
   ข้อมูลรายงานเก็บใน localStorage/sessionStorage อยู่แล้ว ไม่เกี่ยวกับ cache นี้ */
var CACHE_NAME = "incident24-shell-v1";
var APP_SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* stale-while-revalidate: ตอบจาก cache ทันทีถ้ามี (ใช้งานได้ทันทีแม้ไม่มีสัญญาณ)
   พร้อมอัปเดต cache ใหม่เงียบ ๆ เบื้องหลังเมื่อออนไลน์ */
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fetchPromise = fetch(event.request).then(function (networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          var copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return networkResponse;
      }).catch(function () {
        if (event.request.mode === "navigate") return caches.match("./index.html");
      });
      return cached || fetchPromise;
    })
  );
});

(function () {
  "use strict";

  var state = { order: [], topics: {} };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Content files use **text** for bold instead of raw HTML, so non-coders can edit JSON safely.
  function md(str) {
    return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  }

  function renderTopic(t) {
    var html = "";
    html += '<h2>' + md(t.title) + '</h2>';
    html += '<div class="block"><p class="situation">' + md(t.situation) + '</p></div>';

    html += '<div class="block"><h3>ทำทันที</h3><ol class="steps">';
    t.steps.forEach(function (s) { html += '<li><span>' + md(s) + '</span></li>'; });
    html += '</ol></div>';

    html += '<div class="block law"><h3>กฎหมายที่เกี่ยวข้อง</h3>';
    t.laws.forEach(function (l) {
      html += '<div><b>' + md(l.title) + '</b>' + md(l.text) + '</div>';
    });
    if (t.warn) html += '<p class="warn">' + md(t.warn) + '</p>';
    html += '</div>';

    var c = t.case;
    html += '<article class="case"><span class="tag">คดีจริง</span>';
    html += '<h4>' + md(c.title) + '</h4>';
    html += '<div class="ref">' + md(c.ref) + '</div>';
    html += '<p>' + md(c.desc) + '</p>';
    html += '<ul>';
    c.points.forEach(function (p) { html += '<li>' + md(p) + '</li>'; });
    html += '</ul>';
    if (c.extraWarn) html += '<p class="warn">' + md(c.extraWarn) + '</p>';
    html += '<p class="lesson">' + md(c.lesson) + '</p>';
    html += '</article>';

    html += '<div class="block help"><h3>ขอความช่วยเหลือ</h3>';
    t.help.forEach(function (h) {
      html += '<div class="line"><span class="who">' + md(h.who) + '</span><span class="num">' + md(h.num) +
        '</span><button class="copy" data-n="' + escapeHtml(h.copy) + '">คัดลอก</button></div>';
    });
    html += '</div>';

    html += '<div class="sources"><b>แหล่งอ้างอิง</b><ul>';
    t.sources.forEach(function (s) {
      html += '<li><a href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener">' + md(s.label) + '</a></li>';
    });
    html += '</ul></div>';

    return html;
  }

  function buildNav() {
    var nav = document.getElementById("nav");
    nav.innerHTML = state.order.map(function (id) {
      var t = state.topics[id];
      return '<button role="tab" id="t-' + id + '" data-t="' + id + '" aria-selected="false">' +
        escapeHtml(t.navLabel) + '</button>';
    }).join("");
    nav.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        show(b.dataset.t);
        try { history.replaceState(null, "", "#" + b.dataset.t); } catch (e) {}
        window.scrollTo({ top: 0 });
      });
    });
  }

  function buildSections() {
    var app = document.getElementById("app");
    app.innerHTML = state.order.map(function (id) {
      var t = state.topics[id];
      return '<section class="topic" id="' + id + '" role="tabpanel" aria-labelledby="t-' + id + '" hidden>' +
        renderTopic(t) + '</section>';
    }).join("");
  }

  function show(id) {
    if (!state.topics[id]) id = state.order[0];
    document.querySelectorAll("nav#nav button").forEach(function (b) {
      b.setAttribute("aria-selected", b.dataset.t === id ? "true" : "false");
    });
    document.querySelectorAll("section.topic").forEach(function (s) {
      s.hidden = s.id !== id;
    });
    clearSearch();
  }

  function clearSearch() {
    var box = document.getElementById("search-results");
    if (box) { box.innerHTML = ""; box.hidden = true; }
  }

  // Very small keyword search: scans each topic's own text, no fabricated results.
  function buildSearchIndex() {
    return state.order.map(function (id) {
      var t = state.topics[id];
      var text = [t.navLabel, t.title, t.situation].concat(t.steps).join(" ");
      return { id: id, label: t.navLabel, title: t.title, text: text.toLowerCase() };
    });
  }

  function runSearch(query) {
    var box = document.getElementById("search-results");
    query = query.trim().toLowerCase();
    if (!query) { clearSearch(); return; }
    var hits = buildSearchIndex().filter(function (row) { return row.text.indexOf(query) !== -1; });
    if (!hits.length) {
      box.innerHTML = '<p class="search-empty">ไม่พบเรื่องที่ตรงกับคำค้น ลองใช้คำอื่น หรือดูหัวข้อด้านบน</p>';
      box.hidden = false;
      return;
    }
    box.innerHTML = hits.map(function (h) {
      return '<button class="hit" data-t="' + h.id + '"><b>' + escapeHtml(h.label) + '</b><br>' + escapeHtml(h.title) + '</button>';
    }).join("");
    box.hidden = false;
    box.querySelectorAll(".hit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.getElementById("search-input").value = "";
        show(btn.dataset.t);
        try { history.replaceState(null, "", "#" + btn.dataset.t); } catch (e) {}
        window.scrollTo({ top: 0 });
      });
    });
  }

  function wireCopyButtons() {
    document.getElementById("app").addEventListener("click", function (e) {
      var btn = e.target.closest(".copy");
      if (!btn) return;
      var n = btn.dataset.n;
      var done = function () { btn.textContent = "คัดลอกแล้ว"; setTimeout(function () { btn.textContent = "คัดลอก"; }, 1500); };
      try { navigator.clipboard.writeText(n).then(done).catch(function () { btn.textContent = n; }); }
      catch (e2) { btn.textContent = n; }
    });
  }

  function wireSearch() {
    var input = document.getElementById("search-input");
    input.addEventListener("input", function () { runSearch(input.value); });
  }

  function showOfflineNoteIfNeeded() {
    var note = document.getElementById("offline-note");
    function update() { note.classList.toggle("show", !navigator.onLine); }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  function loadTopic(id) {
    return fetch("data/topics/" + id + ".json").then(function (r) { return r.json(); });
  }

  function init() {
    fetch("data/topics.json")
      .then(function (r) { return r.json(); })
      .then(function (list) {
        state.order = list.map(function (row) { return row.id; });
        return Promise.all(list.map(function (row) { return loadTopic(row.id); }));
      })
      .then(function (topics) {
        topics.forEach(function (t) { state.topics[t.id] = t; });
        buildNav();
        buildSections();
        wireCopyButtons();
        wireSearch();
        showOfflineNoteIfNeeded();
        registerServiceWorker();
        show((location.hash || "").slice(1));
      })
      .catch(function (err) {
        document.getElementById("app").innerHTML =
          '<p class="warn">โหลดเนื้อหาไม่สำเร็จ กรุณาต่อเน็ตแล้วลองใหม่อีกครั้ง (' + escapeHtml(err.message) + ')</p>';
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();

(function () {
  "use strict";

  var state = { order: [], topics: {}, flagged: false, keywords: {} };

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

  // Simple line-icon set, one per topic id, drawn by hand (no external image fetch, no stock photos).
  var ICON_PATHS = {
    forest: '<path d="M12 2 6 11h3l-4 6h5v4h4v-4h5l-4-6h3z"/>',
    debt: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5c0-1.4 1.2-2.3 2.6-2.3 1.4 0 2.4.8 2.4 1.9 0 2.6-5 1.7-5 4.3 0 1.1 1 1.9 2.4 1.9 1.4 0 2.6-.9 2.6-2.3M12 5.5v13"/>',
    arrest: '<circle cx="8" cy="15" r="3.5"/><circle cx="16" cy="15" r="3.5"/><path d="M8 11.5V9a4 4 0 0 1 8 0v2.5"/>',
    land: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>',
    road: '<path d="M4 21 9 3h6l5 18M8 21l1.5-5h5L16 21M10 9h4"/>',
    trade: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    labor: '<path d="M4 21v-7a8 8 0 0 1 16 0v7M2 21h20"/>',
    divorce: '<path d="M12 7 9 13h3l-2 4M5 4c-3 3-3 7 0 10M19 4c3 3 3 7 0 10"/>',
    inheritance: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3M9 11h6M9 15h6"/>',
    _default: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'
  };

  function iconSvg(id, cls) {
    var path = ICON_PATHS[id] || ICON_PATHS._default;
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }

  // Accepts either the old single "case" object or the new "cases" array, so partially
  // migrated content (while the case-research pass is still writing files) still renders.
  function getCases(t) {
    if (Array.isArray(t.cases)) return t.cases;
    if (t.case) return [t.case];
    return [];
  }

  function renderCaseArticle(c, opts) {
    opts = opts || {};
    var html = '<article class="case' + (c.controversial ? ' flagged-case' : '') + '">';
    html += '<span class="tag">' + (c.controversial ? "คดีน่าสงสัย" : "คดีจริง") + '</span>';
    if (opts.sourceLabel) html += '<div class="source-topic">จากเรื่อง: ' + escapeHtml(opts.sourceLabel) + '</div>';
    html += '<h4>' + md(c.title) + '</h4>';
    html += '<div class="ref">' + md(c.ref) + '</div>';
    html += '<p>' + md(c.desc) + '</p>';
    html += '<ul>';
    c.points.forEach(function (p) { html += '<li>' + md(p) + '</li>'; });
    html += '</ul>';
    if (c.extraWarn) html += '<p class="warn">' + md(c.extraWarn) + '</p>';
    html += '<p class="lesson">' + md(c.lesson) + '</p>';
    html += '</article>';
    return html;
  }

  // Road-accident scenario picker: reorders/filters road.json's own verified steps & laws
  // per scenario. It introduces no new legal claims — every line shown already exists in road.json.
  var ROAD_SCENARIOS = [
    { label: "ถูกชน คู่กรณียังอยู่ที่เกิดเหตุ บาดเจ็บ", steps: [0, 1, 2, 3], laws: [0, 1], help: [1, 0] },
    { label: "ถูกชนแล้วคู่กรณีหลบหนี", steps: [0, 1, 2, 4], laws: [0, 1, 2], help: [1, 0, 2] },
    { label: "คู่กรณีไม่มีประกันภัย/ไม่มี พ.ร.บ.", steps: [0, 1, 2, 4], laws: [0, 1], help: [2, 0] },
    { label: "มีผู้เสียชีวิตจากอุบัติเหตุ", steps: [1, 2], laws: [2], help: [0] }
  ];

  function renderRoadSim(t) {
    var html = '<div class="sim" id="road-sim" data-topic="' + t.id + '">';
    html += '<h3>แบบจำลอง: เจออุบัติเหตุแบบนี้ ต้องทำอะไรก่อน</h3>';
    html += '<div class="sim-body">';
    html += '<p class="sim-question">เลือกสถานการณ์ที่ตรงกับคุณที่สุด</p>';
    html += '<div class="sim-options">';
    ROAD_SCENARIOS.forEach(function (sc, i) {
      html += '<button type="button" data-sim-i="' + i + '">' + escapeHtml(sc.label) + '</button>';
    });
    html += '</div></div></div>';
    return html;
  }

  function wireRoadSim() {
    var root = document.getElementById("road-sim");
    if (!root) return;
    var topic = state.topics.road;
    if (!topic) return;
    var body = root.querySelector(".sim-body");

    function showResult(i) {
      var sc = ROAD_SCENARIOS[i];
      var html = '<div class="sim-result">';
      html += '<p class="sim-question">' + escapeHtml(sc.label) + ' — ทำตามนี้:</p>';
      html += '<ol>';
      sc.steps.forEach(function (idx) { html += '<li>' + md(topic.steps[idx]) + '</li>'; });
      html += '</ol>';
      if (sc.laws.length) {
        html += '<div class="law">';
        sc.laws.forEach(function (idx) {
          var l = topic.laws[idx];
          html += '<div><b>' + md(l.title) + '</b>' + md(l.text) + '</div>';
        });
        html += '</div>';
      }
      html += '<div class="help">';
      sc.help.forEach(function (idx) {
        var h = topic.help[idx];
        html += '<div class="line"><span class="who">' + md(h.who) + '</span><span class="num">' + md(h.num) +
          '</span><button class="copy" data-n="' + escapeHtml(h.copy) + '">คัดลอก</button></div>';
      });
      html += '</div>';
      html += '<button type="button" class="sim-restart">เลือกสถานการณ์อื่น</button>';
      html += '</div>';
      body.innerHTML = html;
      body.querySelector(".sim-restart").addEventListener("click", showPicker);
    }

    function showPicker() {
      var html = '<p class="sim-question">เลือกสถานการณ์ที่ตรงกับคุณที่สุด</p><div class="sim-options">';
      ROAD_SCENARIOS.forEach(function (sc, i) {
        html += '<button type="button" data-sim-i="' + i + '">' + escapeHtml(sc.label) + '</button>';
      });
      html += '</div>';
      body.innerHTML = html;
      wireOptionButtons();
    }

    function wireOptionButtons() {
      body.querySelectorAll("[data-sim-i]").forEach(function (btn) {
        btn.addEventListener("click", function () { showResult(Number(btn.dataset.simI)); });
      });
    }

    wireOptionButtons();
  }

  function renderTopic(t) {
    var html = "";
    html += '<h2>' + iconSvg(t.id, "topic-icon") + md(t.title) + '</h2>';
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

    getCases(t).forEach(function (c) { html += renderCaseArticle(c); });

    if (t.id === "road") html += renderRoadSim(t);

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
        iconSvg(id, "") + escapeHtml(t.navLabel) + '</button>';
    }).join("");
    nav.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        setFlagged(false);
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
    wireRoadSim();
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

  function buildFlaggedView() {
    var html = '<div class="flagged-view">';
    html += '<p class="flagged-intro">คดีจริงที่สังคมตั้งคำถามเรื่องความยุติธรรม เช่น คดีที่ล่าช้า คดีที่ผลลัพธ์ดูไม่สมเหตุสมผล หรือยังไม่มีบทสรุป — เก็บไว้ให้เห็นว่ากระบวนการยุติธรรมไม่ได้สมบูรณ์แบบเสมอไป</p>';
    var any = false;
    state.order.forEach(function (id) {
      var t = state.topics[id];
      getCases(t).filter(function (c) { return c.controversial; }).forEach(function (c) {
        any = true;
        html += renderCaseArticle(c, { sourceLabel: t.navLabel });
      });
    });
    if (!any) html += '<p class="search-empty">ยังไม่มีคดีในหมวดนี้</p>';
    html += '</div>';
    return html;
  }

  function setFlagged(on) {
    state.flagged = on;
    var btn = document.getElementById("flag-toggle");
    var app = document.getElementById("app");
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) {
      document.querySelectorAll("nav#nav button").forEach(function (b) { b.setAttribute("aria-selected", "false"); });
      app.dataset.flagged = "1";
      app.querySelectorAll("section.topic").forEach(function (s) { s.hidden = true; });
      var holder = document.getElementById("flagged-holder");
      if (!holder) {
        holder = document.createElement("div");
        holder.id = "flagged-holder";
        app.appendChild(holder);
      }
      holder.innerHTML = buildFlaggedView();
      holder.hidden = false;
    } else {
      var h2 = document.getElementById("flagged-holder");
      if (h2) h2.hidden = true;
    }
  }

  function wireFlagToggle() {
    var btn = document.getElementById("flag-toggle");
    btn.addEventListener("click", function () {
      if (state.flagged) {
        setFlagged(false);
        show((location.hash || "").slice(1));
      } else {
        setFlagged(true);
      }
    });
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
        setFlagged(false);
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

  // Matches free-text input against a hand-curated keyword list per topic (data/keywords.json).
  // Purely a lookup into the site's own already-verified topics — no legal content is generated.
  function matchSituation(text) {
    text = text.toLowerCase();
    var rows = state.order.map(function (id) {
      var kws = state.keywords[id] || [];
      var hits = kws.filter(function (k) { return text.indexOf(k.toLowerCase()) !== -1; });
      return { id: id, label: state.topics[id].navLabel, title: state.topics[id].title, hits: hits, score: hits.length };
    });
    rows = rows.filter(function (r) { return r.score > 0; });
    rows.sort(function (a, b) { return b.score - a.score; });
    return rows.slice(0, 3);
  }

  function wireSituationBox() {
    var input = document.getElementById("situation-input");
    var btn = document.getElementById("situation-check");
    var box = document.getElementById("situation-results");
    if (!input || !btn) return;

    function run() {
      var text = input.value.trim();
      if (!text) { box.hidden = true; box.innerHTML = ""; return; }
      var matches = matchSituation(text);
      var html = "";
      if (!matches.length) {
        html += '<p class="search-empty">ไม่พบเรื่องที่ใกล้เคียง ลองเล่าใหม่ด้วยคำอื่น หรือโทรศูนย์ดำรงธรรม 1567 เพื่อสอบถามโดยตรง</p>';
      } else {
        matches.forEach(function (m) {
          html += '<button type="button" class="match" data-t="' + m.id + '"><b>' + escapeHtml(m.label) + '</b>' +
            '<span>' + escapeHtml(m.title) + '</span>' +
            '<span class="kws">ใกล้เคียงเพราะมีคำว่า: ' + m.hits.map(escapeHtml).join(", ") + '</span></button>';
        });
        html += '<p class="disclaimer">นี่เป็นแค่การจับคู่คำที่ใกล้เคียงอัตโนมัติ ไม่ใช่การวิเคราะห์ข้อกฎหมาย ควรอ่านรายละเอียดเต็มในหัวข้อที่เลือกเองอีกครั้ง</p>';
      }
      box.innerHTML = html;
      box.hidden = false;
      box.querySelectorAll(".match").forEach(function (m) {
        m.addEventListener("click", function () {
          setFlagged(false);
          show(m.dataset.t);
          try { history.replaceState(null, "", "#" + m.dataset.t); } catch (e) {}
          window.scrollTo({ top: 0 });
        });
      });
    }

    btn.addEventListener("click", run);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); }
    });
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

  function loadKeywords() {
    return fetch("data/keywords.json").then(function (r) { return r.json(); }).catch(function () { return {}; });
  }

  function init() {
    fetch("data/topics.json")
      .then(function (r) { return r.json(); })
      .then(function (list) {
        state.order = list.map(function (row) { return row.id; });
        return Promise.all([
          Promise.all(list.map(function (row) { return loadTopic(row.id); })),
          loadKeywords()
        ]);
      })
      .then(function (results) {
        var topics = results[0];
        state.keywords = results[1];
        topics.forEach(function (t) { state.topics[t.id] = t; });
        buildNav();
        buildSections();
        wireCopyButtons();
        wireSearch();
        wireFlagToggle();
        wireSituationBox();
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

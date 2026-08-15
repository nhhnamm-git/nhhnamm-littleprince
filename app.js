/* ==========================================================================
   APP.JS — Hoàng Tử Bé × Cá Voi 52Hz
   Modules: ImageManager, ReadingPreferences, WorldManager, LittlePrinceRenderer,
            Whale52Renderer, ModalManager, AnimationManager, AccessibilityManager
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* Utilities                                                          */
  /* ------------------------------------------------------------------ */
  function esc(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }
  function paragraphs(text) {
    if (!text) return "";
    return String(text).split(/\n\n+/).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("");
  }

  /* ------------------------------------------------------------------ */
  /* 1. IMAGE MANAGER                                                    */
  /* ------------------------------------------------------------------ */
  var IMAGE_CONFIG = {
    princeStars: "https://commons.wikimedia.org/wiki/Special:FilePath/Starry%20Night%20at%20La%20Silla.jpg?width=1600",
    fox: "https://commons.wikimedia.org/wiki/Special:FilePath/Red%20fox.jpg?width=800",
    rose: "https://commons.wikimedia.org/wiki/Special:FilePath/Red%20rose.jpg?width=800",
    desertSunset: "https://commons.wikimedia.org/wiki/Special:FilePath/Sahara%20Desert%20Sunset%202017.jpg?width=1200",
    desertDune: "https://commons.wikimedia.org/wiki/Special:FilePath/Sand%20dune%20in%20the%20desert%2C%20Sahara%20Desert%2C%20Egypt.jpg?width=1200",
    starsSmall: "https://commons.wikimedia.org/wiki/Special:FilePath/Starry%20Night%20at%20La%20Silla.jpg?width=600",
    whaleHero: "https://commons.wikimedia.org/wiki/Special:FilePath/Humpback%20whales%20in%20singing%20position.jpg?width=1600",
    whaleUnderwater: "https://commons.wikimedia.org/wiki/Special:FilePath/Humpback%20Whale%20underwater%20shot.jpg?width=1200",
    // Giant background watermark for the 52Hz world — an artistic humpback whale image,
    // masked/blended into the ocean scene as a soft silhouette (never claimed to be the
    // specific 52Hz individual, per the accuracy note in its alt text).
    whaleWatermark: "https://i.pinimg.com/236x/87/f5/18/87f518e3f85a26a12f28536937b1d558.jpg",
    // Original minimalist illustration for the Little Prince character (not a copy of the book's artwork)
    princeChar: "data:image/svg+xml;utf8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
      '<defs><radialGradient id="g" cx="50%" cy="35%" r="70%"><stop offset="0%" stop-color="#2b2560"/><stop offset="100%" stop-color="#100d24"/></radialGradient></defs>' +
      '<rect width="200" height="200" fill="url(#g)"/>' +
      '<ellipse cx="100" cy="172" rx="46" ry="10" fill="#e9c46a" opacity="0.25"/>' +
      '<circle cx="100" cy="80" r="22" fill="#f7e9c9"/>' +
      '<path d="M78 96 Q100 130 122 96 L128 175 Q100 190 72 175 Z" fill="#e9c46a"/>' +
      '<path d="M84 92 Q100 108 116 92" stroke="#c98f3a" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="60" cy="60" r="2" fill="#fff"/><circle cx="150" cy="40" r="2" fill="#fff"/><circle cx="40" cy="120" r="1.6" fill="#fff"/><circle cx="165" cy="110" r="1.6" fill="#fff"/>' +
      '</svg>'
    )
  };

  var ImageManager = {
    fallback: function (imgEl, icon) {
      imgEl.addEventListener("error", function onErr() {
        imgEl.removeEventListener("error", onErr);
        var wrap = imgEl.closest(".img-wrap");
        imgEl.style.display = "none";
        if (wrap) {
          wrap.classList.add("placeholder");
          var span = document.createElement("span");
          span.setAttribute("aria-hidden", "true");
          span.textContent = icon || "✦";
          wrap.appendChild(span);
        } else {
          imgEl.parentElement && imgEl.parentElement.style.setProperty("background", "linear-gradient(135deg,#241e42,#100e24)");
        }
      });
    },
    set: function (imgEl, url, alt, icon) {
      if (!imgEl) return;
      imgEl.alt = alt || "";
      this.fallback(imgEl, icon);
      imgEl.src = url;
    }
  };

  /* ------------------------------------------------------------------ */
  /* 2. READING PREFERENCES (font-scale)                                 */
  /* ------------------------------------------------------------------ */
  var FONT_LEVELS = [80, 90, 100, 110, 120, 135, 150, 170];
  var ReadingPreferences = {
    key: "story-font-scale",
    idx: 2,
    init: function () {
      var stored = Number(localStorage.getItem(this.key));
      var i = FONT_LEVELS.indexOf(stored);
      this.idx = i >= 0 ? i : 2;
      this.apply();
      document.getElementById("font-dec").addEventListener("click", this.dec.bind(this));
      document.getElementById("font-inc").addEventListener("click", this.inc.bind(this));
    },
    apply: function () {
      var pct = FONT_LEVELS[this.idx];
      document.documentElement.style.setProperty("--font-scale", (pct / 100).toFixed(2));
      document.getElementById("font-level-label").textContent = pct + "%";
      try { localStorage.setItem(this.key, String(pct)); } catch (e) {}
      document.getElementById("font-dec").disabled = this.idx === 0;
      document.getElementById("font-inc").disabled = this.idx === FONT_LEVELS.length - 1;
    },
    dec: function () { if (this.idx > 0) { this.idx--; this.apply(); } },
    inc: function () { if (this.idx < FONT_LEVELS.length - 1) { this.idx++; this.apply(); } }
  };

  /* ------------------------------------------------------------------ */
  /* 3. FAIRY DUST (Little Prince world)                                 */
  /* ------------------------------------------------------------------ */
  var AnimationManager = {
    fairyDust: function (x, y) {
      if (reduceMotion) return;
      var whale = document.body.classList.contains("theme-whale");
      var palette = whale
        ? ["radial-gradient(circle,#fff 0%,#5fe9df 55%,transparent 75%)", "rgba(95,233,223,.85)"]
        : ["radial-gradient(circle,#fff 0%,#ffcf6b 55%,transparent 75%)", "rgba(255,207,107,.85)"];
      for (var i = 0; i < 5; i++) {
        var p = document.createElement("span");
        p.className = "fairy-dust";
        p.style.background = palette[0];
        p.style.boxShadow = "0 0 10px 3px " + palette[1];
        var dx = (Math.random() - 0.5) * 70;
        var dy = -Math.random() * 60 - 10;
        p.style.setProperty("--dx", dx + "px");
        p.style.setProperty("--dy", dy + "px");
        p.style.left = (x + (Math.random() - 0.5) * 10) + "px";
        p.style.top = (y + (Math.random() - 0.5) * 10) + "px";
        document.body.appendChild(p);
        p.addEventListener("animationend", function () { this.remove(); });
      }
    },
    buildStars: function (container, count) {
      // Preserve the existing single-container API but build three depth tiers:
      // small (dense/dim), medium (glowing), magical (✦/✧ glyphs, sparse).
      container.innerHTML = "";
      var frag = document.createDocumentFragment();
      var isMobile = window.innerWidth < 640;
      var smallCount = isMobile ? Math.round(count * 0.7) : count;
      var mediumCount = isMobile ? 18 : 36;
      var magicalCount = isMobile ? 6 : 14;

      for (var i = 0; i < smallCount; i++) {
        var s = document.createElement("span");
        s.className = "star star-sm";
        var size = (Math.random() * 1.6 + 0.8).toFixed(1);
        s.style.width = size + "px";
        s.style.height = size + "px";
        s.style.left = (Math.random() * 100) + "%";
        s.style.top = (Math.random() * 78) + "%";
        s.style.animationDuration = (3.5 + Math.random() * 2.5) + "s";
        s.style.animationDelay = (Math.random() * 5) + "s";
        frag.appendChild(s);
      }
      for (var j = 0; j < mediumCount; j++) {
        var m = document.createElement("span");
        m.className = "star star-md";
        var msize = (Math.random() * 2 + 2).toFixed(1);
        m.style.width = msize + "px";
        m.style.height = msize + "px";
        m.style.left = (Math.random() * 100) + "%";
        m.style.top = (Math.random() * 75) + "%";
        m.style.animationDuration = (4 + Math.random() * 3) + "s";
        m.style.animationDelay = (Math.random() * 5) + "s";
        frag.appendChild(m);
      }
      var glyphs = ["✦", "✧"];
      for (var k = 0; k < magicalCount; k++) {
        var g = document.createElement("span");
        g.className = "star-glyph";
        g.setAttribute("aria-hidden", "true");
        g.textContent = glyphs[k % 2];
        var gsize = (Math.random() * 0.5 + 0.6).toFixed(2);
        g.style.fontSize = gsize + "rem";
        g.style.left = (Math.random() * 100) + "%";
        g.style.top = (Math.random() * 65) + "%";
        g.style.animationDuration = (5 + Math.random() * 3) + "s";
        g.style.animationDelay = (Math.random() * 5) + "s";
        frag.appendChild(g);
      }
      container.appendChild(frag);
    },

    /* Shooting stars: a soft trail every ~5-12s, paused off-screen tabs and
       disabled entirely under reduced motion. */
    shootingStarTimer: null,
    startShootingStars: function () {
      var self = this;
      var layer = document.getElementById("shooting-star-layer");
      if (!layer || reduceMotion) return;
      function spawn() {
        if (!document.hidden) {
          var star = document.createElement("span");
          star.className = "shooting-star";
          star.style.top = (Math.random() * 40) + "%";
          star.style.left = (Math.random() * 60 + 10) + "%";
          layer.appendChild(star);
          star.addEventListener("animationend", function () { star.remove(); });
        }
        var next = 5000 + Math.random() * 7000;
        self.shootingStarTimer = setTimeout(spawn, next);
      }
      clearTimeout(this.shootingStarTimer);
      this.shootingStarTimer = setTimeout(spawn, 3000 + Math.random() * 4000);
    },

    buildPlankton: function (container, count) {
      if (!container) return;
      container.innerHTML = "";
      var frag = document.createDocumentFragment();
      var n = window.innerWidth < 640 ? Math.round(count * 0.6) : count;
      for (var i = 0; i < n; i++) {
        var p = document.createElement("span");
        p.className = "plankton";
        var size = (Math.random() * 3 + 1.5).toFixed(1);
        p.style.width = size + "px";
        p.style.height = size + "px";
        p.style.left = (Math.random() * 100) + "%";
        p.style.top = (Math.random() * 100) + "%";
        p.style.animationDuration = (3 + Math.random() * 4) + "s";
        p.style.animationDelay = (Math.random() * 5) + "s";
        frag.appendChild(p);
      }
      container.appendChild(frag);
    },
    buildBubbles: function (container, count) {
      container.innerHTML = "";
      var frag = document.createDocumentFragment();
      var n = window.innerWidth < 640 ? Math.round(count * 0.7) : count;
      for (var i = 0; i < n; i++) {
        var b = document.createElement("span");
        b.className = "bubble";
        // wide size range: a few tiny bubbles, a few large ones, most in between
        var roll = Math.random();
        var size = roll < 0.15 ? (Math.random() * 4 + 2) : roll > 0.85 ? (Math.random() * 16 + 14) : (Math.random() * 10 + 5);
        b.style.width = size.toFixed(0) + "px";
        b.style.height = size.toFixed(0) + "px";
        b.style.left = (Math.random() * 100) + "%";
        b.style.opacity = (0.35 + Math.random() * 0.5).toFixed(2);
        b.style.animationDuration = (Math.random() * 12 + 9) + "s";
        b.style.animationDelay = (Math.random() * 12) + "s";
        frag.appendChild(b);
      }
      container.appendChild(frag);
    },
    /* World-transition portal burst: stars converge/scatter into the overlay,
       tinted gold->cyan (to-whale) or cyan->gold (to-prince). Purely decorative,
       skipped under reduced motion. */
    transitionParticles: function (overlay, toWhale) {
      if (reduceMotion) return;
      var count = window.innerWidth < 640 ? 14 : 26;
      var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      var colorA = toWhale ? "#ffe6a8" : "#c9fdf7";
      var colorB = toWhale ? "#5fe9df" : "#ffcf6b";
      for (var i = 0; i < count; i++) {
        var p = document.createElement("span");
        p.className = "transition-particle";
        var angle = Math.random() * Math.PI * 2;
        var dist = 120 + Math.random() * (Math.min(window.innerWidth, window.innerHeight) * 0.42);
        var px = Math.cos(angle) * dist, py = Math.sin(angle) * dist;
        var size = (Math.random() * 5 + 3).toFixed(1);
        var color = i % 2 === 0 ? colorA : colorB;
        p.style.left = (cx + "px");
        p.style.top = (cy + "px");
        p.style.width = size + "px";
        p.style.height = size + "px";
        p.style.background = "radial-gradient(circle," + color + " 0%,transparent 75%)";
        p.style.boxShadow = "0 0 10px 2px " + color;
        p.style.setProperty("--px", px.toFixed(0) + "px");
        p.style.setProperty("--py", py.toFixed(0) + "px");
        p.style.animationDelay = (Math.random() * 0.3) + "s";
        overlay.appendChild(p);
      }
    },

    observeReveals: function () {
      var items = document.querySelectorAll(".reveal");
      if (reduceMotion || !("IntersectionObserver" in window)) {
        items.forEach(function (i) { i.classList.add("is-visible"); });
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      items.forEach(function (i) { io.observe(i); });
    }
  };

  /* ------------------------------------------------------------------ */
  /* 4. MODAL MANAGER                                                    */
  /* ------------------------------------------------------------------ */
  var ModalManager = (function () {
    var root = document.getElementById("global-modal-root");
    var lastFocused = null;
    var currentNav = null; // {items, index, render}

    function open(contentHtml, theme, navInfo) {
      lastFocused = document.activeElement;
      root.innerHTML =
        '<div class="modal-backdrop" data-close="1"></div>' +
        '<div class="modal-shell theme-' + theme + '" role="dialog" aria-modal="true" tabindex="-1">' +
        '<button type="button" class="modal-close" aria-label="Đóng" data-close="1">✕</button>' +
        '<div class="modal-body-wrap">' + contentHtml + "</div>" +
        (navInfo ? navBar(navInfo) : "") +
        "</div>";
      root.classList.add("is-open");
      root.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      currentNav = navInfo || null;
      var shell = root.querySelector(".modal-shell");
      shell.focus();
      root.querySelectorAll("[data-close]").forEach(function (b) {
        b.addEventListener("click", close);
      });
      if (navInfo) {
        var prevBtn = root.querySelector("[data-nav='prev']");
        var nextBtn = root.querySelector("[data-nav='next']");
        if (prevBtn) prevBtn.addEventListener("click", function () { navInfo.go(-1); });
        if (nextBtn) nextBtn.addEventListener("click", function () { navInfo.go(1); });
      }
    }

    function navBar(navInfo) {
      return '<div class="modal-nav">' +
        '<button type="button" class="nav-btn" data-nav="prev" ' + (navInfo.canPrev ? "" : "disabled") + '>← Trước</button>' +
        '<span style="font-family:Jost,sans-serif;font-size:.78rem;opacity:.6;">' + esc(navInfo.label || "") + '</span>' +
        '<button type="button" class="nav-btn" data-nav="next" ' + (navInfo.canNext ? "" : "disabled") + '>Tiếp →</button>' +
        "</div>";
    }

    function close() {
      root.classList.remove("is-open");
      root.setAttribute("aria-hidden", "true");
      root.innerHTML = "";
      document.body.style.overflow = "";
      currentNav = null;
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("is-open")) close();
      if (root.classList.contains("is-open") && currentNav) {
        if (e.key === "ArrowLeft" && currentNav.canPrev) currentNav.go(-1);
        if (e.key === "ArrowRight" && currentNav.canNext) currentNav.go(1);
      }
    });

    return { open: open, close: close };
  })();

  /* ------------------------------------------------------------------ */
  /* 5. LITTLE PRINCE RENDERER                                           */
  /* ------------------------------------------------------------------ */
  var LittlePrinceRenderer = {

    init: function () {
      ImageManager.set(document.getElementById("hero-img-prince"), IMAGE_CONFIG.princeStars, "Bầu trời sao — nền của thế giới Hoàng tử bé", "✦");
      ImageManager.set(document.getElementById("stage-prince-img"), IMAGE_CONFIG.princeChar, "Minh hoạ cách điệu của Hoàng tử bé", "👑");
      ImageManager.set(document.getElementById("stage-fox-img"), IMAGE_CONFIG.fox, "Con cáo — ảnh minh hoạ", "🦊");
      ImageManager.set(document.getElementById("stage-rose-img"), IMAGE_CONFIG.rose, "Bông hoa hồng — ảnh minh hoạ", "🌹");
      ImageManager.set(document.getElementById("stage-planet-img"), IMAGE_CONFIG.desertDune, "Sa mạc / tiểu hành tinh — ảnh minh hoạ", "🪐");
      ImageManager.set(document.getElementById("author-img"), IMAGE_CONFIG.starsSmall, "Bầu trời sao", "⭐");

      this.renderLoop();
      this.renderChapters();
      this.renderMoments();
      this.renderMeanings();
      this.renderCharacters();
      this.renderSymbols();
      this.renderGallery();
      this.renderAuthorTimeline();
      this.renderAdultViews();
      this.renderClosingQuestions();
    },

    renderLoop: function () {
      var host = document.getElementById("loop-row");
      host.innerHTML = journeyLoop.map(function (j) {
        return '<div class="loop-item"><span class="em" aria-hidden="true">' + j.em + '</span>' +
          '<span class="lb">' + esc(j.label) + '</span><span class="tip">' + esc(j.tip) + '</span></div>';
      }).join("");
    },

    renderChapters: function () {
      var host = document.getElementById("chapters-grid");
      host.innerHTML = chapters.map(function (c) {
        var label = c.isSpecial ? "Mở đầu" : "Chương " + c.roman;
        return '<button type="button" class="card tilt-card" data-chapter-id="' + c.id + '">' +
          '<span class="card-eyebrow">' + esc(label) + '</span>' +
          "<h3>" + esc(c.title) + "</h3>" +
          "<p>" + esc(c.summary) + "</p>" +
          '<span class="card-foot"><span>' + (c.location ? esc(c.location[0]) : "") + '</span><span>Mở trang →</span></span>' +
          "</button>";
      }).join("");
      host.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-chapter-id]");
        if (!btn) return;
        LittlePrinceRenderer.openChapter(Number(btn.dataset.chapterId), e);
      });
    },

    openChapter: function (id, evt) {
      var idx = chapters.findIndex(function (c) { return c.id === id; });
      if (idx === -1) return;
      var c = chapters[idx];
      var label = c.isSpecial ? "Mở đầu" : "Chương " + c.roman;
      var html = '<span class="modal-eyebrow">' + esc(label) + " · Hoàng tử bé</span>" +
        '<h2 class="modal-title">' + esc(c.title) + "</h2>" +
        '<p class="modal-sub">' + esc(c.opening || "") + "</p>" +
        '<div class="modal-body">' +
        paragraphs(c.summaryLong || c.summary) +
        (c.events && c.events.length ? "<h4>Sự kiện chính</h4><ul>" + c.events.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "") +
        (c.characters && c.characters.length ? '<h4>Nhân vật</h4><div class="modal-tags">' + c.characters.map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("") + "</div>" : "") +
        (c.symbols && c.symbols.length ? '<h4>Biểu tượng</h4><div class="modal-tags">' + c.symbols.map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("") + "</div>" : "") +
        (c.importance ? "<h4>Ý nghĩa</h4><p>" + esc(c.importance) + "</p>" : "") +
        (c.reflection ? '<div class="modal-quote">' + esc(c.reflection) + "</div>" : "") +
        "</div>";
      ModalManager.open(html, "prince", {
        canPrev: idx > 0, canNext: idx < chapters.length - 1,
        label: (idx + 1) + " / " + chapters.length,
        go: function (dir) { LittlePrinceRenderer.openChapter(chapters[idx + dir].id); }
      });
      if (evt) AnimationManager.fairyDust(evt.clientX, evt.clientY);
    },

    renderMoments: function () {
      var host = document.getElementById("moments-grid");
      host.innerHTML = moments.map(function (m) {
        return '<div class="card" style="cursor:default;" tabindex="0">' +
          '<span class="card-icon" aria-hidden="true">' + m.icon + "</span>" +
          "<h3>" + esc(m.title) + "</h3>" +
          "<p>" + esc(m.text) + "</p></div>";
      }).join("");
    },

    renderMeanings: function () {
      var host = document.getElementById("meanings-grid");
      host.innerHTML = meanings.map(function (m, i) {
        return '<button type="button" class="card" data-meaning-idx="' + i + '">' +
          '<span class="card-icon" aria-hidden="true">' + m.icon + "</span>" +
          "<h3>" + esc(m.title) + "</h3>" +
          "<p>" + esc(m.core.slice(0, 140)) + "…</p>" +
          '<span class="card-foot"><span></span><span>Đọc thêm →</span></span></button>';
      }).join("");
      host.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-meaning-idx]");
        if (!btn) return;
        LittlePrinceRenderer.openMeaning(Number(btn.dataset.meaningIdx), e);
      });
    },

    openMeaning: function (idx, evt) {
      var m = meanings[idx];
      var layerLabels = { story: "📖 Trong câu chuyện", symbol: "🌹 Biểu tượng", psychological: "🧠 Góc nhìn tâm lý", life: "🌍 Liên hệ đời sống" };
      var html = '<span class="modal-eyebrow">Ý nghĩa · Hoàng tử bé</span>' +
        '<h2 class="modal-title">' + m.icon + " " + esc(m.title) + "</h2>" +
        '<div class="modal-body">' + paragraphs(m.core) +
        '<h4>Bốn tầng ý nghĩa</h4>' +
        '<div class="grid grid-2">' + Object.keys(m.layers).map(function (k) {
          return '<div class="card" style="cursor:default;"><span class="card-eyebrow">' + layerLabels[k] + "</span><p>" + esc(m.layers[k]) + "</p></div>";
        }).join("") + "</div>" +
        (m.question ? '<h4>Câu hỏi để suy ngẫm</h4><div class="modal-quote">' + esc(m.question) + "</div>" : "") +
        (m.alternative ? "<h4>Một góc nhìn khác</h4><p>" + esc(m.alternative) + "</p>" : "") +
        "</div>";
      var idx2 = idx;
      ModalManager.open(html, "prince", {
        canPrev: idx2 > 0, canNext: idx2 < meanings.length - 1,
        label: (idx2 + 1) + " / " + meanings.length,
        go: function (dir) { LittlePrinceRenderer.openMeaning(idx2 + dir); }
      });
      if (evt) AnimationManager.fairyDust(evt.clientX, evt.clientY);
    },

    renderCharacters: function () {
      var host = document.getElementById("characters-grid");
      host.innerHTML = characters.map(function (c) {
        return '<div class="card" style="cursor:default;" tabindex="0">' +
          '<span class="card-icon" aria-hidden="true">' + c.icon + "</span>" +
          '<span class="card-eyebrow">' + esc(c.role) + "</span>" +
          "<h3>" + esc(c.name) + "</h3>" +
          "<p>" + esc(c.desc) + "</p></div>";
      }).join("");
    },

    renderSymbols: function () {
      var host = document.getElementById("symbols-grid");
      host.innerHTML = symbols.map(function (s, i) {
        return '<button type="button" class="card" data-symbol-idx="' + i + '">' +
          '<span class="card-icon" aria-hidden="true">' + s.icon + "</span>" +
          '<span class="card-eyebrow">' + esc(s.sub) + "</span>" +
          "<h3>" + esc(s.title) + "</h3>" +
          "<p>" + esc(s.tip) + "</p></button>";
      }).join("");
      host.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-symbol-idx]");
        if (!btn) return;
        var s = symbols[Number(btn.dataset.symbolIdx)];
        var html = '<span class="modal-eyebrow">Biểu tượng · Hoàng tử bé</span>' +
          '<h2 class="modal-title">' + s.icon + " " + esc(s.title) + "</h2>" +
          '<p class="modal-sub">' + esc(s.sub) + "</p>" +
          '<div class="modal-body">' +
          "<h4>Trong sách</h4><p>" + esc(s.book) + "</p>" +
          "<h4>Diễn giải</h4><p>" + esc(s.interpret) + "</p>" +
          "</div>";
        ModalManager.open(html, "prince", null);
        AnimationManager.fairyDust(e.clientX, e.clientY);
      });
    },

renderGallery: function () {
  var host = document.getElementById("lp-gallery-grid");

  var items = [
    {
      img: "https://png.pngtree.com/png-clipart/20241128/original/pngtree-little-prince-illustration-png-image_17338829.png",
      cap: "Hoàng tử bé",
      icon: "👑"
    },
    {
      img: "https://png.pngtree.com/png-vector/20260408/ourmid/pngtree-little-prince-and-fox-joyful-high-five-cartoon-character-illustration-png-image_19078934.webp",
      cap: "Con cáo",
      icon: "🦊"
    },
    {
      img: "https://meetup.vn/wp-content/uploads/2025/07/hoang-tu-be-va-hoa-hong-tren-tieu-tinh-cau-b612-6886f4.jpg",
      cap: "Bông hoa hồng",
      icon: "🌹"
    },
    {
      img: "https://cdn.wowweekend.vn/uploads/202203_2033_5.jpg",
      cap: "Sa mạc Sahara",
      icon: "🏜️"
    },
    {
      img: "https://img.pikbest.com/backgrounds/20250404/a-person-walking-on-sand-dunes-at-sunset-desert_11647523.jpg!w700wp",
      cap: "Hoàng hôn sa mạc",
      icon: "🌇"
    },
    {
      img: "https://cdnphoto.dantri.com.vn/D2ThObL83odzP1akUeUX_co97L8=/2021/09/09/ivanpopovprincehighres-1631144948207.jpg",
      cap: "Bầu trời sao",
      icon: "⭐"
    },
    {
      img: "https://thinhviendaminh.net/wp-content/uploads/2025/05/little-princess-hoang-tu-be-scaled.jpg",
      cap: "B-612 — tiểu hành tinh nhỏ bé",
      icon: "🪐"
    },
    {
      img: "https://cdn.tuoitre.vn/471584752817336320/2023/9/27/exposition-antoine-de-saint-exupery-un-petit-prince-parmi-les-hommes-2-read-only-1695779455831634222631.jpg",
      cap: "Nơi phi công gặp Hoàng tử bé",
      icon: "🌵"
    }
  ];

  host.innerHTML = items.map(function (it, i) {
    return '<div class="img-wrap" id="lp-gal-' + i + '">' +
      '<img alt="' + esc(it.cap) + '" loading="lazy">' +
      '<span class="cap">' + esc(it.cap) + "</span>" +
      "</div>";
  }).join("");

  items.forEach(function (it, i) {
    var wrap = document.getElementById("lp-gal-" + i);

    ImageManager.set(
      wrap.querySelector("img"),
      it.img,
      it.cap,
      it.icon
    );
  });
},

    renderAuthorTimeline: function () {
      var host = document.getElementById("author-timeline");
      host.innerHTML = authorTimeline.map(function (t) {
        return '<div class="timeline-node"><span class="timeline-year">' + esc(t.year) + "</span><p>" + esc(t.text) + "</p></div>";
      }).join("");
    },

    renderAdultViews: function () {
      var host = document.getElementById("adultviews-grid");
      host.innerHTML = adultViews.map(function (a) {
        return '<div class="card" style="cursor:default;" tabindex="0">' +
          '<span class="card-icon" aria-hidden="true">' + a.icon + "</span>" +
          "<h3>" + esc(a.title) + "</h3><p>" + esc(a.text) + "</p></div>";
      }).join("");
    },

    renderClosingQuestions: function () {
      var host = document.getElementById("closing-questions-strip");
      host.innerHTML = closingQuestions.map(function (q) {
        return '<div class="quote-chip">' + esc(q) + "</div>";
      }).join("");
    }
  };

  /* ------------------------------------------------------------------ */
  /* 6. WHALE 52Hz RENDERER                                              */
  /* ------------------------------------------------------------------ */
  var Whale52Renderer = {
    init: function () {
      ImageManager.set(document.getElementById("hero-img-whale"), IMAGE_CONFIG.whaleHero, "Minh hoạ cá voi lưng gù — không phải hình ảnh xác nhận của cá thể phát tín hiệu 52Hz", "🐋");
      ImageManager.set(document.getElementById("whale-watermark-img"), IMAGE_CONFIG.whaleWatermark, "Hình minh hoạ nghệ thuật về một chú cá voi — biểu tượng thị giác cho world 52Hz, không phải hình ảnh xác nhận của cá thể 52Hz", "🐋");
      document.getElementById("whale-hero-eng").textContent = whale52Data.meta.englishTitle.toUpperCase();
      document.getElementById("whale-hero-title").textContent = whale52Data.meta.title;
      document.getElementById("whale-hero-tagline").textContent = whale52Data.meta.tagline;
      document.getElementById("whale-shortintro").textContent = whale52Data.meta.shortIntro;
      document.getElementById("whale-disclaimer").textContent = whale52Data.meta.disclaimer + " " + whale52Data.meta.lastReviewedNote;

      this.renderProfile();
      this.renderFacts();
      this.renderMystery();
      this.renderJourney();
      this.renderSoundlab();
      this.renderOcean();
      this.renderStories();
      this.renderIfYouFeel();
      this.renderCrossover();
      this.renderQuotes();
    },

    renderProfile: function () {
      var host = document.getElementById("profile-accordion");
      host.innerHTML = whale52Data.profile.map(function (p, i) {
        var badge = p.factOrInterpretation === "fact" ? '<span class="badge badge-fact">FACT</span>' : '<span class="badge badge-interpretation">INTERPRETATION</span>';
        return '<div class="accordion-item">' +
          '<button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="profile-panel-' + i + '" id="profile-trigger-' + i + '">' +
          "<span><h3>" + esc(p.title) + '</h3><span class="sub">' + esc(p.subtitle) + "</span></span>" +
          '<svg class="chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          "</button>" +
          '<div class="accordion-panel" id="profile-panel-' + i + '" role="region" aria-labelledby="profile-trigger-' + i + '">' +
          '<div class="accordion-panel-inner">' + badge +
          "<p style='margin-top:.8rem;'>" + esc(p.body) + "</p>" +
          '<div class="keyfact">' + esc(p.keyFact) + "</div>" +
          '<p style="margin-top:.7rem;font-size:.82rem;opacity:.6;">Nguồn: ' + esc(p.source) + "</p>" +
          "</div></div></div>";
      }).join("");
      host.addEventListener("click", function (e) {
        var trigger = e.target.closest(".accordion-trigger");
        if (!trigger) return;
        var expanded = trigger.getAttribute("aria-expanded") === "true";
        var panel = document.getElementById(trigger.getAttribute("aria-controls"));
        trigger.setAttribute("aria-expanded", String(!expanded));
        if (!expanded) {
          panel.style.maxHeight = panel.scrollHeight + "px";
        } else {
          panel.style.maxHeight = 0;
        }
      });
    },

    renderFacts: function () {
      var host = document.getElementById("facts-grid");
      host.innerHTML = whale52Data.facts.map(function (f) {
        return '<button type="button" class="card" data-fact-id="' + esc(f.id) + '">' +
          '<span class="badge badge-fact">' + esc(f.category) + "</span>" +
          "<h3 style='margin-top:.6rem;'>" + esc(f.shortValue) + "</h3>" +
          "<p><strong>" + esc(f.title) + "</strong><br>" + esc(f.shortDescription) + "</p>" +
          '<span class="card-foot"><span>' + esc(f.evidenceLevel) + '</span><span>Chi tiết →</span></span></button>';
      }).join("");
      host.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-fact-id]");
        if (!btn) return;
        Whale52Renderer.openFact(btn.dataset.factId, e);
      });
    },

    openFact: function (id, evt) {
      var idx = whale52Data.facts.findIndex(function (f) { return f.id === id; });
      if (idx === -1) return;
      if (evt) AnimationManager.fairyDust(evt.clientX, evt.clientY);
      var f = whale52Data.facts[idx];
      var html = '<span class="modal-eyebrow badge badge-fact">FACT · ' + esc(f.category) + "</span>" +
        '<h2 class="modal-title">' + esc(f.title) + "</h2>" +
        '<div class="modal-body">' + paragraphs(f.detailedDescription) +
        "<h4>Ý nghĩa</h4><p>" + esc(f.significance) + "</p>" +
        '<h4>Nguồn</h4><p>' + esc(f.source.sourceName) + " (" + esc(f.source.sourceType) + ")</p>" +
        '<div class="modal-tags">' + (f.tags || []).map(function (t) { return '<span class="tag">#' + esc(t) + "</span>"; }).join("") + "</div>" +
        "</div>";
      ModalManager.open(html, "whale", {
        canPrev: idx > 0, canNext: idx < whale52Data.facts.length - 1,
        label: (idx + 1) + " / " + whale52Data.facts.length,
        go: function (dir) { Whale52Renderer.openFact(whale52Data.facts[idx + dir].id); }
      });
    },

    renderMystery: function () {
      var host = document.getElementById("mystery-grid");
      host.innerHTML = whale52Data.mystery.map(function (m, i) {
        return '<div class="card mystery-card" data-mystery-idx="' + i + '" tabindex="0" role="button" aria-expanded="false">' +
          '<span class="card-icon" aria-hidden="true">❓</span>' +
          "<h3>" + esc(m.question) + "</h3>" +
          '<p class="m-short">' + esc(m.shortAnswer) + "</p>" +
          '<div class="m-full" style="display:none;margin-top:.8rem;">' +
          "<p>" + esc(m.detailedAnswer) + "</p>" +
          '<p style="opacity:.65;font-size:.85rem;margin-top:.6rem;"><em>Trạng thái khoa học: ' + esc(m.scientificStatus) + "</em></p>" +
          '<div class="modal-quote" style="margin-top:.8rem;">' + esc(m.reflection) + "</div>" +
          "</div>" +
          '<span class="card-foot"><span></span><span class="toggle-label">Mở rộng →</span></span></div>';
      }).join("");
      host.addEventListener("click", function (e) {
        var card = e.target.closest(".mystery-card");
        if (!card) return;
        var full = card.querySelector(".m-full");
        var label = card.querySelector(".toggle-label");
        var open = full.style.display !== "none";
        full.style.display = open ? "none" : "block";
        label.textContent = open ? "Mở rộng →" : "Thu gọn ↑";
        card.setAttribute("aria-expanded", String(!open));
      });
      host.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          var card = e.target.closest(".mystery-card");
          if (card) { e.preventDefault(); card.click(); }
        }
      });
    },

    renderJourney: function () {
      var host = document.getElementById("journey-timeline");
      host.innerHTML = whale52Data.journey.map(function (j, i) {
        return '<div class="timeline-node">' +
          '<button type="button" class="tn-trigger" data-journey-idx="' + i + '">' +
          '<span class="timeline-year">' + esc(j.location) + "</span>" +
          "<h3>" + esc(j.title) + "</h3>" +
          "<p>" + esc(j.subtitle) + " — " + esc(j.approximatePeriod) + "</p>" +
          "</button></div>";
      }).join("");
      host.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-journey-idx]");
        if (!btn) return;
        Whale52Renderer.openJourney(Number(btn.dataset.journeyIdx), e);
      });
    },

    openJourney: function (idx, evt) {
      var j = whale52Data.journey[idx];
      if (evt) AnimationManager.fairyDust(evt.clientX, evt.clientY);
      var html = '<span class="modal-eyebrow">Ocean Timeline · ' + esc(j.location) + "</span>" +
        '<h2 class="modal-title">' + esc(j.title) + "</h2>" +
        '<p class="modal-sub">' + esc(j.subtitle) + "</p>" +
        '<div class="modal-body">' +
        "<h4>Bối cảnh khoa học</h4><p>" + esc(j.scientificContext) + "</p>" +
        "<h4>Diễn giải</h4>" + paragraphs(j.narrative) +
        '<div class="modal-quote">' + esc(j.emotionalLayer) + "</div>" +
        '<div class="modal-tags">' +
        '<span class="tag">Khoảng cách: ' + esc(j.distance) + '</span>' +
        '<span class="tag">Tốc độ: ' + esc(j.speed) + '</span>' +
        "</div>" +
        '<p style="margin-top:.8rem;font-size:.8rem;opacity:.55;">' + esc(j.mapLabel) + "</p>" +
        "</div>";
      var idx2 = idx;
      ModalManager.open(html, "whale", {
        canPrev: idx2 > 0, canNext: idx2 < whale52Data.journey.length - 1,
        label: (idx2 + 1) + " / " + whale52Data.journey.length,
        go: function (dir) { Whale52Renderer.openJourney(idx2 + dir); }
      });
    },

    renderSoundlab: function () {
      var wave = document.getElementById("soundlab-wave");
      var bars = 28;
      var html = "";
      for (var i = 0; i < bars; i++) {
        html += '<span style="animation-delay:' + (i * 0.05) + 's;height:' + (20 + Math.random() * 40) + 'px;"></span>';
      }
      wave.innerHTML = html;
      var lab = document.getElementById("soundlab");
      var btn = document.getElementById("soundlab-toggle");
      var icon = document.getElementById("soundlab-icon");
      var label = document.getElementById("soundlab-label");
      var audio = document.getElementById("soundlab-audio");

      function setPlaying(playing) {
        lab.classList.toggle("is-playing", playing);
        btn.setAttribute("aria-pressed", String(playing));
        icon.textContent = playing ? "⏸" : "▶";
        label.textContent = playing ? "Đang phát tiếng cá voi" : "Nghe tiếng cá voi";
      }

      btn.addEventListener("click", function () {
        if (!audio) { setPlaying(lab.classList.toggle("is-playing")); return; }
        if (audio.paused) {
          audio.currentTime = 0;
          var p = audio.play();
          if (p && p.catch) { p.catch(function () { setPlaying(false); }); }
          setPlaying(true);
        } else {
          audio.pause();
          setPlaying(false);
        }
      });
      if (audio) {
        audio.addEventListener("ended", function () { setPlaying(false); });
      }

      var scHost = document.getElementById("soundscape-list");
      scHost.innerHTML = whale52Data.soundscapes.map(function (s) {
        return '<div class="sc-item"><b>' + esc(s.useFor) + "</b>" + esc(s.label) + "</div>";
      }).join("");
    },

    renderOcean: function () {
      var host = document.getElementById("ocean-grid");
      host.innerHTML = whale52Data.ocean.slice(0, 6).map(function (o) {
        return '<div class="card" style="cursor:default;" tabindex="0">' +
          "<h3>" + esc(o.title) + "</h3>" +
          '<p class="card-eyebrow" style="margin:.4rem 0;">' + esc(o.intro) + "</p>" +
          "<p>" + esc(o.scientificFact) + "</p></div>";
      }).join("");
    },

    renderStories: function () {
      var host = document.getElementById("stories-grid");
      host.innerHTML = whale52Data.stories.map(function (s) {
        return '<button type="button" class="card tilt-card" data-story-id="' + esc(s.id) + '">' +
          '<span class="badge badge-story">Chương ' + esc(s.chapter) + "</span>" +
          "<h3 style='margin-top:.6rem;'>" + esc(s.title) + "</h3>" +
          '<p class="card-eyebrow">' + esc(s.subtitle) + "</p>" +
          "<p>" + esc(s.opening) + "</p></button>";
      }).join("");
      host.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-story-id]");
        if (!btn) return;
        Whale52Renderer.openStory(btn.dataset.storyId, e);
      });
    },

    openStory: function (id, evt) {
      var idx = whale52Data.stories.findIndex(function (s) { return s.id === id; });
      if (idx === -1) return;
      if (evt) AnimationManager.fairyDust(evt.clientX, evt.clientY);
      var s = whale52Data.stories[idx];
      var html = '<span class="modal-eyebrow badge badge-story">STORY · Chương ' + esc(s.chapter) + "</span>" +
        '<h2 class="modal-title">' + esc(s.title) + "</h2>" +
        '<p class="modal-sub">' + esc(s.subtitle) + " — " + esc(s.setting) + "</p>" +
        '<div class="modal-body">' + paragraphs(s.narrative) +
        '<div class="modal-quote">' + esc(s.meaning) + "</div>" +
        "<h4>Suy ngẫm</h4><p>" + esc(s.reflection) + "</p>" +
        "</div>";
      var idx2 = idx;
      ModalManager.open(html, "whale", {
        canPrev: idx2 > 0, canNext: idx2 < whale52Data.stories.length - 1,
        label: (idx2 + 1) + " / " + whale52Data.stories.length,
        go: function (dir) { Whale52Renderer.openStory(whale52Data.stories[idx2 + dir].id); }
      });
    },

    renderIfYouFeel: function () {
      var host = document.getElementById("ifyoufeel-grid");
      host.innerHTML = whale52Data.ifYouFeel52Hz.slice(0, 6).map(function (m) {
        return '<div class="card" style="cursor:default;" tabindex="0">' +
          "<h3>" + esc(m.title) + "</h3><p>" + esc(m.message.slice(0, 220)) + "…</p></div>";
      }).join("");
    },

    renderCrossover: function () {
      var host = document.getElementById("crossover-list");
      host.innerHTML = whale52Data.princeConnection.map(function (p) {
        return '<div class="compare-row">' +
          '<div class="compare-col prince-side"><div class="cc-label">🌹 Hoàng tử bé</div><p>' + esc(p.littlePrinceSide) + "</p></div>" +
          '<div class="compare-col whale-side"><div class="cc-label">🐋 Cá voi 52Hz</div><p>' + esc(p.whale52Side) + "</p></div>" +
          '<div class="compare-extra"><strong>Liên hệ:</strong> ' + esc(p.connection) + '<br><br><em>' + esc(p.reflection) + "</em></div>" +
          "</div>";
      }).join("");
    },

    renderQuotes: function () {
      var host = document.getElementById("whale-quote-strip");
      var picked = whale52Data.quotes.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 10);
      host.innerHTML = picked.map(function (q) {
        return '<div class="quote-chip">"' + esc(q.text) + '"</div>';
      }).join("");
    }
  };

  /* ------------------------------------------------------------------ */
  /* 6b. 3D TILT — very light tilt for hero/character/major story cards   */
  /* ------------------------------------------------------------------ */
  var Tilt3D = {
    isTouch: window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches,
    init: function (selector, maxDeg) {
      if (reduceMotion || this.isTouch) return;
      var deg = maxDeg || 3;
      document.querySelectorAll(selector).forEach(function (node) {
        if (node.dataset.tiltBound) return;
        node.dataset.tiltBound = "1";
        node.addEventListener("mousemove", function (e) {
          var r = node.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          node.style.transform = "translateY(-4px) perspective(700px) rotateX(" + (-py * deg * 2).toFixed(2) + "deg) rotateY(" + (px * deg * 2).toFixed(2) + "deg)";
        });
        node.addEventListener("mouseleave", function () {
          node.style.transform = "";
        });
      });
    }
  };

  /* ------------------------------------------------------------------ */
  /* 6c. SUBNAV SCROLL-SPY — highlights the section currently in view     */
  /* ------------------------------------------------------------------ */
  var SubnavSpy = {
    io: null,
    bind: function () {
      var self = this;
      if (this.io) { this.io.disconnect(); }
      if (!("IntersectionObserver" in window)) return;
      this.io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          document.querySelectorAll(".subnav a").forEach(function (a) {
            a.classList.toggle("is-current", a.getAttribute("href") === "#" + id);
          });
        });
      }, { threshold: 0, rootMargin: "-45% 0px -50% 0px" });
      document.querySelectorAll(".world.is-active .section[id]").forEach(function (sec) {
        self.io.observe(sec);
      });
    }
  };

  /* ------------------------------------------------------------------ */
  /* 6d. PARALLAX — very subtle background drift, mouse + scroll driven   */
  /* ------------------------------------------------------------------ */
  var Parallax = {
    ticking: false,
    mx: 0, my: 0,
    init: function () {
      if (reduceMotion) return;
      var self = this;
      window.addEventListener("mousemove", function (e) {
        self.mx = (e.clientX / window.innerWidth - 0.5);
        self.my = (e.clientY / window.innerHeight - 0.5);
        self.request();
      }, { passive: true });
      window.addEventListener("scroll", function () { self.request(); }, { passive: true });
    },
    request: function () {
      if (this.ticking || document.hidden) return;
      this.ticking = true;
      var self = this;
      requestAnimationFrame(function () { self.apply(); self.ticking = false; });
    },
    apply: function () {
      var sc = window.scrollY * 0.015;
      var stars = document.getElementById("bg-stars");
      var ocean = document.getElementById("bg-ocean");
      if (stars) stars.style.transform = "translate3d(" + (this.mx * 8) + "px," + (this.my * 8 - sc) + "px,0)";
      if (ocean) ocean.style.transform = "translate3d(" + (this.mx * 6) + "px," + (this.my * 6 - sc * 0.6) + "px,0)";
    }
  };

  /* ------------------------------------------------------------------ */
  /* 7. WORLD MANAGER                                                    */
  /* ------------------------------------------------------------------ */
  var WorldManager = {
    current: "little-prince",
    init: function () {
      var self = this;
      document.querySelectorAll(".world-tab").forEach(function (tab) {
        tab.addEventListener("click", function (e) {
          var r = tab.getBoundingClientRect();
          AnimationManager.fairyDust(r.left + r.width / 2, r.top + r.height / 2);
          self.switchWorld(tab.dataset.world);
        });
        tab.addEventListener("keydown", function (e) {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            var other = tab.id === "tab-prince" ? "tab-whale" : "tab-prince";
            document.getElementById(other).focus();
          }
        });
      });
      AnimationManager.buildStars(document.getElementById("bg-stars"), 90);
      AnimationManager.buildBubbles(document.getElementById("bg-ocean"), 18);
      AnimationManager.buildPlankton(document.getElementById("plankton-layer"), 26);
      AnimationManager.startShootingStars();

      // pause decorative animation work when the tab is not visible (perf)
      document.addEventListener("visibilitychange", function () {
        document.body.classList.toggle("tab-hidden", document.hidden);
      });
    },

    switchWorld: function (world) {
      if (world === this.current) return;
      var toWhale = world === "whale-52hz";
      var overlay = document.getElementById("world-transition-overlay");
      overlay.className = "";
      overlay.innerHTML = "";
      void overlay.offsetWidth;
      overlay.classList.add("active", toWhale ? "to-whale" : "to-prince");
      AnimationManager.transitionParticles(overlay, toWhale);

      var doSwap = function () {
        document.getElementById("world-little-prince").hidden = toWhale;
        document.getElementById("world-whale-52hz").hidden = !toWhale;
        document.getElementById("world-little-prince").classList.toggle("is-active", !toWhale);
        document.getElementById("world-whale-52hz").classList.toggle("is-active", toWhale);
        document.getElementById(toWhale ? "world-whale-52hz" : "world-little-prince").classList.add("world-enter");

        document.body.classList.toggle("theme-whale", toWhale);
        document.body.classList.toggle("theme-prince", !toWhale);

        document.getElementById("tab-prince").setAttribute("aria-selected", String(!toWhale));
        document.getElementById("tab-whale").setAttribute("aria-selected", String(toWhale));

        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
        AnimationManager.observeReveals();
        SubnavSpy.bind();
      };

      if (reduceMotion) {
        doSwap();
      } else {
        setTimeout(doSwap, 640);
      }
      this.current = world;
    }
  };

  /* ------------------------------------------------------------------ */
  /* 8. INIT                                                             */
  /* ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    ReadingPreferences.init();
    WorldManager.init();
    LittlePrinceRenderer.init();
    Whale52Renderer.init();
    AnimationManager.observeReveals();
    Tilt3D.init(".char-stage .stage-item", 5);
    Tilt3D.init(".tilt-card", 3);
    SubnavSpy.bind();
    Parallax.init();

    // subnav smooth-scroll offset compensation for sticky headers
    document.querySelectorAll(".subnav a").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").slice(1);
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        var y = target.getBoundingClientRect().top + window.pageYOffset - 110;
        window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  });
})();

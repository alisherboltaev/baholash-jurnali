/* Baholash jurnali - sayt mantiqi: baholar, o'rtacha, kartochka/jadval, Excel, o'qituvchi kirishi */
(function () {
  "use strict";
  var $ = function (id) {
    return document.getElementById(id);
  };
  var db = null,
    auth = null,
    user = null,
    canWrite = false;
  var groups = {},
    order = [],
    selected = null,
    loaded = false;
  var chains = {},
    toastTimer = null;
  var renaming = null,
    renameDraft = "";
  var query = "",
    sortMode = "list",
    viewMode = null;
  try {
    selected = localStorage.getItem("bj.selected");
    sortMode = localStorage.getItem("bj.sort") || "list";
    viewMode = localStorage.getItem("bj.view");
  } catch (e) {}
  if (viewMode !== "cards" && viewMode !== "table") viewMode = null; // null = avtomatik
  $("sort").value = sortMode;
  $("lDate").value = todayISO();

  var ICON_EDIT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
  var ICON_DEL =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_MOON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  var ICON_SUN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  function todayISO() {
    var d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }
  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
  function fmtDate(iso) {
    var p = (iso || "").split("-");
    return p.length === 3 ? p[2] + "." + p[1] : iso || "";
  }
  function fmtDateFull(iso) {
    var p = (iso || "").split("-");
    return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : iso || "";
  }
  function setStatus(msg, err) {
    var s = $("status");
    s.textContent = msg || "";
    s.className = "status" + (err ? " err" : "");
  }
  function toast(msg, err) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (err ? " err" : "");
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      function () {
        t.hidden = true;
      },
      err ? 4200 : 1700,
    );
  }
  var EPS = 1e-9;
  function band(v) {
    return v >= 5 - EPS ? "5" : v >= 4 - EPS ? "4" : v >= 3 - EPS ? "3" : "2";
  }
  function passed(v) {
    return v != null && v >= 3 - EPS;
  }
  function fmtAvg(v) {
    return v == null ? "—" : v.toFixed(2);
  }
  function writable() {
    return canWrite === true;
  }
  function isNarrow() {
    return window.matchMedia("(max-width: 700px)").matches;
  }
  function currentView() {
    if (viewMode) return viewMode;
    return isNarrow() && !writable() ? "cards" : isNarrow() ? "cards" : "table";
  }

  // ---------- Mavzu (tungi / yorqin) ----------
  var mqDark = window.matchMedia("(prefers-color-scheme: dark)");
  function effectiveTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    return t || (mqDark.matches ? "dark" : "light");
  }
  function paintThemeBtn() {
    var dark = effectiveTheme() === "dark";
    $("themeBtn").innerHTML = dark ? ICON_SUN : ICON_MOON;
    $("themeBtn").setAttribute(
      "aria-label",
      dark ? "Yorqin rejimga o'tish" : "Tungi rejimga o'tish",
    );
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#132a22" : "#1d3b31");
  }
  $("themeBtn").addEventListener("click", function () {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("bj.theme", next);
    } catch (e) {}
    paintThemeBtn();
  });
  if (mqDark.addEventListener) mqDark.addEventListener("change", paintThemeBtn);
  paintThemeBtn();

  function studentStats(g, sid) {
    var row = (g.grades && g.grades[sid]) || {},
      lessons = g.lessons || [],
      vals = [],
      nb = 0,
      graded = 0;
    lessons.forEach(function (l) {
      var v = row[l.id];
      if (typeof v === "number") {
        vals.push(v);
        graded++;
      } else {
        vals.push(0);
        if (v === "nb") nb++;
      }
    });
    var sum = vals.reduce(function (a, b) {
      return a + b;
    }, 0);
    return {
      vals: vals,
      sum: sum,
      avg: lessons.length ? sum / lessons.length : null,
      nb: nb,
      graded: graded,
      lessons: lessons.length,
    };
  }
  function groupSummary(g) {
    var students = g.students || [],
      lessons = g.lessons || [],
      avgs = [],
      present = 0,
      total = 0,
      pass = 0,
      dist = { 5: 0, 4: 0, 3: 0, 2: 0, nb: 0 };
    students.forEach(function (s) {
      var st = studentStats(g, s.id);
      if (st.avg != null) {
        avgs.push(st.avg);
        if (passed(st.avg)) pass++;
      }
      total += st.lessons;
      present += st.lessons - st.nb;
      var row = (g.grades && g.grades[s.id]) || {};
      lessons.forEach(function (l) {
        var v = row[l.id];
        if (v === "nb") dist.nb++;
        else if (typeof v === "number") dist[v >= 5 ? 5 : v >= 4 ? 4 : v >= 3 ? 3 : 2]++;
      });
    });
    return {
      avg: avgs.length
        ? avgs.reduce(function (a, b) {
            return a + b;
          }, 0) / avgs.length
        : null,
      att: total ? present / total : null,
      present: present,
      total: total,
      dist: dist,
      pass: pass,
      graded: avgs.length,
    };
  }

  function write(id, fn, okMsg) {
    if (!db || !writable()) {
      toast("Tahrirlash uchun o'qituvchi sifatida kiring.", true);
      return;
    }
    var ref = db.collection("groups").doc(id);
    chains[id] = (chains[id] || Promise.resolve())
      .then(function () {
        return fn(ref);
      })
      .then(function () {
        if (okMsg) toast(okMsg);
      })
      .catch(function (e) {
        if (e && e.code === "permission-denied") {
          canWrite = false;
          render();
          toast("Bu akkauntda tahrirlash huquqi yo'q.", true);
          return;
        }
        toast("Saqlab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.", true);
      });
  }
  function arm(btn, armedText, action) {
    if (btn.dataset.armed === "1") {
      action();
      return;
    }
    var orig = btn.innerHTML;
    btn.dataset.armed = "1";
    btn.classList.add("armed");
    btn.textContent = armedText;
    setTimeout(function () {
      if (btn.isConnected) {
        btn.dataset.armed = "";
        btn.classList.remove("armed");
        btn.innerHTML = orig;
      }
    }, 3500);
  }

  // ---------- Chizish ----------
  function renderRail() {
    var list = $("glist");
    list.textContent = "";
    if (!order.length) {
      var s = document.createElement("span");
      s.style.color = "var(--muted)";
      s.style.fontSize = "0.9rem";
      s.textContent = loaded ? "Guruhlar ro'yxati bo'sh." : db ? "Yuklanmoqda…" : "—";
      list.appendChild(s);
      return;
    }
    order.forEach(function (id) {
      var g = groups[id],
        sum = groupSummary(g);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "gitem";
      b.setAttribute("aria-current", id === selected ? "true" : "false");
      var n = document.createElement("span");
      n.className = "gnum";
      n.textContent = g.number || "—";
      var nm = document.createElement("span");
      nm.className = "gname";
      nm.textContent = (g.name || "Nomsiz") + " · " + (g.students || []).length + " o'quvchi";
      var av = document.createElement("span");
      av.className = "gavg";
      av.textContent = fmtAvg(sum.avg);
      if (sum.avg != null) av.dataset.band = band(sum.avg);
      b.appendChild(n);
      b.appendChild(av);
      b.appendChild(nm);
      b.addEventListener("click", function () {
        selected = id;
        renaming = null;
        try {
          localStorage.setItem("bj.selected", id);
        } catch (e) {}
        render();
      });
      list.appendChild(b);
    });
  }
  function renderHero(g) {
    $("heroGroup").hidden = !g;
    if (!g) return;
    var sum = groupSummary(g),
      lessons = g.lessons || [],
      n = (g.students || []).length;
    $("hNum").textContent = g.number || "—";
    $("hName").textContent = g.name || "Nomsiz guruh";
    $("kStudents").textContent = n;
    $("kLessons").textContent = lessons.length;
    $("kLast").textContent = lessons.length
      ? "oxirgisi " + fmtDateFull(lessons[lessons.length - 1].date)
      : "hali dars yo'q";
    $("kAvg").textContent = fmtAvg(sum.avg);
    $("kPass").textContent = sum.graded ? sum.pass + " / " + n : "—";
    $("kPassSub").textContent = sum.graded
      ? n - sum.pass + " nafari o'tmadi (3 dan past)"
      : "o'rtacha 3 va undan yuqori";
    var pct = sum.graded && n ? Math.round((sum.pass / n) * 100) : 0;
    $("kDonut").style.setProperty("--p", pct);
    $("kPassPct").textContent = sum.graded ? pct + "%" : "—";
    $("kAtt").textContent = sum.att == null ? "—" : Math.round(sum.att * 100) + "%";
    $("kAttSub").textContent = sum.total
      ? sum.present + " / " + sum.total + " qatnashuv"
      : "qatnashuv";
    var d = sum.dist,
      all = d[5] + d[4] + d[3] + d[2] + d.nb,
      dist = $("kDist"),
      leg = $("kDistLegend");
    dist.textContent = "";
    leg.textContent = "";
    [
      ["5", d[5], "#5fd394"],
      ["4", d[4], "#8eaaff"],
      ["3", d[3], "#f3bb5c"],
      ["≤2", d[2], "#f08094"],
      ["nb", d.nb, "rgba(245,242,231,.45)"],
    ].forEach(function (p) {
      if (all && p[1]) {
        var i = document.createElement("i");
        i.style.width = (p[1] / all) * 100 + "%";
        i.style.background = p[2];
        dist.appendChild(i);
      }
      var s = document.createElement("span");
      s.style.setProperty("--c", p[2]);
      s.textContent = p[0] + ": " + p[1];
      leg.appendChild(s);
    });
  }
  function th(text, cls) {
    var c = document.createElement("th");
    c.scope = "col";
    c.className = cls;
    c.textContent = text;
    return c;
  }
  function td(text, cls) {
    var c = document.createElement("td");
    c.className = cls;
    c.textContent = text;
    return c;
  }

  function prepare(g) {
    var students = g.students || [];
    var stats = {};
    students.forEach(function (s) {
      stats[s.id] = studentStats(g, s.id);
    });
    var ranked = students
      .filter(function (s) {
        return stats[s.id].avg != null;
      })
      .slice()
      .sort(function (a, b) {
        return stats[b.id].avg - stats[a.id].avg;
      });
    var rank = {},
      prevAvg = null,
      prevRank = 0;
    ranked.forEach(function (s, i) {
      var a = Math.round(stats[s.id].avg * 100);
      rank[s.id] = a === prevAvg ? prevRank : i + 1;
      prevAvg = a;
      prevRank = rank[s.id];
    });
    var listIndex = {};
    students.forEach(function (s, i) {
      listIndex[s.id] = i + 1;
    });
    var rows = students.slice();
    if (sortMode === "name")
      rows.sort(function (a, b) {
        return a.name.localeCompare(b.name, "uz");
      });
    else if (sortMode === "avg")
      rows.sort(function (a, b) {
        return (
          (stats[b.id].avg || 0) - (stats[a.id].avg || 0) || a.name.localeCompare(b.name, "uz")
        );
      });
    var q = query.trim().toLowerCase();
    if (q)
      rows = rows.filter(function (s) {
        return s.name.toLowerCase().indexOf(q) !== -1;
      });
    return { stats: stats, rank: rank, listIndex: listIndex, rows: rows };
  }

  function renderSheet(g) {
    $("sheet").hidden = !g;
    $("tools").hidden = !g || !writable();
    $("delGroup").hidden = !writable();
    $("emptyGroups").hidden = !!g || !loaded || order.length > 0;
    $("emptyText").textContent = writable()
      ? "Chap tomonda fan nomi va guruhni yozib, birinchi guruhni qo'shing."
      : "Baholar hali joylanmagan.";
    var view = currentView();
    $("viewCards").setAttribute("aria-pressed", view === "cards" ? "true" : "false");
    $("viewTable").setAttribute("aria-pressed", view === "table" ? "true" : "false");
    if (!g) return;
    var wrap = $("viewWrap");
    var ae = document.activeElement,
      focusKey = null;
    if (ae && ae.classList && ae.classList.contains("g"))
      focusKey = ae.dataset.s + "|" + ae.dataset.l;
    var scrollX = (wrap.querySelector(".table-wrap") || {}).scrollLeft || 0;
    wrap.textContent = "";
    if (!(g.students || []).length) {
      wrap.innerHTML =
        "<div class=\"empty\"><strong>Guruhda o'quvchi yo'q</strong><span>" +
        (writable()
          ? "Yuqoridagi maydon orqali o'quvchilarni qo'shing."
          : "O'quvchilar hali qo'shilmagan.") +
        "</span></div>";
      return;
    }
    var P = prepare(g);
    if (view === "cards") renderCards(g, P, wrap);
    else renderTable(g, P, wrap, focusKey, scrollX);
  }

  function renderCards(g, P, wrap) {
    var lessons = g.lessons || [];
    var box = document.createElement("div");
    box.className = "cards";
    if (!P.rows.length) {
      box.innerHTML = '<div class="empty" style="grid-column:1/-1"></div>';
      box.firstChild.textContent = "“" + query + "” bo'yicha o'quvchi topilmadi.";
    }
    P.rows.forEach(function (s, i) {
      var st = P.stats[s.id],
        row = (g.grades && g.grades[s.id]) || {};
      var c = document.createElement("article");
      c.className = "scard";
      c.style.animationDelay = Math.min(i * 25, 300) + "ms";
      var top = document.createElement("div");
      top.className = "scard-top";
      var md = document.createElement("span");
      md.className = "medal";
      if (P.rank[s.id]) {
        md.textContent = P.rank[s.id];
        if (P.rank[s.id] <= 3 && st.graded) md.dataset.p = P.rank[s.id];
      } else md.textContent = "—";
      md.title = "O'rin";
      var nm = document.createElement("div");
      nm.className = "scard-name";
      nm.textContent = s.name;
      var sub = document.createElement("small");
      sub.textContent = P.listIndex[s.id] + "-o'quvchi";
      nm.appendChild(sub);
      var big = document.createElement("span");
      big.className = "big";
      big.textContent = fmtAvg(st.avg);
      if (st.avg != null) big.dataset.band = band(st.avg);
      big.title = "O'rtacha baho";
      top.appendChild(md);
      top.appendChild(nm);
      top.appendChild(big);
      c.appendChild(top);

      var meta = document.createElement("div");
      meta.className = "scard-meta";
      var pill = document.createElement("span");
      if (st.avg == null) {
        pill.className = "pill none";
        pill.textContent = "Baho yo'q";
      } else if (passed(st.avg)) {
        pill.className = "pill ok";
        pill.textContent = "O'tdi";
      } else {
        pill.className = "pill fail";
        pill.textContent = "O'tmadi";
      }
      meta.appendChild(pill);
      if (st.lessons) {
        var pr = st.lessons - st.nb;
        var at = document.createElement("span");
        at.textContent = "Davomat " + pr + "/" + st.lessons;
        meta.appendChild(at);
        var bar = document.createElement("span");
        bar.className = "att-bar";
        bar.innerHTML = "<i></i>";
        bar.firstChild.style.width = Math.round((pr / st.lessons) * 100) + "%";
        meta.appendChild(bar);
      }
      c.appendChild(meta);

      if (lessons.length) {
        var tiles = document.createElement("div");
        tiles.className = "tiles";
        lessons.forEach(function (l, li) {
          var v = row[l.id],
            t = document.createElement("div");
          t.className = "tile";
          if (v != null) t.dataset.v = String(v);
          t.title = li + 1 + "-dars, " + fmtDateFull(l.date) + (l.topic ? " — " + l.topic : "");
          var b = document.createElement("b");
          b.textContent = v == null ? "·" : String(v);
          var sm = document.createElement("small");
          sm.textContent = fmtDate(l.date);
          t.appendChild(b);
          t.appendChild(sm);
          tiles.appendChild(t);
        });
        c.appendChild(tiles);
        var f = document.createElement("div");
        f.className = "formula";
        f.textContent = "(" + st.vals.join(" + ") + ") ÷ " + st.lessons + " = " + fmtAvg(st.avg);
        c.appendChild(f);
      }
      box.appendChild(c);
    });
    wrap.appendChild(box);
  }

  function renderTable(g, P, wrap, focusKey, scrollX) {
    var students = g.students || [],
      lessons = g.lessons || [];
    var tw = document.createElement("div");
    tw.className = "table-wrap";
    var table = document.createElement("table"),
      thead = document.createElement("thead"),
      hr = document.createElement("tr");
    hr.appendChild(th("#", "num"));
    hr.appendChild(th("O'quvchi", "name"));
    lessons.forEach(function (l, i) {
      var c = document.createElement("th");
      c.scope = "col";
      var box = document.createElement("div");
      box.className = "lesson-h";
      var n = document.createElement("span");
      n.textContent = i + 1 + "-dars";
      var d = document.createElement("span");
      d.className = "d";
      d.textContent = fmtDate(l.date);
      d.title = fmtDateFull(l.date);
      box.appendChild(n);
      box.appendChild(d);
      if (l.topic) {
        var t = document.createElement("span");
        t.className = "t";
        t.textContent = l.topic;
        t.title = l.topic;
        box.appendChild(t);
      }
      if (writable()) {
        var tools = document.createElement("span");
        tools.style.cssText = "display:inline-flex;gap:2px";
        var ed = document.createElement("button");
        ed.type = "button";
        ed.className = "ic";
        ed.innerHTML = ICON_EDIT;
        ed.setAttribute("aria-label", i + 1 + "-darsni tahrirlash");
        ed.title = "Sana va mavzuni tahrirlash";
        ed.addEventListener("click", function () {
          editLesson(l.id, i + 1);
        });
        var x = document.createElement("button");
        x.type = "button";
        x.className = "ic del";
        x.innerHTML = ICON_DEL;
        x.setAttribute("aria-label", i + 1 + "-darsni o'chirish");
        x.title = "Darsni o'chirish";
        x.addEventListener("click", function () {
          arm(x, "O'chirish?", function () {
            removeLesson(l.id);
          });
        });
        tools.appendChild(ed);
        tools.appendChild(x);
        box.appendChild(tools);
      }
      c.appendChild(box);
      hr.appendChild(c);
    });
    hr.appendChild(th("Davomat", "att"));
    hr.appendChild(th("O'rtacha", "avg"));
    hr.appendChild(th("Holat", "status"));
    hr.appendChild(th("O'rin", "rank"));
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    if (!P.rows.length) {
      var er = document.createElement("tr"),
        ec = document.createElement("td");
      ec.colSpan = lessons.length + 6;
      ec.style.cssText = "padding:28px 16px;color:var(--muted);text-align:left";
      ec.textContent = "“" + query + "” bo'yicha o'quvchi topilmadi.";
      er.appendChild(ec);
      tbody.appendChild(er);
    }
    P.rows.forEach(function (s, ri) {
      var st = P.stats[s.id],
        tr = document.createElement("tr");
      tr.appendChild(td(P.listIndex[s.id], "num"));
      var nm = document.createElement("td");
      nm.className = "name";
      var nc = document.createElement("div");
      nc.className = "name-cell";
      if (renaming === s.id) {
        var inpR = document.createElement("input");
        inpR.type = "text";
        inpR.id = "rename-input";
        inpR.value = renameDraft;
        inpR.maxLength = 80;
        inpR.setAttribute("aria-label", "Yangi ism familiya");
        inpR.addEventListener("input", function () {
          renameDraft = inpR.value;
        });
        inpR.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            commitRename(s.id);
          } else if (e.key === "Escape") {
            renaming = null;
            render();
          }
        });
        inpR.addEventListener("blur", function () {
          setTimeout(function () {
            var a = document.activeElement;
            if (renaming === s.id && !(a && a.id === "rename-input")) commitRename(s.id);
          }, 120);
        });
        nc.appendChild(inpR);
      } else {
        var sp = document.createElement("span");
        sp.textContent = s.name;
        sp.title = s.name;
        nc.appendChild(sp);
        if (writable()) {
          var ed = document.createElement("button");
          ed.type = "button";
          ed.className = "ic";
          ed.innerHTML = ICON_EDIT;
          ed.title = "Ismni tahrirlash";
          ed.setAttribute("aria-label", s.name + " ismini tahrirlash");
          ed.addEventListener("click", function () {
            renaming = s.id;
            renameDraft = s.name;
            render();
          });
          var x = document.createElement("button");
          x.type = "button";
          x.className = "ic del";
          x.innerHTML = ICON_DEL;
          x.title = "O'quvchini o'chirish";
          x.setAttribute("aria-label", s.name + "ni o'chirish");
          x.addEventListener("click", function () {
            arm(x, "O'chirish?", function () {
              removeStudent(s.id);
            });
          });
          nc.appendChild(ed);
          nc.appendChild(x);
        }
      }
      nm.appendChild(nc);
      tr.appendChild(nm);
      var row = (g.grades && g.grades[s.id]) || {};
      lessons.forEach(function (l, li) {
        var c = document.createElement("td");
        c.className = "cell";
        var inp = document.createElement("input");
        inp.className = "g";
        inp.type = "text";
        inp.inputMode = "numeric";
        inp.maxLength = 2;
        inp.autocomplete = "off";
        inp.id = "g-" + s.id + "-" + l.id;
        inp.dataset.s = s.id;
        inp.dataset.l = l.id;
        inp.dataset.r = ri;
        inp.dataset.c = li;
        var v = row[l.id];
        inp.value = v == null ? "" : String(v);
        inp.dataset.v = inp.value;
        inp.setAttribute("aria-label", s.name + ", " + (li + 1) + "-dars bahosi");
        inp.readOnly = !writable();
        if (!writable()) inp.tabIndex = -1;
        c.appendChild(inp);
        tr.appendChild(c);
      });
      var at = document.createElement("td");
      at.className = "att";
      if (st.lessons) {
        var pr = st.lessons - st.nb;
        at.innerHTML = '<div></div><div class="att-bar"><i></i></div>';
        at.firstChild.textContent = pr + " / " + st.lessons;
        at.querySelector("i").style.width = Math.round((pr / st.lessons) * 100) + "%";
        at.title = st.nb ? st.nb + " ta dars qoldirilgan" : "Barcha darslarda qatnashgan";
      } else at.textContent = "—";
      tr.appendChild(at);
      var av = document.createElement("td");
      av.className = "avg";
      var chip = document.createElement("span");
      chip.className = "avgchip";
      if (st.avg != null) chip.dataset.band = band(st.avg);
      var b = document.createElement("b");
      b.textContent = fmtAvg(st.avg);
      var sm = document.createElement("small"),
        formula = "(" + st.vals.join("+") + ")/" + st.lessons;
      sm.textContent = !st.lessons
        ? "dars yo'q"
        : st.vals.length > 6
          ? st.sum + "/" + st.lessons
          : formula;
      chip.title = st.lessons ? formula + " = " + fmtAvg(st.avg) : "";
      chip.appendChild(b);
      chip.appendChild(sm);
      av.appendChild(chip);
      tr.appendChild(av);
      var stc = document.createElement("td");
      stc.className = "status";
      var pill = document.createElement("span");
      if (st.avg == null) {
        pill.className = "pill none";
        pill.textContent = "Baho yo'q";
      } else if (passed(st.avg)) {
        pill.className = "pill ok";
        pill.textContent = "O'tdi";
      } else {
        pill.className = "pill fail";
        pill.textContent = "O'tmadi";
        tr.classList.add("failing");
      }
      stc.appendChild(pill);
      tr.appendChild(stc);
      var rk = document.createElement("td");
      rk.className = "rank";
      var md = document.createElement("span");
      md.className = "medal";
      if (P.rank[s.id]) {
        md.textContent = P.rank[s.id];
        if (P.rank[s.id] <= 3 && st.graded) md.dataset.p = P.rank[s.id];
      } else md.textContent = "—";
      rk.appendChild(md);
      tr.appendChild(rk);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    if (lessons.length && P.rows.length) {
      var tf = document.createElement("tfoot"),
        fr = document.createElement("tr");
      fr.appendChild(td("", "num"));
      fr.appendChild(td("Dars o'rtachasi", "name"));
      lessons.forEach(function (l) {
        var vals = students
          .map(function (s) {
            var r = (g.grades && g.grades[s.id]) || {};
            return r[l.id];
          })
          .filter(function (v) {
            return typeof v === "number";
          });
        fr.appendChild(
          td(
            vals.length
              ? fmtAvg(
                  vals.reduce(function (a, b) {
                    return a + b;
                  }, 0) / vals.length,
                )
              : "—",
            "",
          ),
        );
      });
      fr.appendChild(td("", "att"));
      fr.appendChild(td(fmtAvg(groupSummary(g).avg), "avg"));
      fr.appendChild(td("", "status"));
      fr.appendChild(td("", "rank"));
      tf.appendChild(fr);
      table.appendChild(tf);
    } else if (!lessons.length) {
      var cap = document.createElement("caption");
      cap.style.cssText = "caption-side:bottom;padding:16px;color:var(--muted);text-align:left";
      cap.textContent = writable()
        ? "Hali dars yo'q. “Dars qo'shish” tugmasi bilan birinchi darsni oching."
        : "Hali dars yo'q.";
      table.appendChild(cap);
    }
    tw.appendChild(table);
    wrap.appendChild(tw);
    tw.scrollLeft = scrollX || 0;
    if (renaming) {
      var r3 = $("rename-input");
      if (r3 && document.activeElement !== r3) r3.focus();
    } else if (focusKey) {
      var p = focusKey.split("|"),
        el = $("g-" + p[0] + "-" + p[1]);
      if (el) {
        el.focus({ preventScroll: true });
        try {
          el.select();
        } catch (e) {}
      }
    }
  }

  function render() {
    var g = selected && groups[selected];
    $("groupForm").hidden = !writable();
    $("roNote").hidden = !(user && canWrite === false && auth);
    $("loginBtn").hidden = !auth || !!user;
    $("logoutBtn").hidden = !user;
    $("who").hidden = !user || writable();
    $("who").textContent = user ? user.displayName || user.email || "" : "";
    $("whoBtn").hidden = !writable();
    $("whoName").textContent = user ? "O'qituvchi: " + (user.displayName || user.email || "") : "";
    renderRail();
    renderHero(g);
    renderSheet(g);
  }

  // ---------- Ko'rinish ----------
  function setView(v) {
    viewMode = v;
    try {
      localStorage.setItem("bj.view", v);
    } catch (e) {}
    renderSheet(groups[selected]);
  }
  $("viewCards").addEventListener("click", function () {
    setView("cards");
  });
  $("viewTable").addEventListener("click", function () {
    setView("table");
  });
  var lastNarrow = isNarrow();
  window.addEventListener("resize", function () {
    var n = isNarrow();
    if (n !== lastNarrow) {
      lastNarrow = n;
      if (!viewMode) renderSheet(groups[selected]);
    }
  });

  // ---------- Baho kiritish ----------
  function parseGrade(raw) {
    var s = String(raw).trim().toLowerCase();
    if (s === "") return { ok: true, v: null };
    if (s === "n" || s === "nb" || s === "н" || s === "нб") return { ok: true, v: "nb" };
    if (/^[0-5]$/.test(s)) return { ok: true, v: Number(s) };
    return { ok: false };
  }
  function moveFocus(inp, dr, dc) {
    var el = document.querySelector(
      '.g[data-r="' +
        (Number(inp.dataset.r) + dr) +
        '"][data-c="' +
        (Number(inp.dataset.c) + dc) +
        '"]',
    );
    if (el) {
      el.focus();
      el.select();
    }
  }
  var vw = $("viewWrap");
  vw.addEventListener("focusin", function (e) {
    if (e.target.classList.contains("g") && writable()) e.target.select();
  });
  vw.addEventListener("input", function (e) {
    var inp = e.target;
    if (!inp.classList.contains("g") || !writable()) return;
    var p = parseGrade(inp.value);
    if (!p.ok) {
      inp.value = inp.dataset.v || "";
      toast("Baho 0 dan 5 gacha bo'lishi kerak (yoki n — nb).", true);
      return;
    }
    inp.value = p.v == null ? "" : String(p.v);
    inp.dataset.v = inp.value;
    saveGrade(inp.dataset.s, inp.dataset.l, p.v);
    if (p.v != null) moveFocus(inp, 1, 0);
  });
  vw.addEventListener("keydown", function (e) {
    var inp = e.target;
    if (!inp.classList.contains("g")) return;
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(inp, 1, 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(inp, -1, 0);
    } else if (e.key === "ArrowRight" && inp.selectionEnd === inp.value.length) {
      e.preventDefault();
      moveFocus(inp, 0, 1);
    } else if (e.key === "ArrowLeft" && inp.selectionStart === 0) {
      e.preventDefault();
      moveFocus(inp, 0, -1);
    }
  });
  function saveGrade(sid, lid, v) {
    if (!groups[selected]) return;
    var patch = {};
    patch["grades." + sid + "." + lid] = v; // faqat bitta katakni yangilaydi
    write(selected, function (ref) {
      return ref.update(patch);
    });
  }

  // ---------- Formalar ----------
  $("q").addEventListener("input", function () {
    query = $("q").value;
    renderSheet(groups[selected]);
  });
  $("sort").addEventListener("change", function () {
    sortMode = $("sort").value;
    try {
      localStorage.setItem("bj.sort", sortMode);
    } catch (e) {}
    renderSheet(groups[selected]);
  });
  $("groupForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("gName").value.trim(),
      num = $("gNum").value.trim();
    if (!name || !num) return;
    var id = uid(),
      data = {
        name: name,
        number: num,
        students: [],
        lessons: [],
        grades: {},
        createdAt: new Date().toISOString(),
      };
    selected = id;
    try {
      localStorage.setItem("bj.selected", id);
    } catch (e2) {}
    write(
      id,
      function (ref) {
        return ref.set(data);
      },
      "Guruh qo'shildi",
    );
    $("gName").value = "";
    $("gNum").value = "";
  });
  $("studentForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var g = groups[selected];
    if (!g) return;
    var name = $("sName").value.trim().replace(/\s+/g, " ");
    if (!name) return;
    var students = (g.students || []).concat([{ id: uid(), name: name }]);
    write(
      selected,
      function (ref) {
        return ref.update({ students: students });
      },
      name + " qo'shildi",
    );
    $("sName").value = "";
    $("sName").focus();
  });
  $("lessonForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var g = groups[selected];
    if (!g) return;
    var lessons = (g.lessons || []).concat([
      { id: uid(), date: $("lDate").value || todayISO(), topic: $("lTopic").value.trim() },
    ]);
    lessons.sort(function (a, b) {
      return (a.date || "").localeCompare(b.date || "");
    });
    write(
      selected,
      function (ref) {
        return ref.update({ lessons: lessons });
      },
      "Dars qo'shildi",
    );
    $("lTopic").value = "";
  });
  function commitRename(sid) {
    var g = groups[selected];
    renaming = null;
    var name = renameDraft.trim().replace(/\s+/g, " ");
    if (g && name) {
      var students = (g.students || []).map(function (s) {
        return s.id === sid ? { id: s.id, name: name } : s;
      });
      write(
        selected,
        function (ref) {
          return ref.update({ students: students });
        },
        "Ism saqlandi",
      );
    }
    render();
  }
  function removeStudent(sid) {
    var g = groups[selected];
    if (!g) return;
    var students = (g.students || []).filter(function (s) {
      return s.id !== sid;
    });
    var grades = JSON.parse(JSON.stringify(g.grades || {}));
    delete grades[sid];
    write(
      selected,
      function (ref) {
        return ref.update({ students: students, grades: grades });
      },
      "O'quvchi o'chirildi",
    );
  }
  function removeLesson(lid) {
    var g = groups[selected];
    if (!g) return;
    var lessons = (g.lessons || []).filter(function (l) {
      return l.id !== lid;
    });
    var grades = JSON.parse(JSON.stringify(g.grades || {}));
    Object.keys(grades).forEach(function (k) {
      if (grades[k]) delete grades[k][lid];
    });
    write(
      selected,
      function (ref) {
        return ref.update({ lessons: lessons, grades: grades });
      },
      "Dars o'chirildi",
    );
  }
  // ---------- Tahrirlash oynasi ----------
  var dlgState = null;
  function openDialog(opts) {
    dlgState = opts;
    $("dlgTitle").textContent = opts.title;
    $("dlgHint").textContent = opts.hint || "";
    $("dlgHint").hidden = !opts.hint;
    var body = $("dlgBody");
    body.textContent = "";
    opts.fields.forEach(function (f) {
      var wrap = document.createElement("div");
      wrap.className = "field";
      var lb = document.createElement("label");
      lb.className = "label";
      lb.htmlFor = "dlg-" + f.id;
      lb.textContent = f.label;
      var inp = document.createElement("input");
      inp.type = f.type || "text";
      inp.id = "dlg-" + f.id;
      inp.value = f.value || "";
      if (f.maxLength) inp.maxLength = f.maxLength;
      if (f.required) inp.required = true;
      if (f.placeholder) inp.placeholder = f.placeholder;
      wrap.appendChild(lb);
      wrap.appendChild(inp);
      body.appendChild(wrap);
    });
    $("dlgDelete").hidden = !opts.onDelete;
    var d = $("dlg");
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
    var first = body.querySelector("input");
    if (first) {
      first.focus();
      try {
        first.select();
      } catch (e) {}
    }
  }
  function closeDialog() {
    var d = $("dlg");
    if (d.open) {
      if (typeof d.close === "function") d.close();
      else d.removeAttribute("open");
    }
    dlgState = null;
  }
  $("dlgForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!dlgState) return;
    var vals = {};
    dlgState.fields.forEach(function (f) {
      vals[f.id] = $("dlg-" + f.id).value.trim();
    });
    var cb = dlgState.onSave;
    closeDialog();
    cb(vals);
  });
  $("dlgCancel").addEventListener("click", closeDialog);
  $("dlgDelete").addEventListener("click", function () {
    var btn = $("dlgDelete");
    arm(btn, "Rostdan o'chirilsinmi?", function () {
      var cb = dlgState && dlgState.onDelete;
      closeDialog();
      if (cb) cb();
    });
  });

  function editLesson(lid, num) {
    var g = groups[selected];
    if (!g) return;
    var l = (g.lessons || []).filter(function (x) {
      return x.id === lid;
    })[0];
    if (!l) return;
    openDialog({
      title: num + "-darsni tahrirlash",
      hint: "Sana va mavzuni o'zgartiring. Qo'yilgan baholar saqlanib qoladi.",
      fields: [
        {
          id: "date",
          label: "Dars sanasi",
          type: "date",
          value: l.date || todayISO(),
          required: true,
        },
        {
          id: "topic",
          label: "Mavzu",
          value: l.topic || "",
          maxLength: 60,
          placeholder: "Masalan: Massivlar",
        },
      ],
      onSave: function (v) {
        var cur = groups[selected];
        if (!cur) return;
        var lessons = (cur.lessons || []).map(function (x) {
          return x.id === lid ? { id: x.id, date: v.date || x.date, topic: v.topic } : x;
        });
        lessons.sort(function (a, b) {
          return (a.date || "").localeCompare(b.date || "");
        });
        write(
          selected,
          function (ref) {
            return ref.update({ lessons: lessons });
          },
          "Dars saqlandi",
        );
      },
      onDelete: function () {
        removeLesson(lid);
      },
    });
  }
  $("whoBtn").addEventListener("click", function () {
    if (!user) return;
    openDialog({
      title: "O'qituvchi ismi",
      hint: "Saytning yuqori qismida ko'rinadigan ismingiz.",
      fields: [
        {
          id: "name",
          label: "Ism familiya",
          value: user.displayName || "",
          maxLength: 60,
          required: true,
          placeholder: "Masalan: Alisher Boltaev",
        },
      ],
      onSave: function (v) {
        if (!v.name) return;
        user
          .updateProfile({ displayName: v.name })
          .then(function () {
            render();
            toast("Ism saqlandi");
          })
          .catch(function () {
            toast("Ismni saqlab bo'lmadi. Qayta urinib ko'ring.", true);
          });
      },
    });
  });

  $("delGroup").addEventListener("click", function () {
    arm($("delGroup"), "Rostdan o'chirilsinmi? Yana bosing", function () {
      var id = selected;
      write(
        id,
        function (ref) {
          return ref.delete();
        },
        "Guruh o'chirildi",
      );
    });
  });

  // ---------- Excel (.xlsx, rangli) ----------
  var excelLib = null;
  function loadExcelLib() {
    if (excelLib) return excelLib;
    excelLib = new Promise(function (resolve, reject) {
      if (window.ExcelJS) return resolve(window.ExcelJS);
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
      s.onload = function () {
        window.ExcelJS ? resolve(window.ExcelJS) : reject();
      };
      s.onerror = function () {
        excelLib = null;
        reject();
      };
      document.head.appendChild(s);
    });
    return excelLib;
  }
  var XL = {
    hero: "FF1D3B31",
    hero2: "FF275244",
    white: "FFFFFFFF",
    line: "FFD8E3DC",
    muted: "FF5A6C63",
    paper: "FFF4F8F5",
    margin: "FFC4314B",
    g5: "FF16834D",
    g5bg: "FFDCF2E4",
    g4: "FF2457C5",
    g4bg: "FFE5ECFC",
    g3: "FFA96400",
    g3bg: "FFFCEFD2",
    g2: "FFC4314B",
    g2bg: "FFFBE2E7",
  };
  function fill(argb) {
    return { type: "pattern", pattern: "solid", fgColor: { argb: argb } };
  }
  var thin = { style: "thin", color: { argb: XL.line } };
  var BORDER = { top: thin, left: thin, bottom: thin, right: thin };
  function gradeStyle(v) {
    if (v === "nb") return { font: XL.margin, bg: null };
    if (typeof v !== "number") return null;
    if (v >= 5) return { font: XL.g5, bg: XL.g5bg };
    if (v >= 4) return { font: XL.g4, bg: XL.g4bg };
    if (v >= 3) return { font: XL.g3, bg: XL.g3bg };
    if (v >= 1) return { font: XL.g2, bg: XL.g2bg };
    return { font: XL.muted, bg: XL.paper };
  }
  function avgStyle(a) {
    var b = band(a);
    if (b === "5") return { font: XL.white, bg: XL.g5 };
    if (b === "4") return { font: XL.g4, bg: XL.g4bg };
    if (b === "3") return { font: XL.g3, bg: XL.g3bg };
    return { font: XL.g2, bg: XL.g2bg };
  }
  function buildXlsx(ExcelJS, g) {
    var lessons = g.lessons || [],
      students = g.students || [],
      sum = groupSummary(g);
    var nCols = 2 + lessons.length + 3,
      cAtt = 3 + lessons.length,
      cAvg = cAtt + 1,
      cSt = cAvg + 1;
    var wb = new ExcelJS.Workbook();
    wb.creator = "Baholash jurnali — Alisher Boltaev";
    wb.created = new Date();
    var sheetName =
      ((g.number || "") + " " + (g.name || ""))
        .replace(/[\[\]:*?\/\\]/g, "-")
        .trim()
        .slice(0, 31) || "Jurnal";
    var ws = wb.addWorksheet(sheetName, {
      views: [{ state: "frozen", xSplit: 2, ySplit: 3 }],
      properties: { defaultRowHeight: 20 },
    });
    ws.mergeCells(1, 1, 1, nCols);
    var t = ws.getCell(1, 1);
    t.value = (g.number || "") + " — " + (g.name || "");
    t.font = { name: "Calibri", size: 15, bold: true, color: { argb: XL.white } };
    t.fill = fill(XL.hero);
    t.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 30;
    ws.mergeCells(2, 1, 2, nCols);
    var sub = ws.getCell(2, 1),
      now = new Date();
    sub.value =
      "Yuklab olingan: " +
      String(now.getDate()).padStart(2, "0") +
      "." +
      String(now.getMonth() + 1).padStart(2, "0") +
      "." +
      now.getFullYear() +
      "   ·   O'quvchilar: " +
      students.length +
      "   ·   Darslar: " +
      lessons.length +
      "   ·   Fandan o'tganlar: " +
      sum.pass +
      " / " +
      students.length +
      "   ·   Guruh o'rtachasi: " +
      fmtAvg(sum.avg);
    sub.font = { size: 10, italic: true, color: { argb: XL.white } };
    sub.fill = fill(XL.hero2);
    sub.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(2).height = 20;
    var head = ["№", "O'quvchi"];
    lessons.forEach(function (l, i) {
      head.push(i + 1 + "-dars\n" + fmtDate(l.date));
    });
    head.push("Davomat", "O'rtacha", "Holat");
    var hr = ws.getRow(3);
    hr.values = head;
    hr.height = 34;
    hr.eachCell(function (c) {
      c.font = { bold: true, color: { argb: XL.white } };
      c.fill = fill(XL.hero2);
      c.border = BORDER;
      c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    ws.getCell(3, 2).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    lessons.forEach(function (l, i) {
      if (l.topic) ws.getCell(3, 3 + i).note = l.topic;
    });
    students.forEach(function (s, i) {
      var st = studentStats(g, s.id),
        row = (g.grades && g.grades[s.id]) || {},
        r = ws.getRow(4 + i);
      r.height = 20;
      var c1 = r.getCell(1);
      c1.value = i + 1;
      c1.alignment = { horizontal: "center", vertical: "middle" };
      c1.font = { color: { argb: XL.muted } };
      var c2 = r.getCell(2);
      c2.value = s.name;
      c2.alignment = { vertical: "middle", indent: 1 };
      lessons.forEach(function (l, li) {
        var v = row[l.id],
          c = r.getCell(3 + li),
          sty = gradeStyle(v);
        c.value = v == null ? null : v;
        c.alignment = { horizontal: "center", vertical: "middle" };
        c.font = { bold: true, color: { argb: sty ? sty.font : XL.muted } };
        if (sty && sty.bg) c.fill = fill(sty.bg);
      });
      var ca = r.getCell(cAtt);
      ca.value = st.lessons ? st.lessons - st.nb + " / " + st.lessons : "—";
      ca.alignment = { horizontal: "center", vertical: "middle" };
      var cv = r.getCell(cAvg);
      if (st.avg != null) {
        var as = avgStyle(st.avg);
        cv.value = Math.round(st.avg * 100) / 100;
        cv.numFmt = "0.00";
        cv.font = { bold: true, color: { argb: as.font } };
        cv.fill = fill(as.bg);
      } else cv.value = "—";
      cv.alignment = { horizontal: "center", vertical: "middle" };
      var cs = r.getCell(cSt);
      if (st.avg == null) {
        cs.value = "Baho yo'q";
        cs.font = { color: { argb: XL.muted } };
      } else if (passed(st.avg)) {
        cs.value = "O'tdi";
        cs.font = { bold: true, color: { argb: XL.g5 } };
        cs.fill = fill(XL.g5bg);
      } else {
        cs.value = "O'tmadi";
        cs.font = { bold: true, color: { argb: XL.g2 } };
        cs.fill = fill(XL.g2bg);
        c2.font = { color: { argb: XL.g2 } };
      }
      cs.alignment = { horizontal: "center", vertical: "middle" };
      for (var k = 1; k <= nCols; k++) r.getCell(k).border = BORDER;
      c2.border = {
        top: thin,
        bottom: thin,
        left: thin,
        right: { style: "medium", color: { argb: XL.margin } },
      };
    });
    var fr = ws.getRow(4 + students.length);
    fr.height = 22;
    fr.getCell(2).value = "Dars o'rtachasi";
    lessons.forEach(function (l, li) {
      var vals = students
        .map(function (s) {
          var r = (g.grades && g.grades[s.id]) || {};
          return r[l.id];
        })
        .filter(function (v) {
          return typeof v === "number";
        });
      var c = fr.getCell(3 + li);
      if (vals.length) {
        c.value =
          Math.round(
            (vals.reduce(function (a, b) {
              return a + b;
            }, 0) /
              vals.length) *
              100,
          ) / 100;
        c.numFmt = "0.00";
      }
    });
    if (sum.avg != null) {
      var gc = fr.getCell(cAvg);
      gc.value = Math.round(sum.avg * 100) / 100;
      gc.numFmt = "0.00";
    }
    for (var k2 = 1; k2 <= nCols; k2++) {
      var fc = fr.getCell(k2);
      fc.font = { bold: true, color: { argb: XL.muted } };
      fc.fill = fill(XL.paper);
      fc.border = BORDER;
      fc.alignment = {
        horizontal: k2 === 2 ? "left" : "center",
        vertical: "middle",
        indent: k2 === 2 ? 1 : 0,
      };
    }
    var lr = 6 + students.length;
    ws.getCell(lr, 2).value = "O'rtacha baho ranglari:";
    ws.getCell(lr, 2).font = { bold: true, color: { argb: XL.muted } };
    [
      ["3 dan past — o'tmadi", XL.g2, XL.g2bg],
      ["3 – 4", XL.g3, XL.g3bg],
      ["4 – 5", XL.g4, XL.g4bg],
      ["5", XL.white, XL.g5],
    ].forEach(function (p, i) {
      var c = ws.getCell(lr + 1 + i, 2);
      c.value = p[0];
      c.font = { bold: true, color: { argb: p[1] } };
      c.fill = fill(p[2]);
      c.border = BORDER;
      c.alignment = { indent: 1 };
    });
    var nr = lr + 6;
    ws.getCell(nr, 2).value =
      "O'rtacha = baholar yig'indisi ÷ o'tilgan darslar soni. nb (dars qoldirgan) va bo'sh katak 0 deb hisoblanadi.";
    ws.getCell(nr, 2).font = { italic: true, size: 9, color: { argb: XL.muted } };
    ws.getCell(nr + 1, 2).value =
      "Sayt muallifi: Alisher Boltaev · +998 99 258 77 99 · Telegram: @Alisher_Boltaev · Instagram: alisherboltaev_";
    ws.getCell(nr + 1, 2).font = { size: 9, color: { argb: XL.muted } };
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 38;
    lessons.forEach(function (l, li) {
      ws.getColumn(3 + li).width = 8.5;
    });
    ws.getColumn(cAtt).width = 11;
    ws.getColumn(cAvg).width = 11;
    ws.getColumn(cSt).width = 12;
    ws.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "3:3",
    };
    return wb;
  }
  $("exportBtn").addEventListener("click", function () {
    var g = groups[selected];
    if (!g) return;
    var btn = $("exportBtn");
    btn.disabled = true;
    loadExcelLib()
      .then(function (ExcelJS) {
        return buildXlsx(ExcelJS, g).xlsx.writeBuffer();
      })
      .then(function (buf) {
        var blob = new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download =
          ("Jurnal " + (g.number || "") + " " + (g.name || ""))
            .replace(/[\\/:*?"<>|]+/g, " ")
            .replace(/\s+/g, " ")
            .trim() + ".xlsx";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 1000);
        toast("Excel fayl yuklab olindi");
      })
      .catch(function () {
        toast("Excel faylni yaratib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.", true);
      })
      .then(function () {
        btn.disabled = false;
      });
  });

  // ---------- Ma'lumotlar ----------
  function applyGroups(next) {
    var ids = Object.keys(next);
    ids.sort(function (a, b) {
      var A = next[a],
        B = next[b];
      return (
        String(A.number || "").localeCompare(String(B.number || ""), "uz", { numeric: true }) ||
        String(A.name || "").localeCompare(String(B.name || ""))
      );
    });
    groups = next;
    order = ids;
    if (!selected || !groups[selected]) selected = order[0] || null;
  }
  function configured() {
    return (
      typeof firebase !== "undefined" &&
      firebaseConfig &&
      firebaseConfig.apiKey &&
      firebaseConfig.apiKey.indexOf("BU_YERGA") === -1
    );
  }

  render();
  if (!configured()) {
    $("setupNote").hidden = false;
    setStatus("Firebase ulanmagan", true);
    return;
  }
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
  setStatus("Yuklanmoqda…");
  var loadTimer = setTimeout(function () {
    if (!loaded) setStatus("Ma'lumotlar yetib kelmadi. Internetni tekshiring.", true);
  }, 10000);
  db.collection("groups").onSnapshot(
    function (snap) {
      var next = {};
      snap.docs.forEach(function (d) {
        next[d.id] = d.data();
      });
      applyGroups(next);
      loaded = true;
      clearTimeout(loadTimer);
      setStatus("");
      render();
    },
    function () {
      clearTimeout(loadTimer);
      setStatus("Ma'lumotlarni o'qib bo'lmadi.", true);
    },
  );

  $("loginBtn").addEventListener("click", function () {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(function (e) {
      if (e && e.code === "auth/popup-closed-by-user") return;
      if (
        location.protocol === "file:" ||
        (e && e.code === "auth/operation-not-supported-in-this-environment")
      ) {
        toast("Kompyuterdagi fayldan kirib bo'lmaydi. Saytni Netlify manzili orqali oching.", true);
        return;
      }
      if (e && e.code === "auth/unauthorized-domain") {
        toast("Bu manzil Firebase'dagi Authorized domains ro'yxatida yo'q.", true);
        return;
      }
      toast("Kirib bo'lmadi: " + (e && e.code ? e.code : "xato"), true);
    });
  });
  $("logoutBtn").addEventListener("click", function () {
    auth.signOut();
  });
  auth.onAuthStateChanged(function (u) {
    user = u;
    canWrite = false;
    render();
    if (!u) return;
    // O'qituvchi ekanini tekshirish: faqat ruxsat berilgan Gmail yoza oladi (Firestore qoidalari)
    db.collection("meta")
      .doc("ping")
      .set({ at: firebase.firestore.FieldValue.serverTimestamp() })
      .then(function () {
        canWrite = true;
        render();
        toast("O'qituvchi rejimi yoqildi");
      })
      .catch(function () {
        canWrite = false;
        render();
      });
  });
})();

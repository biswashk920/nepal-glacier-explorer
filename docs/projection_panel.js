(function () {
  "use strict";

  var ID_RE = /RGI2000-v7\.0-G-\d{2}-\d{5}/;
  var DATA_DIR = "data/proj/";
  var ALL = ["ssp119", "ssp126", "ssp245", "ssp370", "ssp585", "rcp26", "rcp45", "rcp85"];
  var SSPS = ALL.slice(0, 5), RCPS = ALL.slice(5);
  var COLORS = { ssp119: "#00adcf", ssp126: "#173c66", ssp245: "#f79420", ssp370: "#e71d25", ssp585: "#951b1e",
                 rcp26: "#5b8db8", rcp45: "#b8942a", rcp85: "#b0413e" };
  var LABELS = { ssp119: "SSP1-1.9 (very low emissions)", ssp126: "SSP1-2.6 (low)",
                 ssp245: "SSP2-4.5 (middle of the road)", ssp370: "SSP3-7.0 (high)",
                 ssp585: "SSP5-8.5 (very high)", rcp26: "RCP2.6", rcp45: "RCP4.5", rcp85: "RCP8.5" };
  var SHORT = { ssp119: "SSP1-1.9", ssp126: "SSP1-2.6", ssp245: "SSP2-4.5", ssp370: "SSP3-7.0",
                ssp585: "SSP5-8.5", rcp26: "RCP2.6", rcp45: "RCP4.5", rcp85: "RCP8.5" };
  var NS = "http://www.w3.org/2000/svg";

  var checked = { ssp119: true, ssp126: true, ssp245: true, ssp370: true, ssp585: true,
                  rcp26: false, rcp45: false, rcp85: false };
  var showBand = false;
  var currentRec = null, chartHolder = null;
  var selYear = null, markerApi = null, viewer = null;
  var viewerScen = "ssp245", viewerMode = "retreat", viewerRange = "median", viewerSpeed = 10;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pct(v) { return v === null || v === undefined ? "n/a" : Math.round(v) + "%"; }
  function km2(v) { return v >= 10 ? v.toFixed(1) : v.toFixed(2); }
  function isRcp(sc) { return sc.indexOf("rcp") === 0; }

  /* ---------------------------------------------------------------
     Chart panel (right side)
  --------------------------------------------------------------- */
  var panel = el("div", "proj-panel");
  panel.style.display = "none";
  var closeBtn = el("button", "proj-btn proj-close", "\u00d7");
  closeBtn.title = "Close";
  closeBtn.onclick = function () { panel.style.display = "none"; };
  var wideBtn = el("button", "proj-btn proj-expand", "\u2922");
  wideBtn.title = "Make the panel larger or smaller";
  wideBtn.onclick = function () {
    panel.classList.toggle("proj-wide");
    setTimeout(redraw, 60);
  };
  var heading = el("div", "proj-heading", "Projected area change, 2000 to 2100");
  var idLine = el("div", "proj-id");
  var body = el("div", "proj-body");
  panel.appendChild(wideBtn);
  panel.appendChild(closeBtn);
  panel.appendChild(heading);
  panel.appendChild(idLine);
  panel.appendChild(body);
  document.body.appendChild(panel);

  function chart(rec) {
    markerApi = null;
    var W = Math.max(320, Math.min(1000, (chartHolder && chartHolder.clientWidth) || 560));
    var H = Math.max(250, Math.min(520, Math.round(W * 0.6)));
    var pl = 46, pr = 14, pt = 12, pb = 32;
    var y0 = rec.years[0], y1 = rec.years[1];
    var active = ALL.filter(function (sc) { return rec[sc] && checked[sc]; });
    var ymax = 100;
    active.forEach(function (sc) {
      rec[sc].p90.forEach(function (v) { if (v !== null && v > ymax) ymax = v; });
    });
    ymax = Math.ceil(ymax / 10) * 10;
    var step = ymax <= 100 ? 25 : 20;
    function X(y) { return pl + (y - y0) / (y1 - y0) * (W - pl - pr); }
    function Y(v) { return pt + (1 - v / ymax) * (H - pt - pb); }

    var wrap = el("div", "proj-chartwrap");
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img" }, wrap);
    s.setAttribute("aria-label", "Projected glacier area as a percent of the 2000 area, 2000 to 2100");

    for (var t = 0; t <= ymax; t += step) {
      svg("line", { x1: pl, x2: W - pr, y1: Y(t), y2: Y(t), stroke: "#e3e3e3", "stroke-width": 1 }, s);
      var lab = svg("text", { x: pl - 6, y: Y(t) + 4, "text-anchor": "end", "font-size": 11, fill: "#666" }, s);
      lab.textContent = t + "%";
    }
    for (var yr = y0; yr <= y1; yr += 25) {
      svg("line", { x1: X(yr), x2: X(yr), y1: H - pb, y2: H - pb + 4, stroke: "#999", "stroke-width": 1 }, s);
      var xl = svg("text", { x: X(yr), y: H - pb + 17, "text-anchor": "middle", "font-size": 11, fill: "#666" }, s);
      xl.textContent = yr;
    }
    var yt = svg("text", { transform: "translate(12," + (pt + (H - pt - pb) / 2) + ") rotate(-90)",
                           "text-anchor": "middle", "font-size": 11, fill: "#666" }, s);
    yt.textContent = "% of 2000 area";

    if (!active.length) {
      var none = svg("text", { x: W / 2, y: H / 2, "text-anchor": "middle", "font-size": 13, fill: "#888" }, s);
      none.textContent = "Tick a scenario below to draw it";
      return wrap;
    }

    if (showBand) {
      active.forEach(function (sc) {
        var p10 = rec[sc].p10, p90 = rec[sc].p90, up = [], down = [];
        for (var i = 0; i < p10.length; i++) {
          if (p10[i] === null || p90[i] === null) continue;
          up.push(X(y0 + i).toFixed(1) + "," + Y(p90[i]).toFixed(1));
          down.unshift(X(y0 + i).toFixed(1) + "," + Y(p10[i]).toFixed(1));
        }
        if (up.length) svg("polygon", { points: up.concat(down).join(" "), fill: COLORS[sc],
                                        "fill-opacity": 0.16, stroke: "none" }, s);
      });
    }
    active.forEach(function (sc) {
      var m = rec[sc].median, pts = [];
      for (var i = 0; i < m.length; i++) {
        if (m[i] !== null) pts.push(X(y0 + i).toFixed(1) + "," + Y(m[i]).toFixed(1));
      }
      var attrs = { points: pts.join(" "), fill: "none", stroke: COLORS[sc],
                    "stroke-width": 2.4, "stroke-linejoin": "round" };
      if (isRcp(sc)) attrs["stroke-dasharray"] = "6 4";
      if (pts.length) svg("polyline", attrs, s);
    });

    /* marker that follows the year slider of the glacier view */
    var mline = svg("line", { y1: pt, y2: H - pb, stroke: "#333", "stroke-width": 1.2, visibility: "hidden" }, s);
    var mdots = {};
    active.forEach(function (sc) {
      mdots[sc] = svg("circle", { r: 4.5, fill: COLORS[sc], stroke: "#fff", "stroke-width": 1.5,
                                  visibility: "hidden" }, s);
    });
    function setMarker(year) {
      if (year === null || year === undefined) {
        mline.setAttribute("visibility", "hidden");
        active.forEach(function (sc) { mdots[sc].setAttribute("visibility", "hidden"); });
        return;
      }
      var i = Math.max(0, Math.min(y1 - y0, Math.round(year - y0)));
      mline.setAttribute("x1", X(y0 + i));
      mline.setAttribute("x2", X(y0 + i));
      mline.setAttribute("visibility", "visible");
      active.forEach(function (sc) {
        var v = rec[sc].median[i];
        if (v === null) { mdots[sc].setAttribute("visibility", "hidden"); return; }
        mdots[sc].setAttribute("cx", X(y0 + i));
        mdots[sc].setAttribute("cy", Y(v));
        mdots[sc].setAttribute("visibility", "visible");
      });
    }
    markerApi = setMarker;
    setMarker(selYear);

    var vline = svg("line", { y1: pt, y2: H - pb, stroke: "#888", "stroke-width": 1,
                              "stroke-dasharray": "3 3", visibility: "hidden" }, s);
    var tip = el("div", "proj-tip");
    tip.style.display = "none";
    wrap.appendChild(tip);
    var hit = svg("rect", { x: pl, y: pt, width: W - pl - pr, height: H - pt - pb, fill: "transparent" }, s);
    function yearAt(ev) {
      var r = s.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width * W;
      var yy = Math.round(y0 + (px - pl) / (W - pl - pr) * (y1 - y0));
      return Math.max(y0, Math.min(y1, yy));
    }
    hit.addEventListener("mousemove", function (ev) {
      var yy = yearAt(ev), i = yy - y0;
      vline.setAttribute("x1", X(yy));
      vline.setAttribute("x2", X(yy));
      vline.setAttribute("visibility", "visible");
      tip.textContent = "";
      tip.appendChild(el("div", "proj-tip-year", String(yy)));
      active.forEach(function (sc) {
        var d = el("div", "", SHORT[sc] + ": " + pct(rec[sc].median[i]) + " (" +
                   pct(rec[sc].p10[i]) + " to " + pct(rec[sc].p90[i]) + ")");
        d.style.color = COLORS[sc];
        tip.appendChild(d);
      });
      tip.style.display = "block";
    });
    hit.addEventListener("mouseleave", function () {
      vline.setAttribute("visibility", "hidden");
      tip.style.display = "none";
    });
    hit.addEventListener("click", function (ev) {
      if (viewer) viewer.setYear(yearAt(ev));
    });
    return wrap;
  }

  function redraw() {
    if (!currentRec || !chartHolder) return;
    chartHolder.textContent = "";
    chartHolder.appendChild(chart(currentRec));
  }
  window.addEventListener("resize", redraw);

  function scenarioRow(rec, sc) {
    var d = rec[sc];
    var row = el("label", "proj-row");
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!checked[sc];
    cb.addEventListener("change", function () { checked[sc] = cb.checked; redraw(); });
    var sw = el("span", "proj-swatch" + (isRcp(sc) ? " proj-dashed" : ""));
    sw.style.borderTopColor = COLORS[sc];
    var m = d.median, last = m.length - 1, end = m[last];
    var txt = el("span", "proj-rowtext");
    txt.appendChild(el("strong", "", LABELS[sc]));
    var detail;
    if (end === null) {
      detail = ": no result";
    } else {
      detail = ": " + pct(end) + " of the 2000 area left in " + rec.years[1] +
               " (about " + km2(rec.area_km2 * end / 100) + " km2; model range " +
               pct(d.p10[last]) + " to " + pct(d.p90[last]) + ")";
      for (var i = 0; i < m.length; i++) {
        if (m[i] !== null && m[i] < 0.5) { detail += ". Gone by about " + (rec.years[0] + i); break; }
      }
    }
    txt.appendChild(document.createTextNode(detail));
    row.appendChild(cb);
    row.appendChild(sw);
    row.appendChild(txt);
    return row;
  }

  function modelsText(rec, list) {
    var seen = [];
    list.forEach(function (sc) { if (rec[sc] && seen.indexOf(rec[sc].n) < 0) seen.push(rec[sc].n); });
    return seen.join(" or ");
  }

  function render(id, rec) {
    body.textContent = "";
    chartHolder = null;
    currentRec = null;
    markerApi = null;
    idLine.textContent = id;
    if (!rec) {
      body.appendChild(el("p", "proj-warn",
        "No projection available for this glacier. The projections were made for the older RGI 6.0 " +
        "inventory, and this glacier does not overlap any glacier in it. It may be a glacier that was " +
        "only mapped in RGI 7.0."));
      return;
    }
    currentRec = rec;

    var bandLabel = el("label", "proj-toggle");
    var bandCb = document.createElement("input");
    bandCb.type = "checkbox";
    bandCb.checked = showBand;
    bandCb.addEventListener("change", function () { showBand = bandCb.checked; redraw(); });
    bandLabel.appendChild(bandCb);
    bandLabel.appendChild(document.createTextNode(" Show model range (10th to 90th percentile)"));
    body.appendChild(bandLabel);

    chartHolder = el("div", "proj-chart");
    body.appendChild(chartHolder);
    redraw();

    var list = el("div", "proj-list");
    SSPS.forEach(function (sc) { if (rec[sc]) list.appendChild(scenarioRow(rec, sc)); });
    var rc = RCPS.filter(function (sc) { return rec[sc]; });
    if (rc.length) {
      var det = el("details", "proj-details");
      det.appendChild(el("summary", "", "Older RCP scenarios (CMIP5 models)"));
      rc.forEach(function (sc) { det.appendChild(scenarioRow(rec, sc)); });
      list.appendChild(det);
    }
    body.appendChild(list);

    var q = rec.match || {};
    if (q.quality && q.quality !== "good") {
      body.appendChild(el("p", "proj-warn",
        (q.quality === "partial" ? "Partial match: " : "Weak match: ") +
        "the old glaciers behind this projection cover only about " + Math.round(q.coverage * 100) +
        "% of this outline. Treat the curves as indicative."));
    }
    var nS = modelsText(rec, SSPS), nR = modelsText(rec, RCPS);
    body.appendChild(el("p", "proj-note",
      "Lines: median of " + (nS || "the") + " climate models for the SSP scenarios" +
      (nR ? " (" + nR + " for the older RCP scenarios, which come from a different model generation)" : "") +
      ". Band: 10th to 90th percentile of the models. Values are the share of the 2000 area left, " +
      "taken from the old RGI 6.0 glacier(s) that overlap this outline; km2 applies that share to the " +
      "RGI 7.0 area. Projections for single small glaciers are much less certain than the regional " +
      "picture. Source: Rounce et al. (2023), PyGEM-OGGM glacier projections, NSIDC."));
  }

  var cache = {}, currentId = null;
  function getRec(id) {
    if (cache[id] !== undefined) return Promise.resolve(cache[id]);
    return fetch(DATA_DIR + id + ".json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (rec) { cache[id] = rec; return rec; });
  }
  function show(id) {
    if (id === currentId && panel.style.display !== "none") return;
    currentId = id;
    panel.style.display = "block";
    idLine.textContent = id;
    body.textContent = "Loading...";
    getRec(id).then(function (rec) { if (id === currentId) render(id, rec); });
  }

  /* ---------------------------------------------------------------
     Glacier view (inside the details popup)
  --------------------------------------------------------------- */
  function prepareShape(geom, term) {
    var polys = geom && geom.type === "Polygon" ? [geom.coordinates]
              : geom && geom.type === "MultiPolygon" ? geom.coordinates : null;
    if (!polys) return null;
    var minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    polys.forEach(function (p) { p.forEach(function (ring) { ring.forEach(function (c) {
      if (c[0] < minLon) minLon = c[0];
      if (c[0] > maxLon) maxLon = c[0];
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
    }); }); });
    var lon0 = (minLon + maxLon) / 2, lat0 = (minLat + maxLat) / 2;
    var kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
    function proj(c) { return [(c[0] - lon0) * kx, (c[1] - lat0) * ky]; }
    var rings = [];
    polys.forEach(function (p) { p.forEach(function (ring) { rings.push(ring.map(proj)); }); });
    var bx0 = (minLon - lon0) * kx, bx1 = (maxLon - lon0) * kx;
    var by0 = (minLat - lat0) * ky, by1 = (maxLat - lat0) * ky;

    function inside(x, y) {
      var c = false;
      for (var r = 0; r < rings.length; r++) {
        var ring = rings[r];
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
          if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
        }
      }
      return c;
    }
    /* sample points inside the glacier; they tell us how much area lies beyond a given distance */
    var pts = [], step = Math.sqrt(Math.max(1, (bx1 - bx0) * (by1 - by0)) / 6000);
    for (var attempt = 0; attempt < 6; attempt++) {
      pts = [];
      for (var x = bx0 + step / 2; x < bx1; x += step) {
        for (var y = by0 + step / 2; y < by1; y += step) {
          if (inside(x, y)) pts.push([x, y]);
        }
      }
      if (pts.length >= 300 || step < 1) break;
      step *= 0.6;
    }
    if (!pts.length) return null;
    var cx = 0, cy = 0;
    pts.forEach(function (p) { cx += p[0]; cy += p[1]; });
    cx /= pts.length; cy /= pts.length;

    var T = null, dist = null;
    if (term && isFinite(term[0]) && isFinite(term[1])) {
      T = proj(term);
      dist = pts.map(function (p) { return Math.hypot(p[0] - T[0], p[1] - T[1]); }).sort(function (a, b) { return a - b; });
    }
    return { rings: rings, bx0: bx0, bx1: bx1, by0: by0, by1: by1, C: [cx, cy], T: T, dist: dist };
  }

  function buildViewer(root, rec, shape) {
    var scens = ALL.filter(function (sc) { return rec[sc]; });
    if (!scens.length) {
      root.appendChild(el("div", "gv-note", "No scenario data for this glacier."));
      return null;
    }
    if (scens.indexOf(viewerScen) < 0) viewerScen = scens[0];
    var y0 = rec.years[0], y1 = rec.years[1];
    var yearF = y0, playing = false, raf = null, lastTs = 0;

    var W = 380, H = 300, dpr = window.devicePixelRatio || 1;
    root.appendChild(el("div", "gv-title", "Glacier view"));
    var readout = el("div", "gv-readout");
    root.appendChild(readout);
    var canvas = document.createElement("canvas");
    canvas.className = "gv-canvas";
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    root.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var bar = el("div", "gv-bar");
    var playBtn = el("button", "gv-play", "\u25b6");
    playBtn.title = "Play";
    var slider = document.createElement("input");
    slider.type = "range";
    slider.className = "gv-slider";
    slider.min = y0;
    slider.max = y1;
    slider.step = 1;
    slider.value = y0;
    bar.appendChild(playBtn);
    bar.appendChild(slider);
    root.appendChild(bar);

    function makeSelect(label, options, value, onchange) {
      var wrap = el("label", "gv-opt");
      wrap.appendChild(el("span", "", label));
      var sel = document.createElement("select");
      options.forEach(function (o) {
        var op = document.createElement("option");
        op.value = o[0];
        op.textContent = o[1];
        sel.appendChild(op);
      });
      sel.value = value;
      sel.addEventListener("change", function () { onchange(sel.value); });
      wrap.appendChild(sel);
      return wrap;
    }
    var opts = el("div", "gv-opts");
    opts.appendChild(makeSelect("Scenario", scens.map(function (sc) { return [sc, LABELS[sc]]; }),
      viewerScen, function (v) { viewerScen = v; render(yearF); }));
    opts.appendChild(makeSelect("Model range", [["median", "Typical (median of models)"],
      ["high", "Smaller loss (90th percentile)"], ["low", "Larger loss (10th percentile)"]],
      viewerRange, function (v) { viewerRange = v; render(yearF); }));
    opts.appendChild(makeSelect("Shrink style", [["retreat", "Retreat from the lowest end"],
      ["uniform", "Shrink evenly toward the centre"]],
      viewerMode, function (v) { viewerMode = v; render(yearF); }));
    opts.appendChild(makeSelect("Speed", [["5", "Slow"], ["10", "Normal"], ["20", "Fast"]],
      String(viewerSpeed), function (v) { viewerSpeed = +v; }));
    root.appendChild(opts);
    root.appendChild(el("div", "gv-note",
      "Schematic: the model gives how much ice is left, not where. The ice is drawn retreating from the " +
      "lowest end (the terminus); the dashed line is the 2000 outline."));

    /* fit the outline to the canvas */
    var pad = 26;
    var sw = Math.max(1, shape.bx1 - shape.bx0), sh = Math.max(1, shape.by1 - shape.by0);
    var scale = Math.min((W - 2 * pad) / sw, (H - 2 * pad) / sh);
    var mx = (shape.bx0 + shape.bx1) / 2, my = (shape.by0 + shape.by1) / 2;
    function P(p) { return [W / 2 + (p[0] - mx) * scale, H / 2 - (p[1] - my) * scale]; }
    function tracePath() {
      ctx.beginPath();
      shape.rings.forEach(function (ring) {
        ring.forEach(function (p, i) {
          var q = P(p);
          if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
        });
        ctx.closePath();
      });
    }
    function radiusFor(f) {
      var n = shape.dist.length;
      if (f >= 1) return 0;
      var idx = Math.min(n - 1, Math.floor((1 - f) * n));
      return shape.dist[idx];
    }

    function fracAt(y) {
      var key = viewerRange === "high" ? "p90" : viewerRange === "low" ? "p10" : "median";
      var arr = rec[viewerScen][key];
      var f = y - y0, i = Math.floor(f), t = f - i;
      var a = arr[Math.max(0, Math.min(arr.length - 1, i))];
      var b = arr[Math.max(0, Math.min(arr.length - 1, i + 1))];
      if (a === null) a = b;
      if (b === null) b = a;
      if (a === null) return null;
      return (a + (b - a) * t) / 100;
    }

    function draw(frac) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#eef3f7";
      ctx.fillRect(0, 0, W, H);

      tracePath();                                   /* ghost of the 2000 outline */
      ctx.fillStyle = "#dde3ea";
      ctx.fill("evenodd");
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "#8794a3";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);

      var shown = Math.min(1, frac);
      if (shown > 0.0005) {
        ctx.save();
        if (viewerMode === "retreat" && shape.T) {
          var t = P(shape.T), r = radiusFor(shown) * scale;
          ctx.beginPath();
          ctx.rect(0, 0, W, H);
          ctx.moveTo(t[0] + r, t[1]);
          ctx.arc(t[0], t[1], r, 0, 2 * Math.PI);
          ctx.clip("evenodd");
        } else {
          var k = Math.sqrt(shown), c = P(shape.C);
          ctx.translate(c[0], c[1]);
          ctx.scale(k, k);
          ctx.translate(-c[0], -c[1]);
        }
        tracePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill("evenodd");
        ctx.fillStyle = "rgba(90, 169, 214, 0.55)";
        ctx.fill("evenodd");
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "#1f6f9f";
        ctx.stroke();
        ctx.restore();
      }
      if (shape.T) {                                 /* terminus position in 2000 */
        var tp = P(shape.T);
        ctx.beginPath();
        ctx.arc(tp[0], tp[1], 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = "#f79420";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      }
      /* scale bar and north arrow */
      var nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000], meters = nice[0];
      nice.forEach(function (m) { if (m * scale <= W * 0.28) meters = m; });
      var len = meters * scale;
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, H - 14);
      ctx.lineTo(12 + len, H - 14);
      ctx.stroke();
      ctx.fillStyle = "#333";
      ctx.font = "11px system-ui, Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(meters >= 1000 ? (meters / 1000) + " km" : meters + " m", 12, H - 20);
      ctx.textAlign = "center";
      ctx.fillText("N", W - 16, 18);
      ctx.beginPath();
      ctx.moveTo(W - 16, 22);
      ctx.lineTo(W - 16, 38);
      ctx.stroke();
    }

    function render(y) {
      var f = fracAt(y);
      var yr = Math.round(y);
      slider.value = yr;
      selYear = yr;
      if (markerApi) markerApi(yr);
      draw(f === null ? 0 : f);
      readout.textContent = "";
      readout.appendChild(el("span", "gv-year", String(yr)));
      var txt;
      if (f === null) txt = "  no result";
      else if (f < 0.005) txt = "  gone (less than 1% of the 2000 area left)";
      else txt = "  " + km2(rec.area_km2 * f) + " km2 left, " + Math.round(f * 100) + "% of the 2000 area";
      readout.appendChild(document.createTextNode(txt));
    }

    function setPlayIcon() {
      playBtn.textContent = playing ? "\u275a\u275a" : "\u25b6";
      playBtn.title = playing ? "Pause" : "Play";
    }
    function tick(ts) {
      if (!playing) return;
      if (!lastTs) lastTs = ts;
      yearF += (ts - lastTs) / 1000 * viewerSpeed;
      lastTs = ts;
      if (yearF >= y1) { yearF = y1; playing = false; setPlayIcon(); }
      render(yearF);
      if (playing) raf = requestAnimationFrame(tick);
    }
    playBtn.addEventListener("click", function () {
      if (playing) { playing = false; setPlayIcon(); return; }
      if (yearF >= y1) yearF = y0;
      playing = true;
      lastTs = 0;
      setPlayIcon();
      raf = requestAnimationFrame(tick);
    });
    slider.addEventListener("input", function () {
      playing = false;
      setPlayIcon();
      yearF = +slider.value;
      render(yearF);
    });

    render(yearF);
    return {
      setYear: function (y) {
        playing = false;
        setPlayIcon();
        yearF = Math.max(y0, Math.min(y1, y));
        render(yearF);
      },
      destroy: function () {
        playing = false;
        if (raf) cancelAnimationFrame(raf);
      }
    };
  }

  function relayout(popup) {            /* do not call popup.update(): it would rebuild the content */
    try {
      if (popup._updateLayout) popup._updateLayout();
      if (popup._updatePosition) popup._updatePosition();
      if (popup._adjustPan) popup._adjustPan();
    } catch (err) {}
  }

  function geometryOf(popup) {
    var src = popup && popup._source;
    if (!src) return null;
    var g = src.feature && src.feature.geometry;
    if (!g && src.toGeoJSON) {
      try { g = src.toGeoJSON().geometry; } catch (err) {}
    }
    return g || null;
  }

  function mountViewer(popup, id) {
    var node = popup && popup._contentNode;
    if (!node || node.querySelector(".gv-root")) return;
    if (viewer) { viewer.destroy(); viewer = null; }
    var geom = geometryOf(popup);
    var root = el("div", "gv-root");
    root.appendChild(el("div", "gv-note", "Loading glacier view..."));
    node.appendChild(root);
    popup.options.maxWidth = 460;
    popup.options.minWidth = 410;
    relayout(popup);
    getRec(id).then(function (rec) {
      if (!root.parentNode) return;
      root.textContent = "";
      if (!rec) {
        root.appendChild(el("div", "gv-note", "No projection available for this glacier, so there is nothing to animate."));
        relayout(popup);
        return;
      }
      var shape = prepareShape(geom, rec.term);
      if (!shape) {
        root.appendChild(el("div", "gv-note", "The outline is not available for the glacier view."));
        relayout(popup);
        return;
      }
      viewer = buildViewer(root, rec, shape);
      relayout(popup);
    });
  }

  function closeViewer() {
    if (viewer) { viewer.destroy(); viewer = null; }
    selYear = null;
    if (markerApi) markerApi(null);
  }

  /* ---------------------------------------------------------------
     Wiring to the Leaflet map
  --------------------------------------------------------------- */
  function findId(layer) {
    var props = (layer && layer.feature && layer.feature.properties) || {};
    for (var k in props) {
      var v = props[k];
      if (typeof v === "string") { var m = v.match(ID_RE); if (m) return m[0]; }
    }
    return null;
  }

  function attach(group) {
    if (group.__projHooked) return;
    group.__projHooked = true;
    group.on("click", function (e) {
      var id = findId(e.layer || e.target);
      if (id) show(id);
    });
  }

  function hook(map) {
    map.on("popupopen", function (e) {
      var node = e.popup && e.popup._contentNode;
      var m = (node ? node.innerHTML : "").match(ID_RE);
      if (m) { show(m[0]); mountViewer(e.popup, m[0]); }
    });
    map.on("popupclose", closeViewer);
    map.eachLayer(function (l) { if (l instanceof L.GeoJSON) attach(l); });
    map.on("layeradd", function (e) { if (e.layer instanceof L.GeoJSON) attach(e.layer); });
  }

  var tries = 0;
  function findMap() {
    try {
      for (var k in window) {
        if (/^map_[0-9a-f]+$/.test(k) && window.L && window[k] instanceof L.Map) return window[k];
      }
    } catch (err) {}
    return null;
  }
  function init() {
    var map = findMap();
    if (!map) { if (tries++ < 100) setTimeout(init, 100); return; }
    hook(map);
  }
  init();
})();

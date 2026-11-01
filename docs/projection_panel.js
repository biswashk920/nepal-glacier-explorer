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

    var vline = svg("line", { y1: pt, y2: H - pb, stroke: "#888", "stroke-width": 1,
                              "stroke-dasharray": "3 3", visibility: "hidden" }, s);
    var tip = el("div", "proj-tip");
    tip.style.display = "none";
    wrap.appendChild(tip);
    var hit = svg("rect", { x: pl, y: pt, width: W - pl - pr, height: H - pt - pb, fill: "transparent" }, s);
    hit.addEventListener("mousemove", function (ev) {
      var r = s.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width * W;
      var yy = Math.round(y0 + (px - pl) / (W - pl - pr) * (y1 - y0));
      yy = Math.max(y0, Math.min(y1, yy));
      var i = yy - y0;
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
  function show(id) {
    if (id === currentId && panel.style.display !== "none") return;
    currentId = id;
    panel.style.display = "block";
    idLine.textContent = id;
    body.textContent = "Loading...";
    function done(rec) { if (id === currentId) render(id, rec); }
    if (cache[id] !== undefined) { done(cache[id]); return; }
    fetch(DATA_DIR + id + ".json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rec) { cache[id] = rec; done(rec); })
      .catch(function () { done(null); });
  }

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
      if (m) show(m[0]);
    });
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

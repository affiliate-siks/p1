const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const RAW_JSON_PATH = path.join(ROOT, "data", "raw-response.json");
const REPORTS_DIR = path.join(ROOT, "reports");
const OWNERS_DIR = path.join(ROOT, "owners");
const PROFILES_DIR = path.join(ROOT, "profiles");
const CSS_SOURCE = path.join(ROOT, "src", "template.css");
const CSS_TARGET_DIR = path.join(ROOT, "assets");
const CSS_TARGET = path.join(CSS_TARGET_DIR, "app.css");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function removeDirContents(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function fmt(value, decimals = 0) {
  const num = Number(value || 0);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function pctChange(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (p === 0) return c === 0 ? 0 : 100;
  return ((c - p) / p) * 100;
}

function readReports() {
  if (!fs.existsSync(RAW_JSON_PATH)) {
    throw new Error(`Nedostaje ${RAW_JSON_PATH}`);
  }

  const raw = fs.readFileSync(RAW_JSON_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed.ok) {
    throw new Error(parsed.error || "Apps Script endpoint nije vratio ok=true");
  }

  return Array.isArray(parsed.reports) ? parsed.reports : [];
}

function groupBy(arr, keyGetter) {
  return arr.reduce((acc, item) => {
    const key = keyGetter(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function summarizeReports(reports) {
  const s = {
    reports_count: reports.length,
    views_current_total: 0,
    views_previous_total: 0,
    interactions_current_total: 0,
    interactions_previous_total: 0,
    new_followers_current_total: 0,
    new_followers_previous_total: 0,
    ads_impressions_total: 0,
    ads_clicks_total: 0,
  };

  reports.forEach((r) => {
    const o = r.organic || {};
    s.views_current_total += Number(o.views_current || 0);
    s.views_previous_total += Number(o.views_previous || 0);
    s.interactions_current_total += Number(o.interactions_current || 0);
    s.interactions_previous_total += Number(o.interactions_previous || 0);
    s.new_followers_current_total += Number(o.new_followers_current || 0);
    s.new_followers_previous_total += Number(o.new_followers_previous || 0);

    (r.ads || []).forEach((a) => {
      s.ads_impressions_total += Number(a.impressions || 0);
      s.ads_clicks_total += Number(a.clicks || 0);
    });
  });

  s.views_change_pct = pctChange(s.views_current_total, s.views_previous_total);
  s.interactions_change_pct = pctChange(s.interactions_current_total, s.interactions_previous_total);
  s.new_followers_change_pct = pctChange(s.new_followers_current_total, s.new_followers_previous_total);
  s.ads_ctr_pct = s.ads_impressions_total ? (s.ads_clicks_total / s.ads_impressions_total) * 100 : 0;

  return s;
}

function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="/assets/app.css" />
</head>
<body>
  <div class="wrap">
    ${body}
  </div>
</body>
</html>`;
}

function renderIndexPage(reports) {
  const summary = summarizeReports(reports);
  const owners = [...new Set(reports.map(r => r.owner).filter(Boolean))].sort();
  const profiles = [...new Set(reports.map(r => r.profile).filter(Boolean))].sort();

  const latestCards = reports
    .slice()
    .sort((a, b) => String(b.report_date || "").localeCompare(String(a.report_date || "")))
    .slice(0, 30)
    .map(r => {
      return `
        <div class="card">
          <div class="title">${esc(r.profile || "-")}</div>
          <div class="muted">${esc(r.owner || "-")} • ${esc(r.report_date || "-")}</div>
          <div class="row"><span>Views</span><strong>${fmt(r.organic?.views_current || 0)}</strong></div>
          <div class="row"><span>Interactions</span><strong>${fmt(r.organic?.interactions_current || 0)}</strong></div>
          <div style="margin-top:14px">
            <a class="btn btn-primary" href="/reports/${esc(r.report_id)}.html">Otvori report</a>
          </div>
        </div>
      `;
    }).join("");

  return layout("Instagram Reports", `
    <section class="section">
      <div class="hero">
        <h1>Instagram Reports</h1>
        <p>Automatski generisani pregled reporta, zaposlenih i naloga.</p>
      </div>
    </section>

    <section class="section grid g4">
      <div class="card">
        <h3>Ukupno reporta</h3>
        <div class="metric">${fmt(summary.reports_count)}</div>
        <div class="muted">Svi sačuvani reporti</div>
      </div>
      <div class="card">
        <h3>Ukupni views</h3>
        <div class="metric">${fmt(summary.views_current_total)}</div>
        <div class="muted">Promjena: ${fmt(summary.views_change_pct, 2)}%</div>
      </div>
      <div class="card">
        <h3>Ukupne interactions</h3>
        <div class="metric">${fmt(summary.interactions_current_total)}</div>
        <div class="muted">Promjena: ${fmt(summary.interactions_change_pct, 2)}%</div>
      </div>
      <div class="card">
        <h3>Novi pratioci</h3>
        <div class="metric">${fmt(summary.new_followers_current_total)}</div>
        <div class="muted">Ads CTR: ${fmt(summary.ads_ctr_pct, 2)}%</div>
      </div>
    </section>

    <section class="section">
      <div class="card">
        <h3>Zaposleni</h3>
        <div class="pill-wrap">
          ${owners.map(owner => `<a class="pill" href="/owners/${slugify(owner)}/">${esc(owner)}</a>`).join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="card">
        <h3>Profili</h3>
        <div class="pill-wrap">
          ${profiles.map(profile => `<a class="pill" href="/profiles/${slugify(profile)}/">${esc(profile)}</a>`).join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="card">
        <h3>Posljednji reporti</h3>
        <div class="grid g3">
          ${latestCards || `<div class="muted">Nema reporta.</div>`}
        </div>
      </div>
    </section>
  `);
}

function renderOwnerPage(owner, reports) {
  const summary = summarizeReports(reports);
  const cards = reports
    .slice()
    .sort((a, b) => String(b.report_date || "").localeCompare(String(a.report_date || "")))
    .map(r => `
      <div class="card">
        <div class="title">${esc(r.profile || "-")}</div>
        <div class="muted">${esc(r.report_date || "-")} • ${esc(r.period_label || "-")}</div>
        <div class="row"><span>Views</span><strong>${fmt(r.organic?.views_current || 0)}</strong></div>
        <div class="row"><span>Interactions</span><strong>${fmt(r.organic?.interactions_current || 0)}</strong></div>
        <div style="margin-top:14px">
          <a class="btn btn-primary" href="/reports/${esc(r.report_id)}.html">Otvori report</a>
        </div>
      </div>
    `).join("");

  return layout(owner, `
    <section class="section">
      <div class="hero">
        <h1>${esc(owner)}</h1>
        <p>Pregled svih reporta za zaposlenog.</p>
      </div>
    </section>

    <section class="section grid g4">
      <div class="card">
        <h3>Broj reporta</h3>
        <div class="metric">${fmt(summary.reports_count)}</div>
      </div>
      <div class="card">
        <h3>Views</h3>
        <div class="metric">${fmt(summary.views_current_total)}</div>
      </div>
      <div class="card">
        <h3>Interactions</h3>
        <div class="metric">${fmt(summary.interactions_current_total)}</div>
      </div>
      <div class="card">
        <h3>Novi pratioci</h3>
        <div class="metric">${fmt(summary.new_followers_current_total)}</div>
      </div>
    </section>

    <section class="section">
      <a class="btn" href="/">Početna</a>
    </section>

    <section class="section">
      <div class="grid g3">${cards}</div>
    </section>
  `);
}

function renderProfilePage(profile, reports) {
  const summary = summarizeReports(reports);
  const cards = reports
    .slice()
    .sort((a, b) => String(b.report_date || "").localeCompare(String(a.report_date || "")))
    .map(r => `
      <div class="card">
        <div class="title">${esc(r.owner || "-")}</div>
        <div class="muted">${esc(r.report_date || "-")} • ${esc(r.period_label || "-")}</div>
        <div class="row"><span>Views</span><strong>${fmt(r.organic?.views_current || 0)}</strong></div>
        <div class="row"><span>Interactions</span><strong>${fmt(r.organic?.interactions_current || 0)}</strong></div>
        <div style="margin-top:14px">
          <a class="btn btn-primary" href="/reports/${esc(r.report_id)}.html">Otvori report</a>
        </div>
      </div>
    `).join("");

  return layout(profile, `
    <section class="section">
      <div class="hero">
        <h1>${esc(profile)}</h1>
        <p>Pregled svih reporta za profil.</p>
      </div>
    </section>

    <section class="section grid g4">
      <div class="card">
        <h3>Broj reporta</h3>
        <div class="metric">${fmt(summary.reports_count)}</div>
      </div>
      <div class="card">
        <h3>Views</h3>
        <div class="metric">${fmt(summary.views_current_total)}</div>
      </div>
      <div class="card">
        <h3>Interactions</h3>
        <div class="metric">${fmt(summary.interactions_current_total)}</div>
      </div>
      <div class="card">
        <h3>Novi pratioci</h3>
        <div class="metric">${fmt(summary.new_followers_current_total)}</div>
      </div>
    </section>

    <section class="section">
      <a class="btn" href="/">Početna</a>
    </section>

    <section class="section">
      <div class="grid g3">${cards}</div>
    </section>
  `);
}

function renderSingleReportPage(report) {
  const o = report.organic || {};
  const ads = Array.isArray(report.ads) ? report.ads : [];
  const topViews = Array.isArray(report.topViews) ? report.topViews : [];
  const topLikes = Array.isArray(report.topLikes) ? report.topLikes : [];

  const adsRows = ads.length
    ? ads.map((a) => `
      <tr>
        <td>${esc(a.campaign_name || "-")}</td>
        <td>${fmt(a.budget || 0)}</td>
        <td>${fmt(a.impressions || 0)}</td>
        <td>${fmt(a.clicks || 0)}</td>
        <td>${fmt(a.ctr_pct || 0, 2)}%</td>
        <td>${fmt(a.revenue || 0)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6">Nema kampanja.</td></tr>`;

  const topViewsHtml = topViews.length
    ? topViews.map((p) => `
      <div class="mini-card">
        <div class="title">${esc(p.title || "-")}</div>
        <div class="muted">Views: ${fmt(p.value || 0)} • Interactions: ${fmt(p.interactions || 0)}</div>
        ${p.link ? `<div style="margin-top:10px"><a class="link" target="_blank" rel="noreferrer" href="${esc(p.link)}">Otvori objavu</a></div>` : ""}
        ${p.comment ? `<div class="muted" style="margin-top:10px">${esc(p.comment)}</div>` : ""}
      </div>
    `).join("")
    : `<div class="mini-card">Nema top views objava.</div>`;

  const topLikesHtml = topLikes.length
    ? topLikes.map((p) => `
      <div class="mini-card">
        <div class="title">${esc(p.title || "-")}</div>
        <div class="muted">Lajkovi: ${fmt(p.value || 0)} • Interactions: ${fmt(p.interactions || 0)}</div>
        ${p.link ? `<div style="margin-top:10px"><a class="link" target="_blank" rel="noreferrer" href="${esc(p.link)}">Otvori objavu</a></div>` : ""}
        ${p.comment ? `<div class="muted" style="margin-top:10px">${esc(p.comment)}</div>` : ""}
      </div>
    `).join("")
    : `<div class="mini-card">Nema top likes objava.</div>`;

  return layout(`${report.profile || "-"} ${report.report_date || ""}`, `
    <section class="section">
      <div class="hero">
        <h1>${esc(report.profile || "-")}</h1>
        <p>${esc(report.owner || "-")} • ${esc(report.period_label || "-")} • ${esc(report.report_date || "-")}</p>
      </div>
    </section>

    <section class="section">
      <a class="btn" href="/">Početna</a>
      <a class="btn" href="/owners/${slugify(report.owner || "bez-vlasnika")}/">Zaposleni</a>
      <a class="btn" href="/profiles/${slugify(report.profile || "bez-profila")}/">Profil</a>
    </section>

    <section class="section grid g4">
      <div class="card">
        <h3>Views</h3>
        <div class="metric">${fmt(o.views_current || 0)}</div>
        <div class="muted">Promjena: ${fmt(pctChange(o.views_current, o.views_previous), 2)}%</div>
      </div>
      <div class="card">
        <h3>Interactions

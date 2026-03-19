const fs = require("fs");
const path = require("path");

const BASE_PATH = path.join(process.cwd(), "MarketingTIm/1");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function loadReports() {
  const dataPath = path.join(BASE_PATH, "data", "reports.json");

  if (!fs.existsSync(dataPath)) {
    console.log("MarketingTIm/1/data/reports.json ne postoji, pravim prazan build.");
    return [];
  }

  const raw = fs.readFileSync(dataPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("MarketingTIm/1/data/reports.json mora biti niz report objekata.");
  }

  return parsed;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function relPath(fromDir, toPath) {
  let rel = path.relative(fromDir, toPath).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

function renderLayout(title, body, cssHref) {
  return `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${cssHref}" />
</head>
<body>
  <div class="wrap">
    ${body}
  </div>
</body>
</html>`;
}

function renderHomePage(reports) {
  const pageDir = BASE_PATH;
  const cssHref = "./src/template.css";

  const cards = reports
    .slice()
    .sort((a, b) => String(b.report_date || "").localeCompare(String(a.report_date || "")))
    .map((report) => {
      const reportFile = path.join(BASE_PATH, "reports", `${report.report_id}.html`);
      const reportHref = relPath(pageDir, reportFile);

      return `
        <article class="card">
          <h3>${escapeHtml(report.profile || "-")}</h3>
          <p class="muted">${escapeHtml(report.owner || "-")} • ${escapeHtml(report.report_date || "-")}</p>
          <div class="row"><span>Views</span><strong>${num(report.organic?.views_current)}</strong></div>
          <div class="row"><span>Interactions</span><strong>${num(report.organic?.interactions_current)}</strong></div>
          <a class="btn" href="${reportHref}">Otvori report</a>
        </article>
      `;
    })
    .join("");

  const owners = [...new Set(reports.map((r) => String(r.owner || "").trim()).filter(Boolean))]
    .sort()
    .map((owner) => {
      const ownerHref = relPath(pageDir, path.join(BASE_PATH, "owners", slugify(owner), "index.html"));
      return `<a class="pill" href="${ownerHref}">${escapeHtml(owner)}</a>`;
    })
    .join("");

  const profiles = [...new Set(reports.map((r) => String(r.profile || "").trim()).filter(Boolean))]
    .sort()
    .map((profile) => {
      const profileHref = relPath(pageDir, path.join(BASE_PATH, "profiles", slugify(profile), "index.html"));
      return `<a class="pill" href="${profileHref}">${escapeHtml(profile)}</a>`;
    })
    .join("");

  return renderLayout(
    "Instagram Reports",
    `
      <section class="hero">
        <h1>Instagram Reports</h1>
        <p>Automatski generisani pregled reporta.</p>
      </section>

      <section class="card">
        <h2>Zaposleni</h2>
        <div class="pill-wrap">
          ${owners || '<span class="muted">Nema zaposlenih.</span>'}
        </div>
      </section>

      <section class="card">
        <h2>Profili</h2>
        <div class="pill-wrap">
          ${profiles || '<span class="muted">Nema profila.</span>'}
        </div>
      </section>

      <section>
        <h2>Svi reporti</h2>
        <div class="grid">
          ${cards || '<div class="card"><p>Nema reporta.</p></div>'}
        </div>
      </section>
    `,
    cssHref
  );
}

function renderReportPage(report) {
  const pageDir = path.join(BASE_PATH, "reports");
  const cssHref = "../src/template.css";
  const homeHref = "../index.html";
  const ownerHref = `../owners/${slugify(report.owner)}/index.html`;
  const profileHref = `../profiles/${slugify(report.profile)}/index.html`;

  const o = report.organic || {};
  const ads = Array.isArray(report.ads) ? report.ads : [];
  const topViews = Array.isArray(report.topViews) ? report.topViews : [];
  const topLikes = Array.isArray(report.topLikes) ? report.topLikes : [];

  const adsRows = ads.length
    ? ads.map((a) => `
      <tr>
        <td>${escapeHtml(a.campaign_name || "-")}</td>
        <td>${num(a.budget)}</td>
        <td>${num(a.impressions)}</td>
        <td>${num(a.clicks)}</td>
        <td>${num(a.leads_registrations)}</td>
        <td>${num(a.revenue)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6">Nema kampanja.</td></tr>`;

  const topViewsHtml = topViews.length
    ? topViews.map((p) => `
      <div class="mini-card">
        <div class="mini-title">${escapeHtml(p.title || "-")}</div>
        <div class="muted">Views: ${num(p.value)} • Interactions: ${num(p.interactions)}</div>
        ${p.link ? `<a class="link" href="${escapeHtml(p.link)}" target="_blank" rel="noreferrer">Otvori objavu</a>` : ""}
        ${p.comment ? `<p>${escapeHtml(p.comment)}</p>` : ""}
      </div>
    `).join("")
    : `<div class="mini-card">Nema unosa.</div>`;

  const topLikesHtml = topLikes.length
    ? topLikes.map((p) => `
      <div class="mini-card">
        <div class="mini-title">${escapeHtml(p.title || "-")}</div>
        <div class="muted">Lajkovi: ${num(p.value)} • Interactions: ${num(p.interactions)}</div>
        ${p.link ? `<a class="link" href="${escapeHtml(p.link)}" target="_blank" rel="noreferrer">Otvori objavu</a>` : ""}
        ${p.comment ? `<p>${escapeHtml(p.comment)}</p>` : ""}
      </div>
    `).join("")
    : `<div class="mini-card">Nema unosa.</div>`;

  return renderLayout(
    `${report.profile || "-"} - ${report.report_date || "-"}`,
    `
      <section class="hero">
        <h1>${escapeHtml(report.profile || "-")}</h1>
        <p>${escapeHtml(report.owner || "-")} • ${escapeHtml(report.period_label || "-")} • ${escapeHtml(report.report_date || "-")}</p>
      </section>

      <section class="grid grid-4">
        <article class="card">
          <h3>Views</h3>
          <div class="metric">${num(o.views_current)}</div>
          <div class="muted">Prošla: ${num(o.views_previous)}</div>
        </article>
        <article class="card">
          <h3>Interactions</h3>
          <div class="metric">${num(o.interactions_current)}</div>
          <div class="muted">Prošla: ${num(o.interactions_previous)}</div>
        </article>
        <article class="card">
          <h3>Novi pratioci</h3>
          <div class="metric">${num(o.new_followers_current)}</div>
          <div class="muted">Prošla: ${num(o.new_followers_previous)}</div>
        </article>
        <article class="card">
          <h3>Stories</h3>
          <div class="metric">${num(o.stories_current)}</div>
          <div class="muted">Prošla: ${num(o.stories_previous)}</div>
        </article>
      </section>

      <section class="grid grid-2">
        <article class="card">
          <h2>Organski KPI</h2>
          <table>
            <tr><th>Metrika</th><th>Tekuća</th><th>Prošla</th></tr>
            <tr><td>Objave</td><td>${num(o.posts_current)}</td><td>${num(o.posts_previous)}</td></tr>
            <tr><td>Reels</td><td>${num(o.reels_current)}</td><td>${num(o.reels_previous)}</td></tr>
            <tr><td>Stories</td><td>${num(o.stories_current)}</td><td>${num(o.stories_previous)}</td></tr>
            <tr><td>Views</td><td>${num(o.views_current)}</td><td>${num(o.views_previous)}</td></tr>
            <tr><td>Interactions</td><td>${num(o.interactions_current)}</td><td>${num(o.interactions_previous)}</td></tr>
            <tr><td>Novi pratioci</td><td>${num(o.new_followers_current)}</td><td>${num(o.new_followers_previous)}</td></tr>
            <tr><td>Izgubljeni pratioci</td><td>${num(o.lost_followers_current)}</td><td>${num(o.lost_followers_previous)}</td></tr>
            <tr><td>Leads iz organika</td><td>${num(o.organic_leads_current)}</td><td>${num(o.organic_leads_previous)}</td></tr>
          </table>
        </article>

        <article class="card">
          <h2>Plaćeni rezultati</h2>
          <table>
            <tr><th>Kampanja</th><th>Budžet</th><th>Impresije</th><th>Klikovi</th><th>Leads</th><th>Prihod</th></tr>
            ${adsRows}
          </table>
        </article>
      </section>

      <section class="grid grid-2">
        <article class="card">
          <h2>Top objave po views</h2>
          ${topViewsHtml}
        </article>
        <article class="card">
          <h2>Top objave po lajkovima</h2>
          ${topLikesHtml}
        </article>
      </section>

      <section class="card">
        <h2>Napomena</h2>
        <p>${escapeHtml(report.notes || "—")}</p>
      </section>

      <section class="nav-row">
        <a class="btn" href="${homeHref}">Početna</a>
        <a class="btn" href="${ownerHref}">Zaposleni</a>
        <a class="btn" href="${profileHref}">Profil</a>
      </section>
    `,
    cssHref
  );
}

function renderOwnerPage(owner, reports) {
  const pageDir = path.join(BASE_PATH, "owners", slugify(owner));
  const cssHref = "../../src/template.css";
  const homeHref = "../../index.html";

  const cards = reports
    .slice()
    .sort((a, b) => String(b.report_date || "").localeCompare(String(a.report_date || "")))
    .map((report) => `
      <article class="card">
        <h3>${escapeHtml(report.profile || "-")}</h3>
        <p class="muted">${escapeHtml(report.report_date || "-")} • ${escapeHtml(report.period_label || "-")}</p>
        <div class="row"><span>Views</span><strong>${num(report.organic?.views_current)}</strong></div>
        <div class="row"><span>Interactions</span><strong>${num(report.organic?.interactions_current)}</strong></div>
        <a class="btn" href="../../reports/${report.report_id}.html">Otvori report</a>
      </article>
    `)
    .join("");

  return renderLayout(
    owner,
    `
      <section class="hero">
        <h1>${escapeHtml(owner)}</h1>
        <p>Pregled reporta po zaposlenom.</p>
      </section>

      <section class="grid">
        ${cards || '<div class="card"><p>Nema reporta.</p></div>'}
      </section>

      <section class="nav-row">
        <a class="btn" href="${homeHref}">Početna</a>
      </section>
    `,
    cssHref
  );
}

function renderProfilePage(profile, reports) {
  const pageDir = path.join(BASE_PATH, "profiles", slugify(profile));
  const cssHref = "../../src/template.css";
  const homeHref = "../../index.html";

  const cards = reports
    .slice()
    .sort((a, b) => String(b.report_date || "").localeCompare(String(a.report_date || "")))
    .map((report) => `
      <article class="card">
        <h3>${escapeHtml(report.owner || "-")}</h3>
        <p class="muted">${escapeHtml(report.report_date || "-")} • ${escapeHtml(report.period_label || "-")}</p>
        <div class="row"><span>Views</span><strong>${num(report.organic?.views_current)}</strong></div>
        <div class="row"><span>Interactions</span><strong>${num(report.organic?.interactions_current)}</strong></div>
        <a class="btn" href="../../reports/${report.report_id}.html">Otvori report</a>
      </article>
    `)
    .join("");

  return renderLayout(
    profile,
    `
      <section class="hero">
        <h1>${escapeHtml(profile)}</h1>
        <p>Pregled reporta po profilu.</p>
      </section>

      <section class="grid">
        ${cards || '<div class="card"><p>Nema reporta.</p></div>'}
      </section>

      <section class="nav-row">
        <a class="btn" href="${homeHref}">Početna</a>
      </section>
    `,
    cssHref
  );
}

function build() {
  const reports = loadReports();

  ensureDir(path.join(BASE_PATH, "reports"));
  ensureDir(path.join(BASE_PATH, "owners"));
  ensureDir(path.join(BASE_PATH, "profiles"));
  ensureDir(path.join(BASE_PATH, "src"));
  ensureDir(path.join(BASE_PATH, "data"));

  writeFile(path.join(BASE_PATH, "index.html"), renderHomePage(reports));

  for (const report of reports) {
    if (!report.report_id) continue;
    writeFile(
      path.join(BASE_PATH, "reports", `${report.report_id}.html`),
      renderReportPage(report)
    );
  }

  const ownersMap = new Map();
  const profilesMap = new Map();

  for (const report of reports) {
    const owner = String(report.owner || "").trim();
    const profile = String(report.profile || "").trim();

    if (owner) {
      if (!ownersMap.has(owner)) ownersMap.set(owner, []);
      ownersMap.get(owner).push(report);
    }

    if (profile) {
      if (!profilesMap.has(profile)) profilesMap.set(profile, []);
      profilesMap.get(profile).push(report);
    }
  }

  for (const [owner, ownerReports] of ownersMap.entries()) {
    const ownerSlug = slugify(owner);
    writeFile(
      path.join(BASE_PATH, "owners", ownerSlug, "index.html"),
      renderOwnerPage(owner, ownerReports)
    );
  }

  for (const [profile, profileReports] of profilesMap.entries()) {
    const profileSlug = slugify(profile);
    writeFile(
      path.join(BASE_PATH, "profiles", profileSlug, "index.html"),
      renderProfilePage(profile, profileReports)
    );
  }

  console.log(`Build završen. Reporta: ${reports.length}`);
}

build();

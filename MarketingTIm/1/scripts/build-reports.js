const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function loadReports() {
  const dataPath = path.join(process.cwd(), "data", "reports.json");

  if (!fs.existsSync(dataPath)) {
    console.log("data/reports.json ne postoji, pravim prazan build.");
    return [];
  }

  const raw = fs.readFileSync(dataPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("data/reports.json mora biti niz report objekata.");
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

function renderLayout(title, body) {
  return `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/src/template.css" />
</head>
<body>
  <div class="wrap">
    ${body}
  </div>
</body>
</html>`;
}

function renderHomePage(reports) {
  const cards = reports
    .slice()
    .sort((a, b) => String(b.report_date || "").localeCompare(String(a.report_date || "")))
    .map((report) => {
      const reportPath = `/reports/${report.report_id}.html`;
      return `
        <article class="card">
          <h3>${escapeHtml(report.profile || "-")}</h3>
          <p class="muted">${escapeHtml(report.owner || "-")} • ${escapeHtml(report.report_date || "-")}</p>
          <div class="row"><span>Views</span><strong>${num(report.organic?.views_current)}</strong></div>
          <div class="row"><span>Interactions</span><strong>${num(report.organic?.interactions_current)}</strong></div>
          <a class="btn" href="${reportPath}">Otvori report</a>
        </article>
      `;
    })
    .join("");

  return renderLayout(
    "Instagram Reports",
    `
      <section class="hero">
        <h1>Instagram Reports</h1>
        <p>Automatski generisani pregled reporta.</p>
      </section>

      <section>
        <h2>Svi reporti</h2>
        <div class="grid">
          ${cards || '<div class="card"><p>Nema reporta.</p></div>'}
        </div>
      </section>
    `
  );
}

function renderReportPage(report) {
  const o = report.organic || {};
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
        </article>
        <article class="card">
          <h3>Interactions</h3>
          <div class="metric">${num(o.interactions_current)}</div>
        </article>
        <article class="card">
          <h3>Novi pratioci</h3>
          <div class="metric">${num(o.new_followers_current)}</div>
        </article>
        <article class="card">
          <h3>Stories</h3>
          <div class="metric">${num(o.stories_current)}</div>
        </article>
      </section>

      <section class="card">
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
      </section>

      <section class="card">
        <h2>Napomena</h2>
        <p>${escapeHtml(report.notes || "—")}</p>
      </section>

      <section>
        <a class="btn" href="/index.html">Nazad na početnu</a>
      </section>
    `
  );
}

function renderOwnerPage(owner, reports) {
  const cards = reports
    .slice()
    .sort((a, b) => String(b.report_date || "").localeCompare(String(a.report_date || "")))
    .map((report) => `
      <article class="card">
        <h3>${escapeHtml(report.profile || "-")}</h3>
        <p class="muted">${escapeHtml(report.report_date || "-")}</p>
        <div class="row"><span>Views</span><strong>${num(report.organic?.views_current)}</strong></div>
        <div class="row"><span>Interactions</span><strong>${num(report.organic?.interactions_current)}</strong></div>
        <a class="btn" href="/reports/${report.report_id}.html">Otvori report</a>
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

      <section>
        <a class="btn" href="/index.html">Nazad na početnu</a>
      </section>
    `
  );
}

function renderProfilePage(profile, reports) {
  const cards = reports
    .slice()
    .sort((a, b) => String(b.report_date || "").localeCompare(String(a.report_date || "")))
    .map((report) => `
      <article class="card">
        <h3>${escapeHtml(report.owner || "-")}</h3>
        <p class="muted">${escapeHtml(report.report_date || "-")}</p>
        <div class="row"><span>Views</span><strong>${num(report.organic?.views_current)}</strong></div>
        <div class="row"><span>Interactions</span><strong>${num(report.organic?.interactions_current)}</strong></div>
        <a class="btn" href="/reports/${report.report_id}.html">Otvori report</a>
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

      <section>
        <a class="btn" href="/index.html">Nazad na početnu</a>
      </section>
    `
  );
}

function build() {
  const reports = loadReports();

  ensureDir(path.join(process.cwd(), "reports"));
  ensureDir(path.join(process.cwd(), "owners"));
  ensureDir(path.join(process.cwd(), "profiles"));

  writeFile(path.join(process.cwd(), "index.html"), renderHomePage(reports));

  for (const report of reports) {
    if (!report.report_id) continue;
    writeFile(
      path.join(process.cwd(), "reports", `${report.report_id}.html`),
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
      path.join(process.cwd(), "owners", ownerSlug, "index.html"),
      renderOwnerPage(owner, ownerReports)
    );
  }

  for (const [profile, profileReports] of profilesMap.entries()) {
    const profileSlug = slugify(profile);
    writeFile(
      path.join(process.cwd(), "profiles", profileSlug, "index.html"),
      renderProfilePage(profile, profileReports)
    );
  }

  console.log(`Build završen. Reporta: ${reports.length}`);
}

build();

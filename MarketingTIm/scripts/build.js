import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API = "https://script.google.com/macros/s/AKfycbwfjiqyD5GZVT0k5UOF20y6tYfEnMBHODuu2rYfoVZ0n_kUULmOb6K9tiCJqEm0GMU/exec";

const REPORTS_DIR = "./reports";

async function main() {
  console.log("Fetching reports...");

  const res = await fetch(`${API}?action=listReports`);
  const data = await res.json();

  const reports = data.reports || [];

  for (const r of reports) {
    const full = await fetch(`${API}?action=getReport&report_id=${r.report_id}`);
    const reportData = await full.json();

    if (!reportData.ok) continue;

    const html = generateHTML(reportData.report);

    const filePath = path.join(REPORTS_DIR, `${r.slug}.html`);

    fs.writeFileSync(filePath, html);
    console.log(`Generated: ${r.slug}`);
  }

  console.log("Done.");
}

function generateHTML(data) {
  const m = data.main;
  const o = data.overview || {};
  const insights = data.insights || [];

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${m.profile_name}</title>

<style>
body {
  font-family: system-ui;
  background:#0b0b0d;
  color:#fff;
  padding:20px;
}

.container {
  max-width:1000px;
  margin:auto;
}

.card {
  background:#141418;
  padding:20px;
  border-radius:16px;
  margin-bottom:20px;
  border:1px solid #2a2a31;
}

h1 { margin:0; }

.stats {
  display:flex;
  gap:20px;
}

.stat {
  font-size:24px;
}

</style>
</head>

<body>

<div class="container">

<h1>${m.profile_name}</h1>
<p>${m.period_start} → ${m.period_end}</p>

<div class="card stats">
  <div class="stat">Views: ${o.views || "-"}</div>
  <div class="stat">Reach: ${o.reach || "-"}</div>
  <div class="stat">Interactions: ${o.interactions || "-"}</div>
</div>

<div class="card">
  <h3>Insights</h3>
  ${insights.map(i => `<p>${i.text}</p>`).join("")}
</div>

</div>

</body>
</html>
`;
}

main();

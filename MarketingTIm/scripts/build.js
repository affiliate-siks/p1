import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API = "https://script.google.com/macros/s/AKfycbwfjiqyD5GZVT0k5UOF20y6tYfEnMBHODuu2rYfoVZ0n_kUULmOb6K9tiCJqEm0GMU/exec";

const REPORTS_DIR = "./MarketingTIm/reports";

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
  const organic = data.organic_results || [];
  const paid = data.paid_results || [];
  const insights = data.insights || [];

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${m.profile_name}</title>

<style>
body {
  margin:0;
  font-family:system-ui;
  background:#0b0b0d;
  color:#fff;
}

.container {
  max-width:1100px;
  margin:40px auto;
  padding:20px;
}

.header {
  background: linear-gradient(135deg,#1a1a2e,#3a0f2f,#f36a2e);
  padding:30px;
  border-radius:20px;
  margin-bottom:20px;
}

.card {
  background:#141418;
  border:1px solid #2a2a31;
  border-radius:16px;
  padding:20px;
  margin-bottom:20px;
}

.stats {
  display:flex;
  gap:20px;
}

.stat {
  font-size:18px;
}

table {
  width:100%;
  border-collapse:collapse;
}

th, td {
  padding:10px;
  border-bottom:1px solid #2a2a31;
}

</style>
</head>

<body>

<div class="container">

<div class="header">
  <h1>${m.profile_name}</h1>
  <p>${m.period_start} → ${m.period_end}</p>
</div>

<div class="card stats">
  <div class="stat">Views: ${o.views || "-"}</div>
  <div class="stat">Reach: ${o.reach || "-"}</div>
  <div class="stat">Interactions: ${o.interactions || "-"}</div>
  <div class="stat">Followers: ${o.follower_change || "-"}</div>
</div>

<div class="card">
  <h3>Organic results</h3>
  <table>
    <tr>
      <th>Name</th>
      <th>Followers</th>
      <th>Posts</th>
      <th>Reach</th>
    </tr>
    ${organic.map(i => `
      <tr>
        <td>${i.item_name}</td>
        <td>${i.followers}</td>
        <td>${i.posts}</td>
        <td>${i.reach}</td>
      </tr>
    `).join("")}
  </table>
</div>

<div class="card">
  <h3>Paid campaigns</h3>
  <table>
    <tr>
      <th>Campaign</th>
      <th>Spend</th>
      <th>Clicks</th>
      <th>Conversions</th>
    </tr>
    ${paid.map(i => `
      <tr>
        <td>${i.campaign_name}</td>
        <td>${i.spend}</td>
        <td>${i.clicks}</td>
        <td>${i.conversions}</td>
      </tr>
    `).join("")}
  </table>
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

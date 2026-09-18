// Generates a "Plantel Revival Football" roster PDF, grouped by
// Juveniles/Primer Equipo and then by position, with a photo per player.
// Usage: node generate.cjs [path/to/data.json] [output.pdf]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const FICHAS_DIR = path.join(PUBLIC_DIR, 'fichas');

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function findPlayerPhoto(name) {
  const file = path.join(FICHAS_DIR, `${slugify(name)}.webp`);
  return fs.existsSync(file) ? file : null;
}

function toDataUri(filePath) {
  const ext = path.extname(filePath).slice(1);
  const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const b64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${b64}`;
}

function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
}

function buildPlayerCardHtml(player) {
  const photo = findPlayerPhoto(player.name);
  const photoHtml = photo
    ? `<img class="p-photo" src="${toDataUri(photo)}" />`
    : `<div class="p-photo p-photo-fallback"><span>${initials(player.name)}</span></div>`;

  return `
    <div class="p-card">
      ${photoHtml}
      <div class="p-text">
        <p class="p-name">${player.name}</p>
        <p class="p-club">${player.club}</p>
      </div>
    </div>`;
}

// CSS grid rows don't fragment cleanly across PDF pages in Chromium's print
// pipeline (a tall grid tends to jump as one block), so pairs are built as
// explicit stacked flex rows instead, each free to break independently.
function buildGroupHtml(group) {
  const rows = [];
  for (let i = 0; i < group.players.length; i += 2) {
    const pair = group.players.slice(i, i + 2).map(buildPlayerCardHtml).join('\n');
    rows.push(`<div class="group-row">${pair}</div>`);
  }

  return `
    <div class="group">
      <h3 class="group-title">${group.position}</h3>
      ${rows.join('\n')}
    </div>`;
}

function buildSectionHtml(section, index) {
  const groups = section.groups.map(buildGroupHtml).join('\n');
  return `
    <div class="section" ${index > 0 ? 'style="page-break-before: always;"' : ''}>
      <div class="section-badge-wrap"><span class="section-badge">${section.label}</span></div>
      ${groups}
    </div>`;
}

function buildHtml(data, logoWhite) {
  const sections = data.sections.map(buildSectionHtml).join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #ffffff;
    font-family: 'Inter', sans-serif;
    color: #111111;
    padding: 0 46px 0;
  }

  .cover {
    background: #000000;
    margin: 0 -46px;
    width: calc(100% + 92px);
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 50px;
    page-break-after: always;
  }

  .cover img {
    width: 230px;
  }

  .cover-title {
    font-family: 'Oswald', sans-serif;
    font-weight: 800;
    text-transform: uppercase;
    color: #ffffff;
    text-align: center;
    font-size: 58px;
    line-height: 1.15;
    letter-spacing: 0.04em;
  }

  .section {
    padding-top: 38px;
  }

  .section-badge-wrap {
    text-align: center;
    margin-bottom: 30px;
  }

  .section-badge {
    display: inline-block;
    background: #111111;
    color: #ffffff;
    padding: 11px 38px;
    border-radius: 999px;
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 17px;
  }

  .group {
    margin-bottom: 40px;
  }

  .group-title {
    font-family: 'Oswald', sans-serif;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 32px;
    color: #111111;
    text-align: center;
    margin-bottom: 26px;
    break-after: avoid;
  }

  .group-row {
    display: flex;
    gap: 40px;
    margin-bottom: 30px;
    break-inside: avoid;
  }

  .p-card {
    display: flex;
    align-items: center;
    gap: 18px;
    width: calc(50% - 20px);
  }

  .p-photo {
    width: 150px;
    height: 112px;
    flex-shrink: 0;
    object-fit: cover;
    object-position: top center;
    border-radius: 4px;
    background: #eeeeee;
    display: block;
  }

  .p-photo-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .p-photo-fallback span {
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    font-size: 28px;
    color: rgba(0,0,0,0.2);
  }

  .p-name {
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 18px;
    line-height: 1.15;
    color: #111111;
  }

  .p-club {
    margin-top: 5px;
    font-family: 'Oswald', sans-serif;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    font-size: 12px;
    color: #6b6b6b;
  }
</style>
</head>
<body>
  <div class="cover">
    <img src="${logoWhite}" />
    <p class="cover-title">ROSTER<br />JUGADORES<br />2026</p>
  </div>

  ${sections}
</body>
</html>`;
}

async function main() {
  const dataPath = path.resolve(process.argv[2] || path.join(__dirname, 'data.json'));
  const outputPath = path.resolve(process.argv[3] || path.join(__dirname, 'output', `plantel-${Date.now()}.pdf`));

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const logoFull = toDataUri(path.join(PUBLIC_DIR, 'logo-full.webp'));
  const logoWhite = toDataUri(path.join(PUBLIC_DIR, 'logo-full-white.webp'));
  const html = buildHtml(data, logoWhite);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const htmlPath = path.join(path.dirname(outputPath), '_render.html');
  fs.writeFileSync(htmlPath, html);

  const localChromePath =
    '/Users/sitic/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  const browser = await chromium.launch(
    fs.existsSync(localChromePath) ? { executablePath: localChromePath } : {}
  );
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  // Repeating footer logo on every page, via Playwright's dedicated
  // header/footer template (rendered outside the normal page content flow).
  const footerTemplate = `
    <div style="width:100%; font-size:0; text-align:center; padding-top:2px;">
      <img src="${logoFull}" style="height:60px; opacity:0.9;" />
    </div>`;

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate,
    margin: { top: '0', bottom: '85px', left: '0', right: '0' },
  });
  await browser.close();

  console.log('Generated:', outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

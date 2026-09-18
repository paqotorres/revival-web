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
      <p class="p-name">${player.name}</p>
      <p class="p-club">${player.club}</p>
    </div>`;
}

function buildGroupHtml(group) {
  const cards = group.players.map(buildPlayerCardHtml).join('\n');
  return `
    <div class="group">
      <div class="group-header">
        <span class="group-bar"></span>
        <h3 class="group-title">${group.position}</h3>
      </div>
      <div class="group-grid">
        ${cards}
      </div>
    </div>`;
}

function buildSectionHtml(section, index) {
  const groups = section.groups.map(buildGroupHtml).join('\n');
  return `
    <div class="section" ${index > 0 ? 'style="page-break-before: always;"' : ''}>
      <h2 class="section-title">${section.label}</h2>
      ${groups}
    </div>`;
}

function buildHtml(data) {
  const logoFull = toDataUri(path.join(PUBLIC_DIR, 'logo-full.webp'));
  const sections = data.sections.map(buildSectionHtml).join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #0a0a0a;
    font-family: 'Inter', sans-serif;
    color: #f5f3ef;
    padding: 40px 48px 10px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 30px;
  }

  .header img {
    height: 64px;
  }

  .header-title {
    font-family: 'Oswald', sans-serif;
    font-weight: 800;
    text-transform: uppercase;
    font-size: 30px;
    color: #ffffff;
    line-height: 1.05;
  }

  .header-title span {
    color: #4ade80;
  }

  .section {
    padding-top: 10px;
  }

  .section-title {
    font-family: 'Oswald', sans-serif;
    font-weight: 800;
    text-transform: uppercase;
    font-size: 30px;
    letter-spacing: 0.06em;
    color: #4ade80;
    border-bottom: 2px solid #22c55e;
    padding-bottom: 10px;
    margin-bottom: 22px;
  }

  .group {
    margin-bottom: 26px;
    break-inside: avoid;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .group-bar {
    width: 5px;
    height: 18px;
    background: #22c55e;
    display: inline-block;
  }

  .group-title {
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 17px;
    color: #ffffff;
  }

  .group-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px 14px;
  }

  .p-card {
    break-inside: avoid;
  }

  .p-photo {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    object-position: top center;
    border-radius: 6px;
    border: 1.5px solid rgba(34,197,94,0.5);
    background: #1c1c1c;
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
    font-size: 26px;
    color: rgba(255,255,255,0.18);
  }

  .p-name {
    margin-top: 7px;
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 10.5px;
    line-height: 1.2;
    color: #ffffff;
    text-align: center;
  }

  .p-club {
    margin-top: 2px;
    font-size: 9px;
    color: rgba(245,243,239,0.55);
    text-align: center;
    line-height: 1.2;
  }
</style>
</head>
<body>
  <div class="header">
    <img src="${logoFull}" />
    <p class="header-title">${data.title}</p>
  </div>

  ${sections}
</body>
</html>`;
}

async function main() {
  const dataPath = path.resolve(process.argv[2] || path.join(__dirname, 'data.json'));
  const outputPath = path.resolve(process.argv[3] || path.join(__dirname, 'output', `plantel-${Date.now()}.pdf`));

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const html = buildHtml(data);

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

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '24px', left: '0', right: '0' },
  });
  await browser.close();

  console.log('Generated:', outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

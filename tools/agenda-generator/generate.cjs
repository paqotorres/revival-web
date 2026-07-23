// Generates a vertical "Agenda" story image from match data.
// Usage: node generate.cjs [path/to/data.json] [output.jpg]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const FICHAS_DIR = path.join(PUBLIC_DIR, 'fichas');
const EQUIPOS_DIR = path.join(PUBLIC_DIR, 'Equipos');

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

function findTeamLogo(teamName) {
  const exts = ['webp', 'png', 'svg', 'jpg', 'jpeg'];
  for (const ext of exts) {
    const file = path.join(EQUIPOS_DIR, `${teamName}.${ext}`);
    if (fs.existsSync(file)) return file;
  }
  return null;
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

// Pick a grid density so N cards fill ~1080x1920 without overflow, regardless
// of how many matches/players are in a given day's agenda.
function pickLayout(count) {
  if (count <= 2) return { cols: 1, aspect: '4 / 3', nameSize: 40, metaSize: 24, crestSize: 64 };
  if (count <= 4) return { cols: 2, aspect: '1 / 1.15', nameSize: 32, metaSize: 20, crestSize: 56 };
  if (count <= 6) return { cols: 2, aspect: '1 / 0.85', nameSize: 28, metaSize: 18, crestSize: 48 };
  if (count <= 9) return { cols: 3, aspect: '1 / 1.1', nameSize: 24, metaSize: 16, crestSize: 42 };
  return { cols: 4, aspect: '1 / 1', nameSize: 20, metaSize: 14, crestSize: 36 };
}

function buildCardHtml(player, match, layout) {
  const photo = findPlayerPhoto(player);
  const logoA = findTeamLogo(match.teamA);
  const logoB = findTeamLogo(match.teamB);

  const photoHtml = photo
    ? `<img class="card-photo" src="${toDataUri(photo)}" />`
    : `<div class="card-photo card-photo-fallback"><span>${initials(player)}</span></div>`;

  const crestsHtml = `
    <div class="crests">
      ${logoA ? `<img class="crest" src="${toDataUri(logoA)}" />` : ''}
      ${logoB ? `<img class="crest" src="${toDataUri(logoB)}" />` : ''}
    </div>`;

  return `
    <div class="card">
      <div class="card-photo-wrap" style="aspect-ratio: ${layout.aspect};">
        ${photoHtml}
        ${crestsHtml}
        <div class="card-fade"></div>
      </div>
      <div class="card-info">
        <p class="card-meta" style="font-size:${layout.metaSize}px;">${match.time} · ${match.competition.toUpperCase()}</p>
        <p class="card-name" style="font-size:${layout.nameSize}px;">${player}</p>
      </div>
    </div>`;
}

function buildHtml(data) {
  const logoFull = toDataUri(path.join(PUBLIC_DIR, 'logo-full.webp'));

  const flatCards = data.matches.flatMap((match) => match.players.map((player) => ({ player, match })));
  const layout = pickLayout(flatCards.length);

  const cards = flatCards
    .map(({ player, match }) => buildCardHtml(player, match, layout))
    .join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body { width: 1080px; }

  body {
    background: #0a0a0a;
    background-image: radial-gradient(ellipse at top, rgba(34,197,94,0.22), transparent 55%);
    font-family: 'Inter', sans-serif;
    color: #f5f3ef;
  }

  .header {
    padding: 64px 64px 0;
  }

  .tag {
    color: #4ade80;
    font-family: 'Oswald', sans-serif;
    font-size: 24px;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .title {
    font-family: 'Oswald', sans-serif;
    font-weight: 800;
    text-transform: uppercase;
    font-size: 120px;
    line-height: 0.88;
    color: #ffffff;
    letter-spacing: 0.01em;
  }

  .title span {
    background: linear-gradient(90deg, #4ade80, #22c55e);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .date {
    margin-top: 22px;
    display: inline-block;
    font-family: 'Oswald', sans-serif;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 36px;
    letter-spacing: 0.04em;
    color: #f5f3ef;
    border-bottom: 3px solid #22c55e;
    padding-bottom: 8px;
  }

  .grid {
    margin-top: 48px;
    padding: 0 56px;
    display: grid;
    grid-template-columns: repeat(${layout.cols}, 1fr);
    gap: 26px;
  }

  .card {
    background: #131313;
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
    border-radius: 4px;
  }

  .card-photo-wrap {
    position: relative;
    width: 100%;
    background: #1c1c1c;
  }

  .card-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }

  .card-photo-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-photo-fallback span {
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    font-size: 64px;
    color: rgba(255,255,255,0.14);
  }

  .card-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.15) 45%, transparent 65%);
  }

  .crests {
    position: absolute;
    left: 12px;
    bottom: 12px;
    display: flex;
    gap: 6px;
    z-index: 2;
  }

  .crest {
    width: ${layout.crestSize}px;
    height: ${layout.crestSize}px;
    object-fit: contain;
    background: rgba(255,255,255,0.95);
    border-radius: 50%;
    padding: 5px;
  }

  .card-info {
    padding: 16px 16px 20px;
  }

  .card-meta {
    font-family: 'Oswald', sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #4ade80;
    margin-bottom: 4px;
  }

  .card-name {
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    line-height: 1.08;
    color: #ffffff;
  }

  .footer {
    padding: 56px 0 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .footer img {
    height: 70px;
    opacity: 0.9;
  }
</style>
</head>
<body>
  <div class="header">
    <p class="tag">${data.tag}</p>
    <div class="title"><span>AGENDA</span></div>
    <p class="date">${data.date}</p>
  </div>

  <div class="grid">
    ${cards}
  </div>

  <div class="footer">
    <img src="${logoFull}" />
  </div>
</body>
</html>`;
}

async function main() {
  const dataPath = path.resolve(process.argv[2] || path.join(__dirname, 'data.json'));
  const outputPath = path.resolve(process.argv[3] || path.join(__dirname, 'output', `agenda-${Date.now()}.jpg`));

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const html = buildHtml(data);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const htmlPath = path.join(path.dirname(outputPath), '_render.html');
  fs.writeFileSync(htmlPath, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log('content height:', bodyHeight, '(canvas target: 1920)');

  await page.setViewportSize({ width: 1080, height: bodyHeight });
  await page.screenshot({ path: outputPath, type: 'jpeg', quality: 92 });
  await browser.close();

  console.log('Generated:', outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

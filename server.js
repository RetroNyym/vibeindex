// server.js — VibeIndex web service. Zero dependencies; node >= 18.
//   node server.js       → http://localhost:3000
//   GITHUB_TOKEN=...     → optional, raises GitHub API rate limits

const http = require("http");
const { URL } = require("url");
const { analyze } = require("./lib/analyze");
const { renderCard, renderBadge, esc } = require("./lib/render");

const PORT = process.env.PORT || 3000;
const CACHE_TTL = 15 * 60 * 1000;

const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;
  cache.delete(key);
  return null;
}
function cacheSet(key, data) {
  cache.set(key, { data, at: Date.now() });
}

function ownerRepo(desc) {
  let parts = String(desc).split("/").filter(Boolean);
  // Accept full URLs: "https://github.com/owner/repo/releases"
  if (parts[0] && /^https?:$/i.test(parts[0])) parts = parts.slice(1);
  if (parts[0] && parts[0].toLowerCase() === "github.com") parts = parts.slice(1);
  if (parts[0] && parts[0].toLowerCase() === "www.github.com") parts = parts.slice(1);
  if (parts.length < 2) return null;
  const owner = parts[0];
  // "owner/repo/<anything>" → owner/repo; also strip .json/.svg/.git suffixes
  const repo = parts[1].replace(/\.(git|json|svg)$/i, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null;
  return { owner, repo };
}

const PAGES = {
  lk: '#0d1117', fg: '#e6edf3', mut: '#8b949e', acc: '#58a6ff', pan: '#161b22', bor: '#30363d',
};

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · VibeIndex — AI vibe-code detector for GitHub repos</title>
<meta name="description" content="VibeIndex checks any public GitHub repository and estimates what share of recent commits carry AI-agent fingerprints (Copilot, Claude, Cursor, Devin). Get a Vibe Index 0-100, evidence trail, shareable SVG card and README badge. No install, no login.">
<meta name="keywords" content="vibe index, vibe coding, vibe-coded, ai code detector, github repo analysis, copilot commits, claude code, cursor, ai agents, readme badge, svg card, open source health">
<link rel="canonical" href="https://github.com/RetroNyym/vibeindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="VibeIndex">
<meta property="og:title" content="VibeIndex — how much of this repo was vibe-coded?">
<meta property="og:description" content="Paste owner/repo, get a Vibe Index (0-100), the evidence trail, and a shareable SVG card + README badge. Works for any public GitHub repository.">
<meta property="og:url" content="https://github.com/RetroNyym/vibeindex">
<meta property="og:image" content="https://raw.githubusercontent.com/RetroNyym/vibeindex/main/docs/banner.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="VibeIndex — how much of this repo was vibe-coded?">
<meta name="twitter:description" content="AI fingerprint meter for public GitHub repositories. Zero install, free forever.">
<meta name="twitter:image" content="https://raw.githubusercontent.com/RetroNyym/vibeindex/main/docs/banner.svg">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "VibeIndex",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "description": "Checks any public GitHub repository for AI-agent fingerprints in its commit trail and returns a Vibe Index (0-100) with a shareable SVG card and README badge.",
  "url": "https://github.com/RetroNyym/vibeindex",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": "Vibe Index score, evidence trail, SVG card, README badge, JSON API"
}
</script>
<style>
  body{background:${PAGES.lk};color:${PAGES.fg};font-family:'Segoe UI',-apple-system,Arial,sans-serif;margin:0;min-height:100vh;display:flex;flex-direction:column}
  main{max-width:780px;margin:0 auto;padding:48px 24px;width:100%;box-sizing:border-box}
  a{color:${PAGES.acc};text-decoration:none}a:hover{text-decoration:underline}
  .grade{font-size:64px;font-weight:800;letter-spacing:-2px;margin:0}
  input{background:${PAGES.pan};border:1px solid ${PAGES.bor};color:${PAGES.fg};padding:12px 16px;border-radius:8px;font-size:16px;width:70%;box-sizing:border-box}
  button{background:#238636;border:1px solid #2ea043;color:#fff;padding:12px 22px;border-radius:8px;font-size:16px;cursor:pointer}
  pre{background:${PAGES.pan};border:1px solid ${PAGES.bor};padding:14px;border-radius:8px;overflow-x:auto;font-size:13px}
  .pill{display:inline-block;padding:6px 14px;border-radius:999px;color:#fff;font-weight:700;font-size:14px}
  .evi{color:${PAGES.mut};font-size:14px;line-height:1.8}
  footer{color:${PAGES.mut};font-size:12px;text-align:center;padding:24px}
  .card{background:${PAGES.pan};border:1px solid ${PAGES.bor};border-radius:12px;padding:20px;margin:20px 0}
</style></head><body><main>${body}</main><footer>✦ VibeIndex — does this repo smell like an agent? · heuristic, opinionated, free</footer></body></html>`;
}

function landing() {
  return page("VibeIndex", `
  <h1 style="font-size:40px;margin-bottom:8px">🧬 VibeIndex</h1>
  <p style="color:${PAGES.mut};font-size:17px;margin-top:0">How much of this repo was <em>actually</em> written by an AI agent?
  Paste any public GitHub repository and get a receipt.</p>
  <form onsubmit="go(event)" style="display:flex;gap:10px;align-items:center">
    <input id="q" placeholder="owner/repo   (e.g. facebook/react)" autofocus>
    <button>Analyze</button>
  </form>
  <p style="color:${PAGES.mut};font-size:13px">
    Popular: <a href="/r/facebook/react">facebook/react</a> ·
    <a href="/r/vercel/next.js">vercel/next.js</a> ·
    <a href="/r/microsoft/vscode">microsoft/vscode</a>
  </p>
  <div class="card">
    <h3 style="margin-top:0">Embed it</h3>
    <pre>&lt;img src="/api/badge/OWNER/REPO.svg" alt="vibe index"&gt;
&lt;img src="/api/card/OWNER/REPO.svg" alt="VibeIndex card"&gt;</pre>
    <p style="color:${PAGES.mut};font-size:13px">JSON API: <code>/api/analyze/:owner/:repo.json</code> · Documentation in the README.</p>
  </div>
  <script>
    function go(e){e.preventDefault();let v=document.getElementById('q').value.trim().replace(/^https?:\\/\\/www?\\./i,'').replace(/^https?:\\/\\//i,'').replace(/^github\\.com\\//i,'').split('/').slice(0,2).join('/');
    if(v) location.href='/r/'+v;}
  </script>`);
}

function resultHtml(data) {
  const embed = `[![vibe index](/api/badge/${data.fullName}.svg)](/r/${data.fullName})`;
  const cardEmbed = `[![VibeIndex](/api/card/${data.fullName}.svg)](/r/${data.fullName})`;
  const sig = data.signal || {};
  const evidence = data.evidence && data.evidence.length
    ? data.evidence.map((e) => `<div>⤷ ${esc(e)}</div>`).join("\n")
    : `<div>No explicit AI markers found in the sampled commit trail.</div>`;

  return page(data.fullName, `
  <h1 style="font-weight:700;margin-bottom:4px">${esc(data.fullName)}</h1>
  <a href="${esc(data.htmlUrl)}" style="font-size:13px">open on github.com ↗</a>
  <p class="grade" style="color:${esc(data.color)}">${data.vibeIndex}%</p>
  <span class="pill" style="background:${esc(data.color)}">${esc(data.emoji)} ${esc(data.verdict)}</span>
  <p><img src="/api/card/${data.fullName}.svg" alt="vibe card" style="max-width:100%"></p>

  <div class="card">
    <h3 style="margin-top:0">Evidence</h3>
    <div class="evi">
      sampled commits: <b>${esc(sig.sampledCommits)}</b> ·
      explicit trailers: <b>${esc(sig.trailerRatio)}</b> ·
      agent accounts: <b>${esc(sig.botRatio)}</b> ·
      bursts: <b>${esc(sig.burstRatio)}</b>
      ${evidence}
    </div>
    <p style="color:${PAGES.mut};font-size:12px;margin-bottom:0">${esc(data.disclaimer)}</p>
  </div>

  <div class="card">
    <h3 style="margin-top:0">Copy-paste into your README</h3>
    <pre>${esc(embed)}</pre>
    <pre>${esc(cardEmbed)}</pre>
  </div>
  <p><a href="/">⟨ analyze another repo</a></p>`);
}

function resultsErrorHtml(message) {
  return page("Error", `
  <h1>Hmm.</h1>
  <p>${esc(message)}</p>
  <p><a href="/">⟨ go back</a></p>`);
}

async function getAnalysis(owner, repo) {
  const key = owner + "/" + repo.toLowerCase();
  let data = cacheGet(key);
  if (!data) {
    data = await analyze(owner, repo);
    cacheSet(key, data);
  }
  return data;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  try {
    if (path === "/favicon.ico") {
      res.writeHead(204).end();
      return;
    }

    // Landing page
    if (path === "/" || path === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(landing());
      return;
    }

    // JSON API
    if (path.startsWith("/api/analyze/")) {
      const info = ownerRepo(path.replace("/api/analyze/", ""));
      if (!info) return sendPlain(res, 400, { error: "Use /api/analyze/:owner/:repo.json" });
      const data = await getAnalysis(info.owner, info.repo);
      sendPlain(res, 200, data, url.searchParams.get("pretty") !== undefined);
      return;
    }

    // Card SVG
    if (path.startsWith("/api/card/")) {
      const info = ownerRepo(path.replace("/api/card/", ""));
      if (!info) return sendSvgError(res, 400);
      const data = await getAnalysis(info.owner, info.repo);
      data.theme = url.searchParams.get("theme") || "dark";
      res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=900" });
      res.end(renderCard(data));
      return;
    }

    // Small badge
    if (path.startsWith("/api/badge/")) {
      const info = ownerRepo(path.replace("/api/badge/", ""));
      if (!info) return sendSvgError(res, 400);
      const data = await getAnalysis(info.owner, info.repo);
      res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=900" });
      res.end(renderBadge(data));
      return;
    }

    // Result page (accepts `/r/owner/repo`, also `/owner/repo.html`)
    if (path.startsWith("/r/")) {
      const info = ownerRepo(path.replace("/r/", ""));
      if (!info) return sendHtml(res, 400, resultsErrorHtml("Give me a repository as owner/repo."));
      let data;
      try {
        data = await getAnalysis(info.owner, info.repo);
      } catch (e) {
        sendHtml(res, e.status || 500, resultsErrorHtml(e.message));
        return;
      }
      sendHtml(res, 200, resultHtml(data));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(page("404", "<h1>404</h1><p>Not a route we vibe with. <a href='/'>Home</a></p>"));
  } catch (e) {
    const status = e.status || 500;
    if (path.startsWith("/api/")) sendPlain(res, status, { error: e.message });
    else sendHtml(res, status, resultsErrorHtml(e.message));
  }
});

function sendPlain(res, status, obj, pretty) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj, null, pretty ? 2 : 0));
}
function sendSvgError(res, status) {
  res.writeHead(status, { "Content-Type": "text/plain" });
  res.end("bad request: expected owner/repo");
}
function sendHtml(res, status, html) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

server.listen(PORT, () => {
  console.log(`✦ VibeIndex listening on http://localhost:${PORT}`);
  console.log(process.env.GITHUB_TOKEN ? "  auth: GITHUB_TOKEN set" : "  auth: anonymous (60 req/h) — set GITHUB_TOKEN for more");
});

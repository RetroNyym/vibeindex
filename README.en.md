# ✦ VibeLens

> Every badge is an endorsement. Every README it lands on advertises the tool — the loop is the growth engine.

VibeLens answers the defining question of 2026 for any public GitHub repository:

**"How much of this was actually vibe-coded?"**

Paste `owner/repo`, get a **Vibe Index (0–100)**, a verdict, the evidence trail behind it, and a shareable SVG card + README badge.

```
┌──────────────────────────────────────────────┐
│ facebook/react                               │
│ ★ 240k  ·  20k forks  ·  JavaScript          │
│ [ 🤝 AI-ASSISTED ]            ◝ VIBE INDEX   │
│ 23%                          ◟ 23            │
│ AI FINGERPRINT ◞                             │
└──────────────────────────────────────────────┘
```

## Why it can make noise

- **Repo-independent** — works for *any* public repository; no install, no login, no config.
- **Self-propagating** — the output is an embeddable badge/card; every embed is free promotion.
- **Meme-able** — people screenshot their percentage and argue about it. Controversy = reach.
- **Right moment** — vibe-coded detection tools are barely established, while AI-assisted commits dominate 2026's commit stream.

## Quick start

```bash
node server.js
# → http://localhost:3000
```

No `npm install`. Zero runtime dependencies (Node ≥ 18).

To raise the API rate limit:

```powershell
$env:GITHUB_TOKEN = "ghp_..."; node server.js
```

## API 🛠

| Endpoint | Returns |
|---|---|
| `GET /api/analyze/:owner/:repo.json` | Full analysis JSON (auditable signals + evidence list) |
| `GET /api/card/:owner/:repo.svg` | 496×240 shareable card (`?theme=light` supported) |
| `GET /api/badge/:owner/:repo.svg` | Small shields-style README badge |
| `GET /r/:owner/:repo` | Human result page with evidence + embed code |

Results are cached for 15 minutes.

## How the Vibe Index is scored 🧮

Signals are computed over the **most recent 100 commits**:

| Signal | Weight | What it measures |
|---|---|---|
| Explicit disclosure | 40% | `Co-Authored-By: Copilot/Claude/Cursor/…` trailers, "Generated with…" footers |
| Agent accounts | 25% | Commits by `[bot]` accounts or known AI agent identities |
| Burst pattern | 20% | ≥3 commits by the same agent within 90 seconds — the signature of an autonomous sprint |
| Style fingerprint | 15% | Long, templated, impersonal commit bodies typical of agents |

Verdicts: `HUMAN-CERTIFIED` (0–19) → `HUMAN-DRIVEN` (20–44) → `AI-ASSISTED` (45–74) → `VIBE-CODED` (75–100).

> ⚠️ This is an **evidence meter**, not an oracle. Line-level authorship is not knowable from git
> metadata; it measures the visible AI fingerprints in the commit trail. The README says this
> honestly — and so should every mention of this tool.

## Roadmap 🗺

- File-level AI triage (rule-based heuristics → a local model)
- GitHub App mode (auto-comment a "repo quality receipt" on PRs)
- Repo-vs-repo "vibe battles" leaderboard
- Vibe Index sparkline over time

## Notes

- MIT License.
- Not affiliated with GitHub, Inc. "GitHub" is a registered trademark of GitHub, Inc.

Türkçe belge: [README.md](README.md)

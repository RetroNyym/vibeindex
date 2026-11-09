// analyze.js — the VibeIndex scoring engine.
// Heuristics over a repo's recent commit trail to estimate how much of the
// recent work shows fingerprints of AI agents (Copilot, Claude Code, Cursor,
// Devin, Aider, ...). It is an *evidence* meter, not magic: README documents
// every signal and its weight.

const { fetchRepo, fetchCommits } = require("./github");

/** Lowercase substrings that point at an AI agent being involved. */
const AI_MARKERS = [
  "copilot", "claude", "anthropic", "cursor", "devin", "cognition",
  "gemini", "openai", "chatgpt", "codex", "aider", "windsurf",
  "codeium", "swe-agent", "copilot-workspace",
];

function hasAiMarker(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return AI_MARKERS.some((m) => lower.includes(m));
}

/** Extract Co-Authored-By style trailers from a commit message body/footer. */
function trailersOf(message) {
  return (message || "")
    .split(/\r?\n/)
    .slice(1) // everything after the subject line
    .filter((line) => /co-authored-by:\s*/i.test(line))
    .map((line) => line.trim());
}

function analyzeCommits(commits) {
  let trailerHits = 0;
  let botCommitterHits = 0;
  let longMsgHits = 0;
  const evidence = [];

  for (const c of commits) {
    const trailerLines = trailersOf(c.message);
    const trailerHit =
      (c.message && /generated (with|using)/i.test(c.message)) ||
      trailerLines.some((t) => hasAiMarker(t));
    const botHit =
      (c.committerLogin && /\[bot\]/i.test(c.committerLogin)) ||
      hasAiMarker(c.committerName) ||
      hasAiMarker(c.committerEmail);

    if (trailerHit) {
      trailerHits++;
      if (evidence.length < 5) {
        const line =
          trailerLines.find((t) => hasAiMarker(t)) ||
          (c.message.match(/generated (with|using).*/i) || ["AI-generated commit marker"])[0];
        evidence.push((c.authorLogin || "someone") + " → " + line.slice(0, 80));
      }
    }
    if (botHit) {
      botCommitterHits++;
      if (evidence.length < 5 && !trailerHit) {
        evidence.push(`committer "${(c.committerLogin || c.committerName).slice(0, 40)}" is an AI agent account`);
      }
    }
    const body = (c.message.split(/\r?\n/).slice(1).join(" ") || "").trim();
    if (body.length >= 240 && !trailerHit) longMsgHits++;
  }

  // Agent bursts: same committer landing >=3 commits within 90 seconds,
  // the signature of an autonomous agent sprinting through a task.
  // GitHub's "web-flow" identity is the UI/merge stamp for every squashed
  // commit on the platform — it must not count, or every squash-heavy repo
  // would look like a burst.
  const sorted = [...commits]
    .filter((c) => c.date && c.committerLogin && c.committerLogin !== "web-flow")
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  let burstCommits = 0;
  let runStart = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const sameCommitter =
      cur && cur.committerLogin && cur.committerLogin === prev.committerLogin;
    const closeInTime =
      cur && (new Date(cur.date) - new Date(prev.date)) / 1000 <= 90;
    if (!(sameCommitter && closeInTime) || i === sorted.length) {
      const runLen = i - runStart;
      if (runLen >= 3 && prev.committerLogin) burstCommits += runLen;
      runStart = i;
    }
  }

  const n = commits.length || 1;
  const trailerRatio = trailerHits / n;
  const botRatio = botCommitterHits / n;
  const styleRatio = longMsgHits / n;
  const burstRatio = Math.min(1, burstCommits / n);

  // Weighted blend. Trailers are the strongest signal (explicit disclosure),
  // then bot account committers, then burst patterns, then style.
  const vibeIndex = Math.min(
    99,
    Math.round(
      100 * (0.4 * trailerRatio + 0.25 * botRatio + 0.2 * burstRatio + 0.15 * styleRatio)
    )
  );

  return {
    signal: {
      sampledCommits: commits.length,
      trailerRatio: +trailerRatio.toFixed(3),
      botRatio: +botRatio.toFixed(3),
      burstRatio: +burstRatio.toFixed(3),
      styleRatio: +styleRatio.toFixed(3),
    },
    vibeIndex,
    evidence,
  };
}

function verdictFor(vibeIndex) {
  if (vibeIndex < 20) return { verdict: "HUMAN-CERTIFIED", emoji: "✍️", color: "#2ea44f" };
  if (vibeIndex < 45) return { verdict: "HUMAN-DRIVEN", emoji: "🧠", color: "#8ce99a" };
  if (vibeIndex < 75) return { verdict: "AI-ASSISTED", emoji: "🤝", color: "#d29922" };
  return { verdict: "VIBE-CODED", emoji: "🤖", color: "#f85149" };
}

const SAMPLE_LIMIT = 100;

/** Full analysis for owner/repo: metadata + scoring. */
async function analyze(owner, repo) {
  const [meta, commits] = await Promise.all([
    fetchRepo(owner, repo),
    fetchCommits(owner, repo, SAMPLE_LIMIT).catch(() => []),
  ]);
  const { signal, vibeIndex, evidence } = analyzeCommits(
    commits.slice(0, SAMPLE_LIMIT)
  );
  const { verdict, emoji, color } = verdictFor(vibeIndex);
  return {
    fullName: meta.fullName,
    htmlUrl: meta.htmlUrl,
    description: meta.description,
    stars: meta.stars,
    forks: meta.forks,
    language: meta.language,
    license: meta.license,
    pushedAt: meta.pushedAt,
    archived: meta.archived,
    vibeIndex,
    verdict,
    emoji,
    color,
    signal,
    evidence,
    disclaimer:
      "Heuristic estimate based on the last " + SAMPLE_LIMIT +
      " commits. It measures AI fingerprints in the commit trail, not line-level authorship.",
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { analyze, verdictFor, AI_MARKERS };

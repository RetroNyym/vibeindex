// github.js — thin wrapper around the public GitHub REST API (zero deps).

const GH_API = "https://api.github.com";

function ghHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "VibeIndex/1.0 (github.com/VibeIndex)",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** GET a path from the GitHub API. Throws { status, message } on failure. */
async function gh(path) {
  const res = await fetch(GH_API + path, { headers: ghHeaders() });
  if (res.ok) return res.json();

  const message = res.headers.get("x-github-otp") || "";
  let body = {};
  try { body = await res.json(); } catch { /* ignore */ }

  if (res.status === 403 && (body.message || "").includes("rate limit")) {
    const err = new Error(
      "GitHub API rate limit reached. Set a GITHUB_TOKEN environment variable to raise the limit."
    );
    err.status = 503;
    throw err;
  }
  const err = new Error(body.message || `GitHub API error ${res.status} ${message}`);
  err.status = res.status === 404 ? 404 : 502;
  throw err;
}

/** Repo metadata: stars, forks, language, description, last push. */
async function fetchRepo(owner, repo) {
  const data = await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  return {
    fullName: data.full_name,
    description: data.description || "",
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count,
    language: data.language,
    license: data.license ? data.license.spdx_id : null,
    createdAt: data.created_at,
    pushedAt: data.pushed_at,
    defaultBranch: data.default_branch,
    archived: !!data.archived,
    htmlUrl: data.html_url,
  };
}

/** The repo's most recent commits (one page of up to 100). */
async function fetchCommits(owner, repo, perPage = 100) {
  const data = await gh(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${perPage}`
  );
  if (!Array.isArray(data)) return [];
  return data.map((c) => ({
    message: (c.commit && c.commit.message) || "",
    authorLogin: (c.committer && c.committer.login) || (c.author && c.author.login) || null,
    committerName: (c.commit && c.commit.committer && c.commit.committer.name) || "",
    committerEmail: (c.commit && c.commit.committer && c.commit.committer.email) || "",
    committerLogin: (c.committer && c.committer.login) || null,
    date: (c.commit && c.commit.committer && c.commit.committer.date) || c.commit && c.commit.author && c.commit.author.date,
  }));
}

module.exports = { fetchRepo, fetchCommits };

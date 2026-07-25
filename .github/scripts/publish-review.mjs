/**
 * Stage 2 of the automated code review pipeline.
 *
 * Takes the JSON payload produced by the analysis job and publishes it as a
 * GitHub pull request review. The payload is untrusted: it was written by a
 * model that read attacker-controlled content, so every field is validated here
 * before it reaches the API.
 *
 * Guarantees enforced by this script, not by the model:
 *   - the review event is always COMMENT (never APPROVE / REQUEST_CHANGES);
 *   - the target pull request number and expected head SHA come from metadata
 *     written by the trusted analysis workflow, never from the model payload;
 *   - inline comments may only anchor to paths and lines that exist in the diff;
 *   - comment bodies are length-capped and stripped of control and bidi
 *     characters;
 *   - the power attribution footer is appended deterministically.
 *
 * No third-party dependencies on purpose: this job holds the write token.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** GitHub caps a review body at 65536 characters. Leave room for our footer. */
export const MAX_SUMMARY_LENGTH = 55000;
export const MAX_COMMENT_LENGTH = 3000;
export const MAX_COMMENTS = 40;
export const MAX_REVIEW_BODY_LENGTH = 65000;
const MAX_RECOVERED_COMMENTS = 15;
const MAX_RECOVERED_SECTION_LENGTH = 8000;
const TRUSTED_BASE_BRANCH = 'main';
const VALID_SIDES = new Set(['RIGHT', 'LEFT']);

export const ATTRIBUTION =
  '*Automated review by [Code Review Power](https://github.com/gabrielgons/kiro-code-review)*';

/** Populated by main(); kept out of module scope so the helpers stay testable. */
let config = null;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Removes characters that let text lie about its own content: C0/C1 controls
 * (except tab and newline), zero-width characters and bidi overrides.
 */
function stripDeceptiveCharacters(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
}

export function sanitizeMarkdown(value, maxLength) {
  if (typeof value !== 'string') return null;
  let text = stripDeceptiveCharacters(value).trim();
  if (text === '') return null;
  // Neutralise HTML comments so the payload cannot hide instructions from
  // humans reading the review or from agents reading it later.
  text = text.replace(/<!--/g, '&lt;!--').replace(/-->/g, '--&gt;');
  // Do not let model-controlled output notify arbitrary users/teams or load
  // Markdown images. Plain links remain available for useful review findings.
  text = text
    .replace(/(?<!\\)@(?=[A-Za-z0-9])/g, '\\@')
    .replace(/(?<!\\)!\[/g, '\\![');
  if (text.length > maxLength) {
    const suffix = `\n\n_[truncated: exceeded ${maxLength} characters]_`;
    text = `${text.slice(0, Math.max(0, maxLength - suffix.length))}${suffix}`;
  }
  return text;
}

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'kiro-quest-code-review',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(
      `GitHub API ${method} ${path} failed with ${response.status}: ${text.slice(0, 500)}`,
    );
    error.status = response.status;
    error.payload = parsed;
    throw error;
  }

  return parsed;
}

async function apiPaginated(path) {
  const items = [];
  for (let page = 1; page <= 30; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const pageItems = await api(`${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    items.push(...pageItems);
    if (pageItems.length < 100) break;
  }
  return items;
}

/**
 * Loads the pull request selected by the trusted workflow_run event and makes
 * sure it has not advanced since the analysis completed.
 */
async function resolvePullRequest() {
  const pull = await api(
    `/repos/${config.owner}/${config.repo}/pulls/${config.pullNumber}`,
  );

  if (pull.state !== 'open') {
    throw new Error(`Pull request #${config.pullNumber} is not open. Nothing to publish.`);
  }
  if (pull.head?.sha !== config.expectedHeadSha) {
    throw new Error(
      `Pull request #${config.pullNumber} advanced from ${config.expectedHeadSha} `
      + `to ${pull.head?.sha ?? 'unknown'} before publication. Nothing was published.`,
    );
  }

  return pull;
}

export function isTrustedBaseComparisonStatus(status) {
  // GET /compare/{source-sha}...main returns "ahead" when main contains
  // commits after the source SHA, and "identical" at the current tip.
  return status === 'ahead' || status === 'identical';
}

async function verifyTrustedWorkflowRevision(sourceRun) {
  if (
    typeof sourceRun.head_sha !== 'string'
    || sourceRun.head_sha !== config.expectedBaseSha
  ) {
    throw new Error('Analysis workflow revision does not match its trusted metadata.');
  }

  const comparison = await api(
    `/repos/${config.owner}/${config.repo}/compare/`
    + `${sourceRun.head_sha}...${encodeURIComponent(TRUSTED_BASE_BRANCH)}`,
  );
  if (!isTrustedBaseComparisonStatus(comparison?.status)) {
    throw new Error(
      `Analysis workflow revision is not in ${TRUSTED_BASE_BRANCH} history.`,
    );
  }
}

/**
 * Walks a unified diff patch and returns the line numbers GitHub will accept a
 * comment on: added and context lines for the new version (RIGHT), removed and
 * context lines for the old version (LEFT).
 */
export function collectCommentableLines(patch) {
  const right = new Set();
  const left = new Set();
  if (typeof patch !== 'string' || patch === '') return { right, left };

  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;

  for (const line of patch.split('\n')) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      inHunk = true;
      continue;
    }

    if (!inHunk || line === '') continue;
    if (line.startsWith('\\')) continue; // "\ No newline at end of file"

    if (line.startsWith('+')) {
      right.add(newLine);
      newLine += 1;
      continue;
    }

    if (line.startsWith('-')) {
      left.add(oldLine);
      oldLine += 1;
      continue;
    }

    right.add(newLine);
    left.add(oldLine);
    newLine += 1;
    oldLine += 1;
  }

  return { right, left };
}

async function buildDiffIndex(pullNumber) {
  const files = await apiPaginated(
    `/repos/${config.owner}/${config.repo}/pulls/${pullNumber}/files`,
  );
  const index = new Map();
  for (const file of files) {
    index.set(file.filename, collectCommentableLines(file.patch));
  }
  return index;
}

export function validateComment(raw, diffIndex) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'entry is not an object' };
  }

  const { path } = raw;
  if (typeof path !== 'string' || !diffIndex.has(path)) {
    return { error: `path "${String(path).slice(0, 120)}" is not part of this diff` };
  }

  const side = raw.side === undefined ? 'RIGHT' : raw.side;
  if (!VALID_SIDES.has(side)) {
    return { error: `side "${String(side).slice(0, 20)}" is not RIGHT or LEFT` };
  }

  const commentable = side === 'RIGHT' ? diffIndex.get(path).right : diffIndex.get(path).left;

  if (!Number.isInteger(raw.line) || !commentable.has(raw.line)) {
    return { error: `line ${JSON.stringify(raw.line)} is outside the diff hunks of ${path}` };
  }

  const body = sanitizeMarkdown(raw.body, MAX_COMMENT_LENGTH);
  if (body === null) {
    return { error: `empty comment body on ${path}:${raw.line}` };
  }

  const comment = { path, line: raw.line, side, body };

  if (raw.start_line !== undefined) {
    if (
      !Number.isInteger(raw.start_line)
      || raw.start_line > raw.line
      || !commentable.has(raw.start_line)
    ) {
      return { error: `start_line ${JSON.stringify(raw.start_line)} is invalid on ${path}` };
    }
    if (raw.start_line !== raw.line) {
      comment.start_line = raw.start_line;
      comment.start_side = side;
    }
  }

  return { comment };
}

export function renderRecoveredSection(rejected) {
  if (rejected.length === 0) return '';

  const shown = rejected.slice(0, MAX_RECOVERED_COMMENTS);
  const lines = [
    '',
    '<details>',
    `<summary>${rejected.length} finding(s) could not be anchored to the diff</summary>`,
    '',
  ];

  for (const item of shown) {
    lines.push(`- \`${item.location}\` — ${item.reason}`);
    if (item.body) {
      lines.push('');
      lines.push(`  ${item.body.split('\n').join('\n  ')}`);
      lines.push('');
    }
  }

  if (rejected.length > shown.length) {
    lines.push(`- _and ${rejected.length - shown.length} more, omitted._`);
  }

  lines.push('', '</details>');
  const rendered = lines.join('\n');
  if (rendered.length <= MAX_RECOVERED_SECTION_LENGTH) return rendered;

  const suffix = '\n\n_[recovered findings truncated]_\n</details>';
  return `${rendered.slice(
    0,
    MAX_RECOVERED_SECTION_LENGTH - suffix.length,
  )}${suffix}`;
}

/**
 * Turns the untrusted payload into the exact request body sent to GitHub.
 * Pure, so the guarantees above can be asserted without hitting the network.
 */
export function buildReview(payload, diffIndex) {
  const summary = sanitizeMarkdown(payload?.summary, MAX_SUMMARY_LENGTH);
  if (summary === null) {
    throw new Error('Payload has no usable summary.');
  }

  const rawComments = Array.isArray(payload.comments) ? payload.comments : [];
  const comments = [];
  const rejected = [];

  for (const raw of rawComments.slice(0, MAX_COMMENTS)) {
    const { comment, error } = validateComment(raw, diffIndex);
    if (comment) {
      comments.push(comment);
    } else {
      const rawPath = typeof raw?.path === 'string' ? raw.path : 'unknown';
      const safePath = stripDeceptiveCharacters(rawPath)
        .replace(/`/g, "'")
        .slice(0, 160);
      const safeLine = Number.isInteger(raw?.line) ? raw.line : '?';
      rejected.push({
        location: `${safePath}:${safeLine}`,
        reason: error,
        body: sanitizeMarkdown(raw?.body, 600),
      });
    }
  }

  if (rawComments.length > MAX_COMMENTS) {
    rejected.push({
      location: 'payload',
      reason: `only the first ${MAX_COMMENTS} inline comments are published`,
      body: null,
    });
  }

  const review = { event: 'COMMENT', body: composeBody(summary, rejected) };
  if (comments.length > 0) {
    review.comments = comments;
  }

  return { review, rejectedCount: rejected.length, summary };
}

function composeBody(summary, rejected) {
  const body = [summary, renderRecoveredSection(rejected), '', '---', '', ATTRIBUTION]
    .filter((part) => part !== '')
    .join('\n');
  if (body.length > MAX_REVIEW_BODY_LENGTH) {
    throw new Error('Validated review body exceeds the GitHub API size limit.');
  }
  return body;
}

async function main() {
  const repository = requireEnv('GITHUB_REPOSITORY');
  const [owner, repo] = repository.split('/');
  const metadata = JSON.parse(readFileSync(requireEnv('METADATA_PATH'), 'utf8'));
  const pullNumber = Number(metadata.pull_number);
  if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
    throw new Error('Trusted metadata contains an invalid pull_number.');
  }
  if (typeof metadata.head_sha !== 'string' || !/^[0-9a-f]{40}$/.test(metadata.head_sha)) {
    throw new Error('Trusted metadata contains an invalid head_sha.');
  }
  if (metadata.base_ref !== TRUSTED_BASE_BRANCH) {
    throw new Error(`Trusted metadata does not target ${TRUSTED_BASE_BRANCH}.`);
  }
  if (typeof metadata.base_sha !== 'string' || !/^[0-9a-f]{40}$/.test(metadata.base_sha)) {
    throw new Error('Trusted metadata contains an invalid base_sha.');
  }

  config = {
    apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
    token: requireEnv('GITHUB_TOKEN'),
    pullNumber,
    expectedHeadSha: metadata.head_sha,
    expectedBaseSha: metadata.base_sha,
    owner,
    repo,
  };

  const sourceRun = await api(
    `/repos/${owner}/${repo}/actions/runs/${requireEnv('WORKFLOW_RUN_ID')}`,
  );
  if (
    sourceRun.event !== 'pull_request_target'
    || sourceRun.conclusion !== 'success'
    || sourceRun.name !== 'Kiro Code Review (Analyze)'
  ) {
    throw new Error('Artifact source is not a successful trusted analysis workflow run.');
  }
  await verifyTrustedWorkflowRevision(sourceRun);

  const payloadPath = requireEnv('PAYLOAD_PATH');
  const payload = JSON.parse(readFileSync(payloadPath, 'utf8'));

  const pull = await resolvePullRequest();
  const diffIndex = await buildDiffIndex(pull.number);
  const { review, rejectedCount, summary } = buildReview(payload, diffIndex);
  const inlineCount = review.comments?.length ?? 0;

  console.log(
    `Publishing review on PR #${pull.number}: ${inlineCount} inline comment(s), `
    + `${rejectedCount} moved into the summary.`,
  );

  const endpoint = `/repos/${owner}/${repo}/pulls/${pull.number}/reviews`;

  try {
    await api(endpoint, { method: 'POST', body: review });
  } catch (error) {
    if (error.status !== 422 || inlineCount === 0) throw error;

    console.warn('Inline comments were rejected by GitHub, falling back to a summary-only review.');
    const fallbackRejected = review.comments.map((comment) => ({
      location: `${comment.path}:${comment.line}`,
      reason: 'rejected by the GitHub review API',
      body: comment.body.slice(0, 600),
    }));
    await api(endpoint, {
      method: 'POST',
      body: { event: 'COMMENT', body: composeBody(summary, fallbackRejected) },
    });
  }

  console.log('Review published.');
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

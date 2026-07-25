import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReview,
  collectCommentableLines,
  isTrustedBaseComparisonStatus,
  MAX_REVIEW_BODY_LENGTH,
  sanitizeMarkdown,
} from './publish-review.mjs';
import {
  buildContext,
  decodeTextFile,
} from './prepare-review-context.mjs';

test('collectCommentableLines ignores diff headers and maps both sides of hunks', () => {
  const patch = [
    'diff --git a/example.ts b/example.ts',
    'index 1111111..2222222 100644',
    '--- a/example.ts',
    '+++ b/example.ts',
    '@@ -5,2 +10,3 @@',
    ' context',
    '-old value',
    '+new value',
    '+added value',
  ].join('\n');

  const lines = collectCommentableLines(patch);
  assert.deepEqual([...lines.right], [10, 11, 12]);
  assert.deepEqual([...lines.left], [5, 6]);
  assert.equal(lines.right.has(0), false);
  assert.equal(lines.left.has(0), false);
});

test('buildReview forces COMMENT and only keeps comments anchored to the diff', () => {
  const diffIndex = new Map([
    ['src/example.ts', {
      right: new Set([10, 11]),
      left: new Set([5]),
    }],
  ]);

  const result = buildReview({
    event: 'APPROVE',
    summary: 'Useful summary',
    comments: [
      {
        path: 'src/example.ts',
        line: 10,
        side: 'RIGHT',
        body: ':orange_circle: Valid finding',
      },
      {
        path: '../../outside',
        line: 1,
        side: 'RIGHT',
        body: 'Invalid path',
      },
    ],
  }, diffIndex);

  assert.equal(result.review.event, 'COMMENT');
  assert.equal(result.review.comments.length, 1);
  assert.equal(result.review.comments[0].path, 'src/example.ts');
  assert.match(result.review.body, /could not be anchored/);
  assert.match(result.review.body, /Automated review by/);
});

test('sanitizeMarkdown neutralizes deceptive controls and active Markdown', () => {
  const sanitized = sanitizeMarkdown(
    'before\u202E<!-- hidden -->after @security ![pixel](https://example.test/x)',
    1000,
  );
  assert.equal(sanitized.includes('\u202E'), false);
  assert.equal(sanitized.includes('<!--'), false);
  assert.match(sanitized, /&lt;!-- hidden --&gt;/);
  assert.match(sanitized, /\\@security/);
  assert.match(sanitized, /\\!\[pixel\]/);
});

test('buildReview caps extreme model output below the GitHub review body limit', () => {
  const longPath = `outside-${'x'.repeat(5000)}`;
  const comments = Array.from({ length: 40 }, () => ({
    path: longPath,
    line: 1,
    body: `@everyone ![pixel](https://example.test/x) ${'b'.repeat(3000)}`,
  }));

  const result = buildReview({
    summary: `@team ${'a'.repeat(100000)}`,
    comments,
  }, new Map());

  assert.ok(result.review.body.length <= MAX_REVIEW_BODY_LENGTH);
  assert.equal(/(^|[^\\])@team/.test(result.review.body), false);
  assert.equal(/(^|[^\\])@everyone/.test(result.review.body), false);
  assert.equal(/(^|[^\\])!\[pixel\]/.test(result.review.body), false);
});

test('publisher accepts only revisions proven to be in main history', () => {
  assert.equal(isTrustedBaseComparisonStatus('identical'), true);
  assert.equal(isTrustedBaseComparisonStatus('ahead'), true);
  assert.equal(isTrustedBaseComparisonStatus('behind'), false);
  assert.equal(isTrustedBaseComparisonStatus('diverged'), false);
});

test('decodeTextFile accepts UTF-8 and rejects binary content', () => {
  assert.equal(
    decodeTextFile(Buffer.from('olá', 'utf8').toString('base64')),
    'olá',
  );
  assert.equal(
    decodeTextFile(Buffer.from([0x41, 0x00, 0x42]).toString('base64')),
    null,
  );
});

test('buildContext fetches pull request files as data and verifies the head SHA', async () => {
  const originalFetch = globalThis.fetch;
  const headSha = 'a'.repeat(40);
  const baseSha = 'b'.repeat(40);

  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname + new URL(url).search;

    if (path.endsWith('/pulls/7')) {
      return Response.json({
        number: 7,
        state: 'open',
        title: 'Example',
        body: 'Body',
        user: { login: 'octocat' },
        base: {
          ref: 'main',
          sha: baseSha,
          repo: { full_name: 'owner/repo' },
        },
        head: {
          ref: 'feature',
          sha: headSha,
          repo: { full_name: 'contributor/repo' },
        },
        additions: 1,
        deletions: 0,
        changed_files: 1,
      });
    }

    if (path.includes('/pulls/7/files?')) {
      return Response.json([{
        filename: 'src/example.ts',
        status: 'modified',
        additions: 1,
        deletions: 0,
        changes: 1,
        patch: '@@ -1 +1 @@\n-old\n+new',
      }]);
    }

    if (path.includes('/repos/contributor/repo/contents/src/example.ts?')) {
      return Response.json({
        type: 'file',
        encoding: 'base64',
        content: Buffer.from('export const value = "new";\n').toString('base64'),
      });
    }

    return new Response('not found', { status: 404 });
  };

  try {
    const context = await buildContext({
      apiUrl: 'https://api.github.test',
      token: 'test-token',
      repository: 'owner/repo',
      pullNumber: 7,
      expectedHeadSha: headSha,
    });

    assert.equal(context.pull_request.number, 7);
    assert.equal(context.pull_request.head_sha, headSha);
    assert.equal(context.files.length, 1);
    assert.equal(context.files[0].path, 'src/example.ts');
    assert.match(context.files[0].content, /export const value/);

    await assert.rejects(
      buildContext({
        apiUrl: 'https://api.github.test',
        token: 'test-token',
        repository: 'owner/repo',
        pullNumber: 7,
        expectedHeadSha: 'c'.repeat(40),
      }),
      /Pull request head changed/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

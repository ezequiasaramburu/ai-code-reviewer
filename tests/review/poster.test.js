const { postReview } = require('../../dist/review/poster');

describe('postReview', () => {
  test('posts APPROVE review when there are no comments', async () => {
    const client = {
      pulls: {
        createReview: jest.fn().mockResolvedValue({}),
      },
    };

    await postReview({
      client,
      owner: 'owner',
      repo: 'repo',
      pullNumber: 1,
      comments: [],
    });

    expect(client.pulls.createReview).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      pull_number: 1,
      event: 'APPROVE',
      body: 'Revelio: no issues found in this pull request.',
    });
  });

  test('posts REQUEST_CHANGES review with inline comments when comments exist', async () => {
    const client = {
      pulls: {
        createReview: jest.fn().mockResolvedValue({}),
      },
    };

    const comments = [
      { path: 'src/foo.ts', line: 10, body: 'Issue 1' },
      { path: 'src/bar.ts', line: 20, body: 'Issue 2' },
    ];

    await postReview({
      client,
      owner: 'owner',
      repo: 'repo',
      pullNumber: 2,
      comments,
    });

    expect(client.pulls.createReview).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      pull_number: 2,
      event: 'REQUEST_CHANGES',
      body: 'Revelio found issues in this pull request. See inline comments for details.',
      comments: comments.map(c => ({
        path: c.path,
        line: c.line,
        side: 'RIGHT',
        body: c.body,
      })),
    });
  });
});


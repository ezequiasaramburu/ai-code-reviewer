const { fetchPRDiff } = require('../../dist/github/diff');

describe('fetchPRDiff', () => {
  test('returns raw diff string when response.data is a string', async () => {
    const client = {
      pulls: {
        get: jest.fn().mockResolvedValue({ data: 'diff-content' }),
      },
    };

    const result = await fetchPRDiff(client, {
      owner: 'owner',
      repo: 'repo',
      pullNumber: 1,
    });

    expect(client.pulls.get).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      pull_number: 1,
      mediaType: { format: 'diff' },
    });
    expect(result.raw).toBe('diff-content');
  });

  test('returns empty raw string when response.data is not a string', async () => {
    const client = {
      pulls: {
        get: jest.fn().mockResolvedValue({ data: { not: 'a string' } }),
      },
    };

    const result = await fetchPRDiff(client, {
      owner: 'owner',
      repo: 'repo',
      pullNumber: 2,
    });

    expect(result.raw).toBe('');
  });
});


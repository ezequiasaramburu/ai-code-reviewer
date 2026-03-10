const { loadConfig } = require('../../dist/config/loader');
const { RevelioConfigSchema } = require('../../dist/config/schema');

function makeClientWithContent(content) {
  return {
    repos: {
      getContent: jest.fn().mockResolvedValue({
        data: {
          content: Buffer.from(content, 'utf8').toString('base64'),
        },
      }),
    },
  };
}

describe('config loader', () => {
  const owner = 'owner';
  const repo = 'repo';

  test('returns schema defaults when file is missing (404)', async () => {
    const client = {
      repos: {
        getContent: jest.fn().mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 })),
      },
    };

    const config = await loadConfig({ client, owner, repo });

    const parsed = RevelioConfigSchema.parse({});
    expect(config.review).toEqual(parsed.review);
  });

  test('parses valid YAML config', async () => {
    const yaml = `
    review:
      categories:
        - bug
        - security
      ignore:
        - "**/*.spec.ts"
      maxChunkLines: 200
      minSeverity: high
    `.trim();

    const client = makeClientWithContent(yaml);

    const config = await loadConfig({ client, owner, repo });

    expect(config.review.categories).toEqual(['bug', 'security']);
    expect(config.review.ignore).toEqual(['**/*.spec.ts']);
    expect(config.review.maxChunkLines).toBe(200);
    expect(config.review.minSeverity).toBe('high');
  });

  test('throws helpful error on invalid YAML', async () => {
    const badYaml = `
    review:
      categories: [bug, security
    `.trim(); // missing closing bracket

    const client = makeClientWithContent(badYaml);

    await expect(loadConfig({ client, owner, repo })).rejects.toThrow(
      '.revelio.yml is not valid YAML',
    );
  });

  test('throws helpful error on schema validation failure', async () => {
    const yaml = `
    review:
      minSeverity: critical
    `.trim(); // invalid severity

    const client = makeClientWithContent(yaml);

    await expect(loadConfig({ client, owner, repo })).rejects.toThrow(
      '.revelio.yml is invalid:',
    );
  });
});


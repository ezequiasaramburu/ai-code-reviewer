const { shouldIgnoreFile, filterChunksByConfig } = require('../../dist/worker/filters');

describe('worker filters', () => {
  test('shouldIgnoreFile matches glob patterns', () => {
    const patterns = ['**/*.spec.ts', 'dist/**'];

    expect(shouldIgnoreFile('src/foo.spec.ts', patterns)).toBe(true);
    expect(shouldIgnoreFile('dist/index.js', patterns)).toBe(true);
    expect(shouldIgnoreFile('src/foo.ts', patterns)).toBe(false);
  });

  test('filterChunksByConfig removes ignored files', () => {
    const chunks = [
      { filename: 'src/a.ts', language: 'typescript', content: '', startLine: 1, endLine: 10 },
      { filename: 'src/a.spec.ts', language: 'typescript', content: '', startLine: 1, endLine: 5 },
    ];
    const review = {
      categories: ['bug', 'security', 'logic', 'architecture'],
      ignore: ['**/*.spec.ts'],
      maxChunkLines: 400,
      minSeverity: 'medium',
    };

    const filtered = filterChunksByConfig(chunks, review);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].filename).toBe('src/a.ts');
  });
});


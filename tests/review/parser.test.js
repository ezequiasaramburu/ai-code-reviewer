const { parseReviewResponse } = require('../../dist/review/parser');

describe('parseReviewResponse', () => {
  test('parses valid JSON array into ReviewComment[]', () => {
    const input = JSON.stringify([
      {
        filename: 'src/foo.ts',
        line: 10,
        category: 'bug',
        severity: 'high',
        title: 'Null reference',
        body: 'This can crash when value is null.',
      },
    ]);

    const result = parseReviewResponse(input, 'low');

    expect(result).toHaveLength(1);
    const comment = result[0];
    expect(comment.filename).toBe('src/foo.ts');
    expect(comment.line).toBe(10);
    expect(comment.category).toBe('bug');
    expect(comment.severity).toBe('high');
  });

  test('filters by minSeverity correctly', () => {
    const input = JSON.stringify([
      {
        filename: 'src/a.ts',
        line: 1,
        category: 'bug',
        severity: 'low',
        title: 'Minor issue',
        body: 'Non-blocking nit.',
      },
      {
        filename: 'src/b.ts',
        line: 2,
        category: 'logic',
        severity: 'medium',
        title: 'Logic bug',
        body: 'This can break in edge cases.',
      },
    ]);

    const result = parseReviewResponse(input, 'medium');

    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('src/b.ts');
    expect(result[0].severity).toBe('medium');
  });

  test('strips markdown fences if present', () => {
    const inner = JSON.stringify([
      {
        filename: 'src/foo.ts',
        line: 5,
        category: 'bug',
        severity: 'high',
        title: 'Bug',
        body: 'Broken logic.',
      },
    ]);
    const input = '```json\n' + inner + '\n```';

    const result = parseReviewResponse(input, 'low');

    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('src/foo.ts');
  });

  test('skips malformed entries instead of throwing', () => {
    const input = JSON.stringify([
      {
        filename: 'src/good.ts',
        line: 3,
        category: 'bug',
        severity: 'medium',
        title: 'Good',
        body: 'Valid comment.',
      },
      {
        // missing required fields
        filename: 'src/bad.ts',
      },
    ]);

    const result = parseReviewResponse(input, 'low');

    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('src/good.ts');
  });

  test('returns empty array on invalid JSON', () => {
    const input = '{ not: "json" }';

    const result = parseReviewResponse(input, 'low');

    expect(result).toEqual([]);
  });

  test('returns empty array when model responds with []', () => {
    const input = '[]';

    const result = parseReviewResponse(input, 'low');

    expect(result).toEqual([]);
  });
});


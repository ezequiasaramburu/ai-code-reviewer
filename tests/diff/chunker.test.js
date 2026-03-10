const { chunkDiff } = require('../../dist/diff/chunker');

const SAMPLE_DIFF = `
diff --git a/src/file.ts b/src/file.ts
index 1111111..2222222 100644
--- a/src/file.ts
+++ b/src/file.ts
@@ -1,3 +1,3 @@
-const a = 1;
+const a = 2;
 const b = 3;
 const c = 4;
`.trim();

describe('chunkDiff', () => {
  test('returns empty array for empty diff', () => {
    expect(chunkDiff('')).toEqual([]);
    expect(chunkDiff('   ')).toEqual([]);
  });

  test('produces a single chunk for small diff', () => {
    const chunks = chunkDiff(SAMPLE_DIFF, 100);

    expect(chunks).toHaveLength(1);
    const chunk = chunks[0];
    expect(chunk.filename).toBe('src/file.ts');
    expect(chunk.language).toBe('typescript');
    expect(chunk.content).toContain('diff --git a/src/file.ts b/src/file.ts');
    expect(chunk.content).toContain('@@ -1,3 +1,3 @@');
  });

  test('splits large diff into multiple chunks respecting maxLines', () => {
    // Repeat the hunk to exceed maxLines and force splitting.
    const repeatedHunks = Array.from({ length: 10 }, () => SAMPLE_DIFF.split('\n').slice(4).join('\n')).join('\n');
    const bigDiff = `
diff --git a/src/big.ts b/src/big.ts
index 1111111..2222222 100644
--- a/src/big.ts
+++ b/src/big.ts
${repeatedHunks}
`.trim();

    const maxLines = 15;
    const chunks = chunkDiff(bigDiff, maxLines);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(chunk => {
      const lineCount = chunk.content.split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(maxLines + 10); // header lines + hunks
      expect(chunk.filename).toBe('src/big.ts');
    });
  });
});


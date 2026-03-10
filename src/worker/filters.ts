import { minimatch } from 'minimatch';
import type { DiffChunk } from '../diff/chunker';
import type { ReviewConfig } from '../config/schema';

export function shouldIgnoreFile(filename: string, patterns: string[]): boolean {
  return patterns.some(pattern => minimatch(filename, pattern));
}

export function filterChunksByConfig(chunks: DiffChunk[], review: ReviewConfig): DiffChunk[] {
  return chunks.filter(chunk => !shouldIgnoreFile(chunk.filename, review.ignore));
}


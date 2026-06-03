export const SINGLE_SHOT_CHAR_LIMIT = 80_000;
export const MAP_REDUCE_BATCH_CHAR_LIMIT = 12_000;

/** Groups texts into batches that fit within maxChars (join uses double newline). */
export function batchTextsByCharLimit(
  texts: string[],
  maxChars: number,
): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const text of texts) {
    const separatorLen = current.length > 0 ? 2 : 0;
    const addLen = text.length + separatorLen;

    if (current.length > 0 && currentLen + addLen > maxChars) {
      batches.push(current);
      current = [text];
      currentLen = text.length;
    } else {
      current.push(text);
      currentLen += addLen;
    }
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}

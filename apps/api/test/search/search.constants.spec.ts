import {
  MAP_REDUCE_BATCH_CHAR_LIMIT,
  batchTextsByCharLimit,
} from 'src/search/search.constants';

describe('batchTextsByCharLimit', () => {
  it('returns empty array for empty input', () => {
    expect(batchTextsByCharLimit([], 100)).toEqual([]);
  });

  it('keeps a single short text in one batch', () => {
    expect(batchTextsByCharLimit(['abc'], 100)).toEqual([['abc']]);
  });

  it('splits texts when combined length exceeds limit', () => {
    const a = 'a'.repeat(8);
    const b = 'b'.repeat(8);
    const batches = batchTextsByCharLimit([a, b], 10);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toEqual([a]);
    expect(batches[1]).toEqual([b]);
  });
});

describe('search constants', () => {
  it('uses expected batch size for map-reduce', () => {
    expect(MAP_REDUCE_BATCH_CHAR_LIMIT).toBe(12_000);
  });
});

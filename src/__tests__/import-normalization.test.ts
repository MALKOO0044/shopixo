import {
  canonicalizeSizeToken,
  dedupeLabelsCaseInsensitive,
  extractCanonicalSize,
  normalizeCjProductId,
  normalizeSizeList,
} from '@/lib/import/normalization';

describe('import normalization', () => {
  test('canonicalizes direct size tokens and synonyms', () => {
    expect(canonicalizeSizeToken('s')).toBe('S');
    expect(canonicalizeSizeToken('x-large')).toBe('XL');
    expect(canonicalizeSizeToken('2XL')).toBe('XXL');
    expect(canonicalizeSizeToken('free size')).toBe('FREE SIZE');
    expect(canonicalizeSizeToken('EU 42')).toBeNull();
  });

  test('extracts canonical size from noisy variant labels', () => {
    expect(extractCanonicalSize('Milk Tea Color-S')).toBe('S');
    expect(extractCanonicalSize('WQZIP01SX6830-2XL')).toBe('XXL');
    expect(extractCanonicalSize('Milky-XL')).toBe('XL');
    expect(extractCanonicalSize('iPhone 15 Pro Max')).toBeNull();
  });

  test('normalizes size list to one deduplicated canonical set', () => {
    const normalized = normalizeSizeList([
      'S',
      'small',
      'Milk Tea Color-S',
      'XL',
      'x-large',
      '2XL',
      'XXL',
      'EU 42',
    ]);

    expect(normalized).toEqual(['S', 'XL', 'XXL']);
  });

  test('dedupes labels case-insensitively while preserving first casing', () => {
    expect(dedupeLabelsCaseInsensitive(['Black', 'black', 'WHITE', 'White'])).toEqual(['Black', 'WHITE']);
  });

  test('normalizes CJ product IDs safely', () => {
    expect(normalizeCjProductId('  CJ123ABC  ')).toBe('cj123abc');
    expect(normalizeCjProductId(null)).toBe('');
  });
});

// @ts-nocheck

import {
  buildDiscoverSearchParams,
  normalizeDiscoverRunFilters,
  normalizeDiscoverRunParams,
} from '@/lib/discover/runs'

describe('discover runs filters/params', () => {
  test('normalizes existing product policy and clamps batch size', () => {
    const filters = normalizeDiscoverRunFilters({
      categoryIds: ['cat-1'],
      existingProductPolicy: 'excludeQueueOnly',
      batchSize: 999,
    })

    expect(filters).toBeTruthy()
    expect(filters?.existingProductPolicy).toBe('excludeQueueOnly')
    expect(filters?.batchSize).toBe(24)
  })

  test('falls back to safe existing product policy when input is invalid', () => {
    const filters = normalizeDiscoverRunFilters({
      categoryIds: ['cat-1'],
      existingProductPolicy: 'invalid-policy',
    })

    expect(filters).toBeTruthy()
    expect(filters?.existingProductPolicy).toBe('excludeQueueAndStore')
  })

  test('supports legacy top-level params shape in normalizeDiscoverRunParams', () => {
    const params = normalizeDiscoverRunParams({
      categoryIds: ['cat-1'],
      quantity: 120,
      existingProductPolicy: 'excludeNone',
      state: { cursor: '2.4.1', hasMore: true },
    })

    expect(params.filters.existingProductPolicy).toBe('excludeNone')
    expect(params.filters.quantity).toBe(120)
    expect(params.state.cursor).toBe('2.4.1')
  })

  test('buildDiscoverSearchParams forwards existing product policy', () => {
    const filters = normalizeDiscoverRunFilters({
      categoryIds: ['cat-1'],
      quantity: 50,
      existingProductPolicy: 'excludeNone',
      batchSize: 8,
    })

    expect(filters).toBeTruthy()

    const params = buildDiscoverSearchParams(
      filters!,
      {
        cursor: '1.2.3',
        hasMore: true,
        batchNumber: 0,
        seenPids: [],
        resultPids: [],
        consecutiveEmptyBatches: 0,
        lastShortfallReason: null,
        lastError: null,
        quotaExhausted: false,
      },
      17
    )

    expect(params.get('existingProductPolicy')).toBe('excludeNone')
    expect(params.get('batchSize')).toBe('8')
    expect(params.get('cursor')).toBe('1.2.3')
    expect(params.get('remainingNeeded')).toBe('17')
  })
})

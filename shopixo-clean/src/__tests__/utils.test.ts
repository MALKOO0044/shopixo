import { formatCurrency } from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats USD with en-US locale deterministically', () => {
    expect(formatCurrency(1, 'USD', 'en-US')).toBe('$1.00')
    expect(formatCurrency(1234.5, 'USD', 'en-US')).toBe('$1,234.50')
  })

  it('respects provided currency code', () => {
    const out = formatCurrency(10, 'EUR', 'en-US')
    expect(out).toBe('€10.00')
  })
})

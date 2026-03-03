import { test, expect } from '@playwright/test'

// Skip CJ-dependent tests when CJ envs are not present
const hasCj = !!process.env.CJ_API_BASE && (!!process.env.CJ_API_KEY || !!process.env.CJ_ACCESS_TOKEN)

test.describe('CJ smoke', () => {
  test('home page renders', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/shop/i)
  })

  test.skip(!hasCj, 'CJ env not configured')('shipping calc returns structured JSON', async ({ request }) => {
    const res = await request.post('/api/cj/shipping/calc', {
      data: { countryCode: 'SA', pid: 'dummy', quantity: 1 },
    })
    // May not be 200 if PID invalid; just ensure JSON with keys
    const j = await res.json()
    expect(j).toBeTruthy()
    expect(j).toHaveProperty('ok')
  })

  test('sync product requires admin', async ({ request }) => {
    const res = await request.get('/api/cj/sync/product/xxx')
    expect([401, 500]).toContain(res.status())
  })
})

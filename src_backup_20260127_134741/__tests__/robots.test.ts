import robots from '@/app/robots'

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const prev = { ...process.env };
  try {
    for (const k of Object.keys(env)) {
      const v = env[k];
      if (typeof v === 'undefined') delete (process.env as any)[k];
      else (process.env as any)[k] = v;
    }
    return fn();
  } finally {
    process.env = prev as any;
  }
}

describe('robots() environment behavior', () => {
  test('non-production disallows all', () => {
    const out = withEnv({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SITE_URL: 'https://example.com' }, () => robots());
    expect(out.rules).toHaveLength(1);
    const rule = out.rules[0] as any;
    expect(rule.disallow).toEqual(['/']);
  });

  test('production allows with sensitive paths disallowed and correct sitemap/host', () => {
    const out = withEnv({ NODE_ENV: 'production', VERCEL_ENV: undefined, NEXT_PUBLIC_SITE_URL: 'https://example.com' }, () => robots());
    expect(out.rules).toHaveLength(1);
    const rule = out.rules[0] as any;
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toEqual(expect.arrayContaining(['/cart', '/checkout', '/order-tracking', '/account']));
    expect(out.sitemap).toBe('https://example.com/sitemap.xml');
    expect(out.host).toBe('https://example.com');
  });
});

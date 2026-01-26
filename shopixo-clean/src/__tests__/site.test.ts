import { getSiteUrl } from '@/lib/site'

describe('getSiteUrl', () => {
  const envBackup = { ...process.env };
  afterEach(() => {
    process.env = { ...envBackup } as any;
  });

  test('uses NEXT_PUBLIC_SITE_URL when set and normalizes without trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';
    expect(getSiteUrl()).toBe('https://example.com');
  });

  test('falls back to VERCEL_URL and normalizes scheme', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = 'my-app.vercel.app';
    expect(getSiteUrl()).toBe('https://my-app.vercel.app');
  });

  test('falls back to localhost when unset/invalid', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
    expect(getSiteUrl()).toBe('http://localhost:3000');
  });
});

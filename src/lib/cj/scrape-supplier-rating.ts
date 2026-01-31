import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync } from 'child_process';

export interface SupplierRating {
  supplierName: string;
  overallRating: number;
}

const PAGE_TIMEOUT = 30000;
const ratingCache = new Map<string, { rating: SupplierRating | null; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24;

function findChromiumPath(): string | undefined {
  try {
    // Honor environment hints first (common on serverless platforms)
    const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH;
    if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  } catch {}
  try {
    // Try common chromium binaries
    const candidates = [
      'which chromium',
      'which chromium-browser',
      'which google-chrome-stable',
      'which google-chrome',
      'which chrome'
    ];
    for (const cmd of candidates) {
      try {
        const out = execSync(`${cmd} 2>/dev/null`, { encoding: 'utf-8' }).trim();
        if (out) return out;
      } catch {}
    }
  } catch {}
  // Return undefined to let Puppeteer use its bundled Chromium
  return undefined;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

async function launchBrowser(): Promise<Browser> {
  const executablePath = findChromiumPath();
  return puppeteer.launch({
    headless: true,
    // If executablePath is undefined, Puppeteer uses its bundled Chromium
    executablePath: executablePath || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });
}

async function extractRatingFromPage(page: Page): Promise<{ supplierName: string; overallRating: number; isValidProduct: boolean }> {
  return page.evaluate(() => {
    const data = { supplierName: '', overallRating: 0, isValidProduct: false };
    
    const pageText = document.body?.innerText || '';
    
    if (pageText.includes('Product removed') || pageText.includes('404') || 
        (pageText.includes('Sign in') && pageText.length < 1000)) {
      return data;
    }
    
    // Strategy 1: Look for SupplierInfo class
    let supplierSection = document.querySelector('[class*="SupplierInfo"]');
    
    // Strategy 2: Look for "Offer by Supplier" text and find parent container
    if (!supplierSection) {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent?.includes('Offer by Supplier') && el.children.length < 20) {
          supplierSection = el;
          break;
        }
      }
    }
    
    // Strategy 3: Look for supplier link with rating stars nearby
    if (!supplierSection) {
      const supplierLinks = document.querySelectorAll('a[href*="supplier"]');
      for (const link of supplierLinks) {
        const parent = link.closest('div');
        if (parent && parent.querySelector('.rc-rate-star')) {
          supplierSection = parent;
          break;
        }
      }
    }
    
    if (supplierSection) {
      data.isValidProduct = true;
      
      // Count stars - try multiple selectors
      let fullStars = supplierSection.querySelectorAll('.rc-rate-star-full');
      let halfStars = supplierSection.querySelectorAll('.rc-rate-star-half');
      
      // If no stars found in section, look for rate component
      if (fullStars.length === 0) {
        const rateComponent = supplierSection.querySelector('.rc-rate');
        if (rateComponent) {
          fullStars = rateComponent.querySelectorAll('.rc-rate-star-full');
          halfStars = rateComponent.querySelectorAll('.rc-rate-star-half');
        }
      }
      
      // Alternative: count filled star icons by checking style/class
      if (fullStars.length === 0) {
        const starElements = supplierSection.querySelectorAll('[class*="star"]');
        let count = 0;
        for (const star of starElements) {
          const classList = star.className || '';
          const style = (star as HTMLElement).style?.cssText || '';
          if (classList.includes('full') || classList.includes('active') || 
              classList.includes('filled') || style.includes('100%')) {
            count++;
          }
        }
        if (count > 0 && count <= 5) {
          data.overallRating = count;
        }
      } else {
        data.overallRating = fullStars.length + (halfStars.length * 0.5);
      }
      
      // Extract supplier name
      const nameEl = supplierSection.querySelector('[class*="name"]') || 
                     supplierSection.querySelector('a[href*="supplier"]');
      if (nameEl) {
        data.supplierName = (nameEl.textContent || '').replace(/Offer by Supplier[:\s]*/i, '').trim();
      }
      
      // Final fallback: parse numeric rating text if stars were not detected
      if (data.overallRating === 0) {
        const sectionText = supplierSection.textContent || '';
        const numMatch = sectionText.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*5)?/);
        if (numMatch) {
          const n = parseFloat(numMatch[1]);
          if (!isNaN(n) && n > 0 && n <= 5) {
            data.overallRating = n;
          }
        }
      }
    }
    
    // Fallback: extract from page text
    if (!data.supplierName) {
      const supplierMatch = pageText.match(/Offer(?:ed)?\s+by\s+Supplier[:\s]*([^\n]+)/i);
      if (supplierMatch) {
        data.supplierName = supplierMatch[1].trim().split('\n')[0].trim();
        data.isValidProduct = true;
      }
    }
    
    // If we found supplier name but no rating, try to find rating in the whole page near supplier text
    if (data.isValidProduct && data.overallRating === 0) {
      // Look for rc-rate component anywhere on page
      const rateComponents = document.querySelectorAll('.rc-rate');
      for (const rate of rateComponents) {
        const fullStars = rate.querySelectorAll('.rc-rate-star-full');
        const halfStars = rate.querySelectorAll('.rc-rate-star-half');
        const totalStars = fullStars.length + (halfStars.length * 0.5);
        if (totalStars > 0 && totalStars <= 5) {
          data.overallRating = totalStars;
          break;
        }
      }
    }
    
    return data;
  });
}

// Lightweight HTML probe that attempts to extract supplier rating WITHOUT a browser.
// This is safer for serverless environments (e.g., Vercel Edge/Serverless) where Puppeteer may be restricted.
async function tryExtractRatingFromHtml(url: string): Promise<SupplierRating | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Avoid following potential redirects excessively
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 1) Count stars from rc-rate component
    const full = (html.match(/rc-rate-star-full/g) || []).length;
    const half = (html.match(/rc-rate-star-half/g) || []).length;
    let rating = full + (half * 0.5);

    // 2) Numeric fallback like "4.0/5" near the supplier section
    if (rating <= 0) {
      const num = html.match(/(\b[0-5](?:\.\d)?\b)\s*(?:\/\s*5)?/);
      if (num) {
        const n = parseFloat(num[1]);
        if (!isNaN(n) && n > 0 && n <= 5) rating = n;
      }
    }

    if (rating <= 0) return null;

    // Extract supplier name heuristically
    let supplierName = '';
    const nameFromOffer = html.match(/Offer(?:ed)?\s+by\s+Supplier[:\s]*([^<\n]+)/i);
    if (nameFromOffer) supplierName = nameFromOffer[1].trim();
    if (!supplierName) {
      const linkMatch = html.match(/<a[^>]+href=["']?[^"'>]*supplier[^>]*>([^<]+)<\/a>/i);
      if (linkMatch) supplierName = linkMatch[1].trim();
    }

    return { supplierName: supplierName || 'Unknown', overallRating: Math.min(rating, 5) };
  } catch {
    return null;
  }
}

export async function scrapeSupplierRating(
  productId: string, 
  productSku?: string,
  productName?: string
): Promise<SupplierRating | null> {
  const cacheKey = productId;
  const cached = ratingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Scraper] Cache hit for ${productId}: ${cached.rating?.overallRating || 'null'}`);
    return cached.rating;
  }
  
  console.log(`[Scraper] Scraping supplier rating for ${productId}`);
  
  const urlsToTry: string[] = [];
  
  if (productName) {
    const slug = slugify(productName);
    urlsToTry.push(`https://cjdropshipping.com/product/${slug}-p-${productId}.html`);
  }
  if (productSku) {
    urlsToTry.push(`https://cjdropshipping.com/product/${productSku}`);
  }
  urlsToTry.push(`https://cjdropshipping.com/product/p-${productId}.html`);
  urlsToTry.push(`https://cjdropshipping.com/product/${productId}`);
  
  // First try lightweight HTML probe before launching a browser
  for (const productUrl of urlsToTry) {
    console.log(`[Scraper] HTML probe: ${productUrl}`);
    const quick = await tryExtractRatingFromHtml(productUrl);
    if (quick && quick.overallRating > 0) {
      console.log(`[Scraper] HTML probe success: ${quick.overallRating} (${quick.supplierName})`);
      ratingCache.set(cacheKey, { rating: quick, timestamp: Date.now() });
      return quick;
    }
  }

  // Fallback to Puppeteer if HTML probe didn't find rating
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    for (const productUrl of urlsToTry) {
      console.log(`[Scraper] Trying: ${productUrl}`);
      try {
        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT });
        await new Promise(resolve => setTimeout(resolve, 7000));
        await page.evaluate(() => { window.scrollBy(0, 500); });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const result = await extractRatingFromPage(page);
        console.log(`[Scraper] Page result: valid=${result.isValidProduct}, rating=${result.overallRating}, supplier=${result.supplierName}`);
        if (result.isValidProduct && result.overallRating > 0) {
          const rating: SupplierRating = {
            supplierName: result.supplierName || 'Unknown',
            overallRating: Math.min(result.overallRating, 5),
          };
          console.log(`[Scraper] Found: ${rating.overallRating} stars (${rating.supplierName})`);
          ratingCache.set(cacheKey, { rating, timestamp: Date.now() });
          return rating;
        }
      } catch (navError: any) {
        console.log(`[Scraper] Failed: ${navError.message}`);
        continue;
      }
    }
    
    console.log(`[Scraper] No rating found for ${productId}`);
    ratingCache.set(cacheKey, { rating: null, timestamp: Date.now() });
    return null;
    
  } catch (error: any) {
    console.error(`[Scraper] Error: ${error.message}`);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export async function scrapeSupplierRatings(
  products: Array<{ productId: string; productSku?: string; productName?: string }>
): Promise<Map<string, SupplierRating>> {
  const results = new Map<string, SupplierRating>();
  
  for (const product of products.slice(0, 2)) {
    try {
      const rating = await scrapeSupplierRating(product.productId, product.productSku, product.productName);
      if (rating) {
        results.set(product.productId, rating);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      console.error(`[Scraper] Failed for ${product.productId}:`, e);
    }
  }
  
  return results;
}

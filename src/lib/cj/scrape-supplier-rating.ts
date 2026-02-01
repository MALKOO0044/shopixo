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
    
    // Check for invalid pages
    if (pageText.includes('Product removed') || pageText.includes('404') || 
        (pageText.includes('Sign in') && pageText.length < 1000)) {
      console.log('[Scraper-Browser] Invalid page detected');
      return data;
    }
    
    console.log('[Scraper-Browser] Page loaded, searching for supplier section...');
    
    // ENHANCED STRATEGY: Multiple approaches to find supplier section
    let supplierSection: Element | null = null;
    
    // Strategy 1: Look for SupplierInfo or Supplier-related class names
    const supplierClassSelectors = [
      '[class*="SupplierInfo"]',
      '[class*="supplier-info"]',
      '[class*="supplierInfo"]',
      '[class*="Supplier"]',
      '[class*="seller-info"]',
      '[class*="SellerInfo"]',
    ];
    
    for (const selector of supplierClassSelectors) {
      supplierSection = document.querySelector(selector);
      if (supplierSection) {
        console.log(`[Scraper-Browser] Found supplier section via selector: ${selector}`);
        break;
      }
    }
    
    // Strategy 2: Look for "Offer by Supplier" or similar text patterns
    if (!supplierSection) {
      const textPatterns = [
        'Offer by Supplier',
        'Offered by Supplier',
        'Supplier:',
        'Visit Store',
        'Contact Now',
      ];
      
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        const text = el.textContent || '';
        for (const pattern of textPatterns) {
          if (text.includes(pattern) && el.children.length < 30) {
            // Found potential supplier section
            supplierSection = el;
            console.log(`[Scraper-Browser] Found supplier section via text: "${pattern}"`);
            break;
          }
        }
        if (supplierSection) break;
      }
    }
    
    // Strategy 3: Look for supplier link with rating stars nearby
    if (!supplierSection) {
      const supplierLinks = document.querySelectorAll('a[href*="supplier"], a[href*="store"]');
      for (const link of supplierLinks) {
        // Check parent containers up to 5 levels
        let current: Element | null = link;
        for (let i = 0; i < 5; i++) {
          if (!current) break;
          const parentEl: Element | null = current.parentElement;
          if (!parentEl) break;
          
          // Check if this parent has star ratings
          if (parentEl.querySelector('.rc-rate-star') || 
              parentEl.querySelector('[class*="star"]') ||
              parentEl.querySelector('[class*="rate"]')) {
            supplierSection = parentEl;
            console.log('[Scraper-Browser] Found supplier section via supplier link + stars');
            break;
          }
          current = parentEl;
        }
        if (supplierSection) break;
      }
    }
    
    // Strategy 4: Look for any section with both company name pattern AND stars
    if (!supplierSection) {
      const allDivs = document.querySelectorAll('div');
      for (const div of allDivs) {
        const text = div.textContent || '';
        const hasCompanyPattern = /Co\.,?\s*Ltd|Company|Trading|Corporation|Enterprise|Store/i.test(text);
        const hasStars = div.querySelector('.rc-rate-star') || div.querySelector('[class*="star"]');
        
        if (hasCompanyPattern && hasStars && text.length < 500) {
          supplierSection = div;
          console.log('[Scraper-Browser] Found supplier section via company pattern + stars');
          break;
        }
      }
    }
    
    if (supplierSection) {
      data.isValidProduct = true;
      console.log('[Scraper-Browser] Supplier section found, extracting rating...');
      
      // ENHANCED RATING EXTRACTION: Try multiple methods
      let ratingFound = false;
      
      // Method 1: Count rc-rate-star elements (most reliable)
      let fullStars = supplierSection.querySelectorAll('.rc-rate-star-full');
      let halfStars = supplierSection.querySelectorAll('.rc-rate-star-half');
      
      if (fullStars.length > 0 || halfStars.length > 0) {
        data.overallRating = fullStars.length + (halfStars.length * 0.5);
        ratingFound = true;
        console.log(`[Scraper-Browser] Rating from rc-rate-star: ${data.overallRating} (${fullStars.length} full, ${halfStars.length} half)`);
      }
      
      // Method 2: Look for rc-rate component
      if (!ratingFound) {
        const rateComponent = supplierSection.querySelector('.rc-rate');
        if (rateComponent) {
          fullStars = rateComponent.querySelectorAll('.rc-rate-star-full');
          halfStars = rateComponent.querySelectorAll('.rc-rate-star-half');
          if (fullStars.length > 0 || halfStars.length > 0) {
            data.overallRating = fullStars.length + (halfStars.length * 0.5);
            ratingFound = true;
            console.log(`[Scraper-Browser] Rating from rc-rate component: ${data.overallRating}`);
          }
        }
      }
      
      // Method 3: Count any star elements with "full", "active", "filled" classes
      if (!ratingFound) {
        const starElements = supplierSection.querySelectorAll('[class*="star"]');
        let count = 0;
        for (const star of starElements) {
          const classList = star.className || '';
          const style = (star as HTMLElement).style?.cssText || '';
          
          if (classList.includes('full') || classList.includes('active') || 
              classList.includes('filled') || classList.includes('checked') ||
              style.includes('100%') || style.includes('fill')) {
            count++;
          }
        }
        if (count > 0 && count <= 5) {
          data.overallRating = count;
          ratingFound = true;
          console.log(`[Scraper-Browser] Rating from star classes: ${data.overallRating}`);
        }
      }
      
      // Method 4: Look for SVG stars (some sites use SVG instead of CSS)
      if (!ratingFound) {
        const svgStars = supplierSection.querySelectorAll('svg[class*="star"]');
        let filledCount = 0;
        for (const svg of svgStars) {
          const fill = svg.getAttribute('fill') || '';
          const svgElement = svg as SVGElement;
          const classList = (svgElement.className && typeof svgElement.className === 'object' && 'baseVal' in svgElement.className) 
            ? (svgElement.className as any).baseVal 
            : '';
          if (fill.includes('#') || classList.includes('fill') || classList.includes('active')) {
            filledCount++;
          }
        }
        if (filledCount > 0 && filledCount <= 5) {
          data.overallRating = filledCount;
          ratingFound = true;
          console.log(`[Scraper-Browser] Rating from SVG stars: ${data.overallRating}`);
        }
      }
      
      // Method 5: Parse numeric rating from text (e.g., "4.0", "4.5/5")
      if (!ratingFound) {
        const sectionText = supplierSection.textContent || '';
        // Look for patterns like "4.0", "4.5/5", "Rating: 4.0"
        const patterns = [
          /(\d+\.\d+)\s*\/\s*5/,           // "4.0/5"
          /Rating[:\s]+(\d+\.\d+)/i,       // "Rating: 4.0"
          /(\d+\.\d+)\s*stars?/i,          // "4.0 stars"
          /\b([0-5]\.\d+)\b/,              // Any decimal 0.0-5.0
        ];
        
        for (const pattern of patterns) {
          const match = sectionText.match(pattern);
          if (match) {
            const n = parseFloat(match[1]);
            if (!isNaN(n) && n > 0 && n <= 5) {
              data.overallRating = n;
              ratingFound = true;
              console.log(`[Scraper-Browser] Rating from text pattern: ${data.overallRating}`);
              break;
            }
          }
        }
      }
      
      // ENHANCED SUPPLIER NAME EXTRACTION
      let nameFound = false;
      
      // Method 1: Look for specific name-related classes
      const nameSelectors = [
        '[class*="name"]',
        '[class*="Name"]',
        '[class*="supplier-name"]',
        '[class*="supplierName"]',
        '[class*="store-name"]',
        '[class*="storeName"]',
        '[class*="seller-name"]',
      ];
      
      for (const selector of nameSelectors) {
        const nameEl = supplierSection.querySelector(selector);
        if (nameEl) {
          const text = (nameEl.textContent || '').replace(/Offer(?:ed)?\s+by\s+Supplier[:\s]*/i, '').trim();
          if (text && text.length > 2 && text.length < 100) {
            data.supplierName = text;
            nameFound = true;
            console.log(`[Scraper-Browser] Supplier name from selector ${selector}: ${data.supplierName}`);
            break;
          }
        }
      }
      
      // Method 2: Look for supplier link
      if (!nameFound) {
        const supplierLink = supplierSection.querySelector('a[href*="supplier"], a[href*="store"]');
        if (supplierLink) {
          const text = (supplierLink.textContent || '').replace(/Offer(?:ed)?\s+by\s+Supplier[:\s]*/i, '').trim();
          if (text && text.length > 2 && text.length < 100) {
            data.supplierName = text;
            nameFound = true;
            console.log(`[Scraper-Browser] Supplier name from link: ${data.supplierName}`);
          }
        }
      }
      
      // Method 3: Parse from section text (look for company patterns)
      if (!nameFound) {
        const sectionText = supplierSection.textContent || '';
        const companyPatterns = [
          /Offer(?:ed)?\s+by\s+Supplier[:\s]*([^\n]+)/i,
          /Supplier[:\s]+([^\n]+Co\.,?\s*Ltd[^\n]*)/i,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Co\.,?\s*Ltd\.?)/,
          /Store[:\s]+([^\n]+)/i,
        ];
        
        for (const pattern of companyPatterns) {
          const match = sectionText.match(pattern);
          if (match && match[1]) {
            const name = match[1].trim().split('\n')[0].trim();
            if (name.length > 2 && name.length < 100) {
              data.supplierName = name;
              nameFound = true;
              console.log(`[Scraper-Browser] Supplier name from text pattern: ${data.supplierName}`);
              break;
            }
          }
        }
      }
      
      console.log(`[Scraper-Browser] Extraction complete: rating=${data.overallRating}, name="${data.supplierName}"`);
    } else {
      console.log('[Scraper-Browser] No supplier section found on page');
    }
    
    // FALLBACK: Search entire page if supplier section not found
    if (!data.isValidProduct) {
      console.log('[Scraper-Browser] Attempting page-wide fallback search...');
      
      // Look for supplier name in page text
      const supplierMatch = pageText.match(/Offer(?:ed)?\s+by\s+Supplier[:\s]*([^\n]+)/i);
      if (supplierMatch) {
        data.supplierName = supplierMatch[1].trim().split('\n')[0].trim();
        data.isValidProduct = true;
        console.log(`[Scraper-Browser] Found supplier name via fallback: ${data.supplierName}`);
      }
      
      // Look for any rc-rate component on the page
      if (data.isValidProduct && data.overallRating === 0) {
        const rateComponents = document.querySelectorAll('.rc-rate');
        for (const rate of rateComponents) {
          const fullStars = rate.querySelectorAll('.rc-rate-star-full');
          const halfStars = rate.querySelectorAll('.rc-rate-star-half');
          const totalStars = fullStars.length + (halfStars.length * 0.5);
          if (totalStars > 0 && totalStars <= 5) {
            data.overallRating = totalStars;
            console.log(`[Scraper-Browser] Found rating via fallback: ${data.overallRating}`);
            break;
          }
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

    // Focus on the supplier section only to avoid matching shipping times like "1-3 days"
    const supplierAnchorIdx = html.search(/Offer(?:ed)?\s+by\s+Supplier|Visit\s+Store|Contact\s+Now|supplier/i);
    if (supplierAnchorIdx < 0) return null;
    const start = Math.max(0, supplierAnchorIdx - 2000);
    const end = Math.min(html.length, supplierAnchorIdx + 4000);
    const section = html.slice(start, end);

    // 1) Count stars from rc-rate component within the supplier section
    const full = (section.match(/rc-rate-star-full/gi) || []).length;
    const half = (section.match(/rc-rate-star-half/gi) || []).length;
    let rating = full + (half * 0.5);

    // 2) Numeric fallback, but only if there is rating/star context nearby and not a range like "1-3"
    if (rating <= 0) {
      // Look for "4.0/5" first
      let num = section.match(/(\b[0-5](?:\.\d)?\b)\s*\/\s*5/);
      if (!num) {
        // Otherwise require 'rating' or 'star' context within ±300 chars and disallow ranges like 1-3
        const candidate = section.match(/\b([0-5](?:\.\d)?)\b(?!\s*-\s*\d)/);
        if (candidate) {
          const idx = candidate.index ?? section.indexOf(candidate[0]);
          const window = section.slice(Math.max(0, idx - 300), Math.min(section.length, idx + 300)).toLowerCase();
          if (/(star|rate|rating|评分|评价)/.test(window)) {
            num = candidate as any;
          }
        }
      }
      if (num) {
        const n = parseFloat(num[1]);
        if (!isNaN(n) && n > 0 && n <= 5) rating = n;
      }
    }

    if (rating <= 0) return null;

    // Extract supplier name heuristically from the supplier section
    let supplierName = '';
    // Pattern when name is plain text after the label
    let m = section.match(/Offer(?:ed)?\s+by\s+Supplier[^<]*[:\s]*([^<\n]+)/i);
    if (m) supplierName = (m[1] || '').trim();
    // Pattern when name is inside a link next to the label
    if (!supplierName) {
      m = section.match(/Offer(?:ed)?\s+by\s+Supplier[^<]*<a[^>]*>([^<]+)<\/a>/i);
      if (m) supplierName = (m[1] || '').trim();
    }
    // Fallback: any supplier-ish link nearby
    if (!supplierName) {
      const linkMatch = section.match(/<a[^>]+href=["']?[^"'>]*supplier[^>]*>([^<]+)<\/a>/i);
      if (linkMatch) supplierName = (linkMatch[1] || '').trim();
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

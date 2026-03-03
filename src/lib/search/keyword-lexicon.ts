type GenderClass = 'neutral' | 'female' | 'male';

type ProductConcept = {
  id: string;
  canonical: string;
  synonyms: string[];
  required: boolean;
  genderClass: GenderClass;
};

const PRODUCT_CONCEPTS: ProductConcept[] = [
  { id: 'dress', canonical: 'dress', synonyms: ['dresses', 'gown', 'gowns', 'frock', 'frocks', 'maxi dress', 'midi dress', 'mini dress', 'evening dress', 'cocktail dress', 'sundress', 'sundresses', 'party dress', 'summer dress', 'casual dress', 'formal dress', 'long dress', 'short dress', 'bodycon', 'bodycon dress', 'wrap dress', 'shift dress', 'a line dress', 'a-line dress', 'sheath dress', 'slip dress', 'shirt dress', 'tunic dress', 'skater dress', 'fit and flare', 'mermaid dress', 'ball gown', 'prom dress', 'wedding dress', 'bridesmaid dress', 'maternity dress', 'beach dress', 'bohemian dress', 'boho dress', 'lace dress', 'floral dress', 'printed dress', 'solid dress', 'elegant dress', 'sexy dress', 'vintage dress', 'retro dress'], required: true, genderClass: 'neutral' },
  { id: 'shirt', canonical: 'shirt', synonyms: ['shirts', 'button up', 'button down', 'dress shirt', 'oxford shirt', 'flannel shirt'], required: true, genderClass: 'neutral' },
  { id: 'blouse', canonical: 'blouse', synonyms: ['blouses', 'womens blouse', 'chiffon blouse', 'silk blouse', 'satin blouse', 'office blouse', 'elegant blouse', 'casual blouse', 'ruffle blouse', 'wrap blouse', 'tie blouse', 'bow blouse'], required: true, genderClass: 'neutral' },
  { id: 'top', canonical: 'top', synonyms: ['tops', 'tee', 'tees', 't-shirt', 't-shirts', 'tshirt', 'tshirts', 'tank top', 'tank tops', 'camisole', 'cami'], required: true, genderClass: 'neutral' },
  { id: 'pants', canonical: 'pants', synonyms: ['pant', 'trousers', 'trouser', 'slacks', 'chinos'], required: true, genderClass: 'neutral' },
  { id: 'jeans', canonical: 'jeans', synonyms: ['jean', 'denim', 'denims', 'denim pants'], required: true, genderClass: 'neutral' },
  { id: 'shorts', canonical: 'shorts', synonyms: ['short', 'bermuda', 'bermudas', 'hot pants'], required: true, genderClass: 'neutral' },
  { id: 'skirt', canonical: 'skirt', synonyms: ['skirts', 'miniskirt', 'miniskirts', 'maxiskirt', 'midi skirt', 'maxi skirt', 'pencil skirt', 'a-line skirt'], required: true, genderClass: 'neutral' },
  { id: 'blazer', canonical: 'blazer', synonyms: ['blazers', 'sport coat', 'suit jacket', 'formal blazer', 'business blazer', 'office blazer', 'casual blazer', 'slim blazer', 'fitted blazer', 'oversized blazer', 'plaid blazer', 'tweed blazer', 'single breasted blazer', 'double breasted blazer', 'ladies blazer', 'womens blazer', 'mens blazer'], required: true, genderClass: 'neutral' },
  { id: 'jacket', canonical: 'jacket', synonyms: ['jackets', 'bomber jacket', 'bomber', 'denim jacket', 'leather jacket', 'windbreaker', 'rain jacket', 'flight jacket', 'varsity jacket', 'trucker jacket', 'motorcycle jacket', 'biker jacket', 'casual jacket', 'light jacket', 'spring jacket', 'fall jacket', 'jean jacket'], required: true, genderClass: 'neutral' },
  { id: 'coat', canonical: 'coat', synonyms: ['coats', 'overcoat', 'overcoats', 'trench', 'trench coat', 'parka', 'parkas', 'wool coat', 'long coat', 'fur coat', 'faux fur coat', 'peacoat', 'duffle coat', 'camel coat', 'topcoat', 'cape coat', 'cocoon coat'], required: true, genderClass: 'neutral' },
  { id: 'puffer', canonical: 'puffer', synonyms: ['puffers', 'puffer jacket', 'puffer coat', 'down jacket', 'down coat', 'padded jacket', 'padded coat', 'quilted jacket', 'quilted coat', 'puffy jacket', 'puffy coat', 'bubble jacket', 'bubble coat', 'winter jacket', 'winter coat', 'warm jacket', 'warm coat'], required: true, genderClass: 'neutral' },
  { id: 'outerwear', canonical: 'outerwear', synonyms: ['outer wear', 'outdoor jacket', 'outdoor coat'], required: true, genderClass: 'neutral' },
  { id: 'sweater', canonical: 'sweater', synonyms: ['sweaters', 'pullover', 'pullovers', 'jumper', 'jumpers', 'knitwear', 'knit', 'knits', 'cardigan', 'cardigans'], required: true, genderClass: 'neutral' },
  { id: 'hoodie', canonical: 'hoodie', synonyms: ['hoodies', 'sweatshirt', 'sweatshirts', 'hooded sweatshirt'], required: true, genderClass: 'neutral' },
  { id: 'vest', canonical: 'vest', synonyms: ['vests', 'waistcoat', 'waistcoats', 'gilet', 'gilets'], required: true, genderClass: 'neutral' },
  { id: 'suit', canonical: 'suit', synonyms: ['suits', 'tuxedo', 'tuxedos', 'tux', 'blazer set', 'formal suit'], required: true, genderClass: 'neutral' },
  { id: 'jumpsuit', canonical: 'jumpsuit', synonyms: ['jumpsuits', 'romper', 'rompers', 'playsuit', 'playsuits', 'one piece', 'onesie', 'onesies', 'overall', 'overalls'], required: true, genderClass: 'neutral' },
  { id: 'legging', canonical: 'legging', synonyms: ['leggings', 'tights', 'yoga pants', 'yoga leggings', 'activewear pants'], required: true, genderClass: 'neutral' },
  { id: 'jogger', canonical: 'jogger', synonyms: ['joggers', 'sweatpant', 'sweatpants', 'track pants', 'trackpants'], required: true, genderClass: 'neutral' },
  { id: 'shoes', canonical: 'shoes', synonyms: ['shoe', 'footwear'], required: true, genderClass: 'neutral' },
  { id: 'sneakers', canonical: 'sneakers', synonyms: ['sneaker', 'trainer', 'trainers', 'tennis shoes', 'athletic shoes', 'running shoes'], required: true, genderClass: 'neutral' },
  { id: 'boots', canonical: 'boots', synonyms: ['boot', 'bootie', 'booties', 'ankle boots', 'knee boots', 'combat boots', 'chelsea boots'], required: true, genderClass: 'neutral' },
  { id: 'sandals', canonical: 'sandals', synonyms: ['sandal', 'flip flop', 'flip flops', 'slides', 'slide', 'thong sandal', 'strappy sandal'], required: true, genderClass: 'neutral' },
  { id: 'heels', canonical: 'heels', synonyms: ['heel', 'high heel', 'high heels', 'pump', 'pumps', 'stiletto', 'stilettos', 'wedge', 'wedges', 'platform heels'], required: true, genderClass: 'neutral' },
  { id: 'loafers', canonical: 'loafers', synonyms: ['loafer', 'moccasin', 'moccasins', 'slip on', 'slip ons'], required: true, genderClass: 'neutral' },
  { id: 'bag', canonical: 'bag', synonyms: ['bags', 'handbag', 'handbags', 'purse', 'purses', 'clutch', 'clutches', 'tote', 'totes', 'satchel', 'satchels', 'shoulder bag', 'crossbody', 'crossbody bag', 'messenger bag', 'backpack', 'backpacks'], required: true, genderClass: 'neutral' },
  { id: 'wallet', canonical: 'wallet', synonyms: ['wallets', 'billfold', 'card holder', 'card case', 'coin purse'], required: true, genderClass: 'neutral' },
  { id: 'watch', canonical: 'watch', synonyms: ['watches', 'timepiece', 'timepieces', 'wristwatch', 'wristwatches', 'smartwatch', 'smart watch'], required: true, genderClass: 'neutral' },
  { id: 'ring', canonical: 'ring', synonyms: ['rings', 'band', 'bands', 'wedding ring', 'engagement ring', 'cocktail ring'], required: true, genderClass: 'neutral' },
  { id: 'necklace', canonical: 'necklace', synonyms: ['necklaces', 'pendant', 'pendants', 'chain', 'chains', 'choker', 'chokers', 'locket'], required: true, genderClass: 'neutral' },
  { id: 'earring', canonical: 'earring', synonyms: ['earrings', 'ear ring', 'ear rings', 'stud', 'studs', 'hoop', 'hoops', 'drop earring', 'dangle earring'], required: true, genderClass: 'neutral' },
  { id: 'bracelet', canonical: 'bracelet', synonyms: ['bracelets', 'bangle', 'bangles', 'wristband', 'wristbands', 'cuff', 'cuffs', 'charm bracelet'], required: true, genderClass: 'neutral' },
  { id: 'sunglasses', canonical: 'sunglasses', synonyms: ['sunglass', 'shades', 'eyewear', 'glasses', 'aviator', 'aviators'], required: true, genderClass: 'neutral' },
  { id: 'hat', canonical: 'hat', synonyms: ['hats', 'cap', 'caps', 'beanie', 'beanies', 'fedora', 'fedoras', 'baseball cap', 'bucket hat', 'sun hat'], required: true, genderClass: 'neutral' },
  { id: 'scarf', canonical: 'scarf', synonyms: ['scarfs', 'scarves', 'wrap', 'wraps', 'shawl', 'shawls', 'pashmina'], required: true, genderClass: 'neutral' },
  { id: 'belt', canonical: 'belt', synonyms: ['belts', 'waist belt', 'leather belt'], required: true, genderClass: 'neutral' },
  { id: 'tie', canonical: 'tie', synonyms: ['ties', 'necktie', 'neckties', 'bow tie', 'bowtie'], required: true, genderClass: 'neutral' },
  { id: 'bikini', canonical: 'bikini', synonyms: ['bikinis', 'swimsuit', 'swimsuits', 'swimming suit', 'bathing suit', 'two piece', 'one piece swimsuit', 'swimwear', 'beachwear'], required: true, genderClass: 'neutral' },
  { id: 'lingerie', canonical: 'lingerie', synonyms: ['underwear', 'intimates', 'bra', 'bras', 'panty', 'panties', 'thong', 'thongs', 'brief', 'briefs', 'boxer', 'boxers', 'nightgown', 'nightgowns', 'sleepwear', 'pajama', 'pajamas', 'pjs'], required: true, genderClass: 'neutral' },
];

const GENDER_CONCEPTS: { id: string; canonical: string; synonyms: string[]; genderClass: GenderClass }[] = [
  { id: 'female', canonical: 'women', synonyms: ['woman', 'womens', "women's", 'female', 'lady', 'ladies', 'girl', 'girls', 'feminine'], genderClass: 'female' },
  { id: 'male', canonical: 'men', synonyms: ['man', 'mens', "men's", 'male', 'gentleman', 'gentlemen', 'boy', 'boys', 'masculine'], genderClass: 'male' },
  { id: 'kids', canonical: 'kids', synonyms: ['kid', 'child', 'children', 'baby', 'babies', 'infant', 'infants', 'toddler', 'toddlers', 'teen', 'teens', 'teenager'], genderClass: 'neutral' },
];

const OPTIONAL_DESCRIPTORS: string[] = [
  'plus', 'size', 'large', 'small', 'medium', 'xl', 'xxl', 'xs',
  'casual', 'formal', 'elegant', 'sexy', 'cute', 'vintage', 'boho', 'bohemian', 'classic', 'modern', 'trendy',
  'summer', 'winter', 'spring', 'autumn', 'fall', 'seasonal',
  'long', 'short', 'midi', 'maxi', 'mini', 'slim', 'fitted', 'loose', 'oversized',
  'fashion', 'new', 'hot', 'sale', 'cheap', 'luxury', 'designer', 'brand',
  'party', 'wedding', 'work', 'office', 'beach', 'gym', 'workout', 'outdoor',
  'lace', 'cotton', 'silk', 'leather', 'velvet', 'satin', 'chiffon', 'denim', 'wool', 'linen',
  'floral', 'striped', 'solid', 'printed', 'embroidered', 'sequin', 'ruffle',
  'black', 'white', 'red', 'blue', 'green', 'pink', 'purple', 'yellow', 'orange', 'brown', 'grey', 'gray', 'beige', 'navy', 'gold', 'silver',
];

type AliasMapEntry = {
  conceptId: string;
  canonical: string;
  isProduct: boolean;
  isGender: boolean;
  genderClass: GenderClass;
  required: boolean;
};

const aliasMap: Map<string, AliasMapEntry> = new Map();
const optionalSet: Set<string> = new Set();

const COMPOUND_WORDS: Record<string, string> = {
  'smartwatch': 'smart watch',
  'smartwatches': 'smart watches',
  'cardholder': 'card holder',
  'cardholders': 'card holders',
  'cardcase': 'card case',
  'coinpurse': 'coin purse',
  'handbag': 'hand bag',
  'handbags': 'hand bags',
  'crossbody': 'cross body',
  'backpack': 'back pack',
  'backpacks': 'back packs',
  'miniskirt': 'mini skirt',
  'miniskirts': 'mini skirts',
  'maxidress': 'maxi dress',
  'mididress': 'midi dress',
  'minidress': 'mini dress',
  'tshirt': 't shirt',
  'tshirts': 't shirts',
  'sweatshirt': 'sweat shirt',
  'sweatshirts': 'sweat shirts',
  'sweatpants': 'sweat pants',
  'sweatpant': 'sweat pant',
  'trackpants': 'track pants',
  'yogapants': 'yoga pants',
  'flipflop': 'flip flop',
  'flipflops': 'flip flops',
  'highheels': 'high heels',
  'highheel': 'high heel',
  'ankleboot': 'ankle boot',
  'ankleboots': 'ankle boots',
  'kneeboot': 'knee boot',
  'kneeboots': 'knee boots',
  'onepiece': 'one piece',
  'twopiece': 'two piece',
  'wristwatch': 'wrist watch',
  'wristwatches': 'wrist watches',
  'timepiece': 'time piece',
  'timepieces': 'time pieces',
  'neckchain': 'neck chain',
  'sunglasses': 'sun glasses',
  'eyewear': 'eye wear',
  'footwear': 'foot wear',
  'sleepwear': 'sleep wear',
  'swimwear': 'swim wear',
  'activewear': 'active wear',
  'beachwear': 'beach wear',
  'knitwear': 'knit wear',
  'nightgown': 'night gown',
  'nightgowns': 'night gowns',
  'bathrobe': 'bath robe',
  'bathrobes': 'bath robes',
};

function splitCompoundWords(text: string): string {
  let result = text;
  for (const [compound, spaced] of Object.entries(COMPOUND_WORDS)) {
    const regex = new RegExp(`\\b${compound}\\b`, 'gi');
    result = result.replace(regex, spaced);
  }
  return result;
}

function normalizeForMap(text: string): string {
  let normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  normalized = splitCompoundWords(normalized);
  return normalized.replace(/\s+/g, ' ').trim();
}

function initializeLexicon() {
  for (const concept of PRODUCT_CONCEPTS) {
    const allVariants = [concept.canonical, ...concept.synonyms];
    for (const variant of allVariants) {
      const normalized = normalizeForMap(variant);
      if (normalized && !aliasMap.has(normalized)) {
        aliasMap.set(normalized, {
          conceptId: concept.id,
          canonical: concept.canonical,
          isProduct: true,
          isGender: false,
          genderClass: concept.genderClass,
          required: concept.required,
        });
      }
    }
  }

  for (const concept of GENDER_CONCEPTS) {
    const allVariants = [concept.canonical, ...concept.synonyms];
    for (const variant of allVariants) {
      const normalized = normalizeForMap(variant);
      if (normalized && !aliasMap.has(normalized)) {
        aliasMap.set(normalized, {
          conceptId: concept.id,
          canonical: concept.canonical,
          isProduct: false,
          isGender: true,
          genderClass: concept.genderClass,
          required: false,
        });
      }
    }
  }

  for (const desc of OPTIONAL_DESCRIPTORS) {
    optionalSet.add(normalizeForMap(desc));
  }
}

initializeLexicon();

export function lookupKeyword(keyword: string): AliasMapEntry | null {
  const normalized = normalizeForMap(keyword);
  return aliasMap.get(normalized) || null;
}

export function isOptionalDescriptor(keyword: string): boolean {
  const normalized = normalizeForMap(keyword);
  return optionalSet.has(normalized);
}

export function getGenderExclusions(genderClass: GenderClass): string[] {
  if (genderClass === 'female') {
    return ['men', 'mens', 'man', 'boy', 'boys', 'male', 'gentleman', 'gentlemen', 'masculine'];
  }
  if (genderClass === 'male') {
    return ['women', 'womens', 'woman', 'girl', 'girls', 'female', 'lady', 'ladies', 'feminine'];
  }
  return [];
}

export function classifyQuery(rawQuery: string): {
  requiredConcepts: Set<string>;
  optionalTokens: string[];
  genderFilter: GenderClass;
  genderExclusions: string[];
} {
  const requiredConcepts = new Set<string>();
  const optionalTokens: string[] = [];
  let genderFilter: GenderClass = 'neutral';
  
  const normalizedQuery = normalizeForMap(rawQuery);
  const tokens = normalizedQuery.split(' ').filter(t => t.length >= 1);
  const consumed = new Array(tokens.length).fill(false);
  
  for (let n = 3; n >= 1; n--) {
    for (let i = 0; i <= tokens.length - n; i++) {
      if (consumed.slice(i, i + n).some(c => c)) continue;
      
      const phrase = tokens.slice(i, i + n).join(' ');
      const entry = lookupKeyword(phrase);
      
      if (entry) {
        if (entry.isProduct && entry.required) {
          requiredConcepts.add(entry.conceptId);
        }
        if (entry.isGender && entry.genderClass !== 'neutral') {
          genderFilter = entry.genderClass;
        }
        
        for (let j = i; j < i + n; j++) {
          consumed[j] = true;
        }
      }
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    if (!consumed[i] && isOptionalDescriptor(tokens[i])) {
      optionalTokens.push(tokens[i]);
    }
  }

  const genderExclusions = getGenderExclusions(genderFilter);

  return { requiredConcepts, optionalTokens, genderFilter, genderExclusions };
}

export function classifyTokens(tokens: string[]): {
  requiredConcepts: Set<string>;
  optionalTokens: string[];
  genderFilter: GenderClass;
  genderExclusions: string[];
} {
  return classifyQuery(tokens.join(' '));
}

function hasWordBoundaryMatch(text: string, phrase: string): boolean {
  if (phrase.includes(' ')) {
    const phraseTokens = phrase.split(' ');
    const textTokens = text.split(' ');
    
    for (let i = 0; i <= textTokens.length - phraseTokens.length; i++) {
      let allMatch = true;
      for (let j = 0; j < phraseTokens.length; j++) {
        if (textTokens[i + j] !== phraseTokens[j]) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) return true;
    }
    return false;
  } else {
    const regex = new RegExp(`\\b${phrase}\\b`);
    return regex.test(text);
  }
}

export function matchProductName(productName: string, requiredConcepts: Set<string>, genderExclusions: string[]): {
  matches: boolean;
  score: number;
  matchedConcepts: Set<string>;
} {
  const normalizedName = normalizeForMap(productName);
  const nameTokens = normalizedName.split(' ').filter(t => t.length >= 1);

  for (const exclusion of genderExclusions) {
    if (hasWordBoundaryMatch(normalizedName, exclusion)) {
      return { matches: false, score: 0, matchedConcepts: new Set() };
    }
  }

  const matchedConcepts = new Set<string>();

  for (let n = 3; n >= 1; n--) {
    for (let i = 0; i <= nameTokens.length - n; i++) {
      const phrase = nameTokens.slice(i, i + n).join(' ');
      const entry = lookupKeyword(phrase);
      if (entry && entry.isProduct) {
        matchedConcepts.add(entry.conceptId);
      }
    }
  }

  let requiredMatches = 0;
  for (const concept of requiredConcepts) {
    if (matchedConcepts.has(concept)) {
      requiredMatches++;
    }
  }

  const requiredCount = requiredConcepts.size;
  const allRequiredMatch = requiredCount === 0 || requiredMatches === requiredCount;
  const score = requiredCount > 0 
    ? (requiredMatches / requiredCount) * 0.8 + (matchedConcepts.size > 0 ? 0.2 : 0)
    : (matchedConcepts.size > 0 ? 0.7 : 0.3);

  return { matches: allRequiredMatch, score, matchedConcepts };
}

export function smartProductMatch(productName: string, searchQuery: string): {
  matches: boolean;
  score: number;
} {
  const { requiredConcepts, genderExclusions } = classifyQuery(searchQuery);
  const result = matchProductName(productName, requiredConcepts, genderExclusions);
  
  return { matches: result.matches, score: result.score };
}

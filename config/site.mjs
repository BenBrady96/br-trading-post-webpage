export const SITE = {
  name: 'BR Trading Post',
  shortName: 'BR Trading Post',
  url: 'https://brtradingpost.co.uk/',
  apiUrl: 'https://api.brtradingpost.co.uk/',
  tagline: 'Trading cards and custom painted binders',
  description: 'BR Trading Post is a UK trading card shop selling Pokémon, One Piece, Disney Lorcana and Yu-Gi-Oh! cards, other card games and custom painted binders on eBay.',
  owner: 'Ben Brady',
  email: 'hello@brtradingpost.co.uk',
  address: {
    street: 'TODO: house number and street',
    locality: 'King’s Lynn',
    region: 'Norfolk',
    postcode: 'TODO: postcode',
    country: 'GB',
  },
  founded: '2026',
  socials: {
    tiktok: 'https://www.tiktok.com/@br_trading_post',
    instagram: 'https://www.instagram.com/br_trading_post/',
    facebook: 'https://www.facebook.com/profile.php?id=61595112342609',
  },
  marketplaces: {
    ebay: 'https://www.ebay.co.uk/usr/br_trading_post',
  },
  analyticsToken: '736c5a1da0b947ffb964efea589fc6f1',
  indexNowKey: '5ba4b0c93b707677f4c77e8c89bbd4b3',
  turnstileSiteKey: '0x4AAAAAAFkZvWILE1GJIVIC',
};

export const isSet = (value) => typeof value === 'string' && value.trim() !== '' && !value.startsWith('TODO');

export function addressLine() {
  const { street, locality, region, postcode } = SITE.address;
  if (![street, locality, postcode].every(isSet)) return '';
  return [street, locality, region, postcode].filter(isSet).join(', ');
}

export function areaLine() {
  const { locality, region } = SITE.address;
  return isSet(locality) ? [locality, region].filter(isSet).join(', ') : '';
}

function basedIn() {
  const address = addressLine();
  if (address) return `based at ${address}`;
  const area = areaLine();
  return area ? `based near ${area}` : 'based in the UK';
}

export function controllerText({ named = true } = {}) {
  if (named && isSet(SITE.owner)) return `BR Trading Post is a trading name of ${SITE.owner}, a sole trader ${basedIn()}.`;
  return `BR Trading Post is a sole trader business ${basedIn()}.`;
}

export const placeholders = () => {
  const found = [];
  const walk = (value, path) => {
    if (typeof value === 'string') {
      if (value.startsWith('TODO')) found.push(path);
    } else if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) walk(inner, path ? `${path}.${key}` : key);
    }
  };
  walk(SITE, '');
  return found;
};

export const CATEGORIES = [
  {
    id: 'pokemon',
    logos: ['pokemon'],
    name: 'Pokémon',
    title: 'Pokémon Cards for Sale UK',
    heading: 'Pokémon cards',
    blurb: 'Singles, graded slabs and sealed Pokémon TCG product.',
    keywords: ['pokemon', 'pokémon', 'pikachu', 'charizard', 'eevee', 'mewtwo', 'scarlet & violet', 'scarlet and violet', 'mega evolution', 'paldea', 'prismatic evolutions', 'evolving skies', 'trainer gallery'],
    intro: [
      'Shop Pokémon cards from BR Trading Post, a UK card shop. You’ll find single cards for your binder or your deck, graded slabs and sealed Pokémon TCG product such as booster packs, booster boxes and Elite Trainer Boxes.',
      'Every listing here is live from our eBay shop, with the price, condition and photos of the actual item. Tap an item to see the details, then buy it on eBay, where you get eBay’s buyer protection and checkout.',
      'We keep sold Pokémon cards on the site with a Sold out banner, so you can see what we’ve stocked before. New stock goes up regularly, and we post it on TikTok, Instagram and Facebook first.',
    ],
    faq: [
      ['How do I buy a Pokémon card from BR Trading Post?', 'Open the item and tap Buy on eBay. You check out on eBay, so its buyer protection, delivery options and returns process apply.'],
      ['Why are some Pokémon cards marked Sold out?', 'Those cards have sold. We keep them on the site so you can see what we’ve had in stock. Follow us on social media to hear about new stock first.'],
    ],
  },
  {
    id: 'one-piece',
    logos: ['one-piece'],
    name: 'One Piece',
    title: 'One Piece Cards for Sale UK',
    heading: 'One Piece cards',
    blurb: 'One Piece Card Game singles, leaders and sealed product.',
    keywords: ['one piece', 'onepiece', 'luffy', 'zoro', 'straw hat', 'op01', 'op02', 'op03', 'op04', 'op05', 'op06', 'op07', 'op08', 'op09', 'op10', 'op11', 'op12', 'op13', 'op14', 'op15', 'eb01', 'eb02', 'prb01'],
    intro: [
      'Shop One Piece Card Game cards from BR Trading Post in the UK. We list singles, leaders, alternate arts and sealed One Piece product, from booster packs to booster boxes.',
      'Each listing comes straight from our eBay shop with the price, condition and photos of the actual card. Choose an item to see the details, then buy it on eBay with eBay’s buyer protection.',
      'Sold One Piece cards stay on the site with a Sold out banner, so you can see what we’ve stocked. Follow us on TikTok, Instagram and Facebook to see new cards as soon as they’re listed.',
    ],
    faq: [
      ['How do I buy a One Piece card from BR Trading Post?', 'Open the item and tap Buy on eBay. Payment, delivery and returns are handled by eBay, with its buyer protection.'],
      ['Do you sell sealed One Piece product?', 'When we have it in stock, sealed One Piece product is listed here alongside singles. Anything that has sold shows a Sold out banner.'],
    ],
  },
  {
    id: 'lorcana',
    logos: ['lorcana'],
    name: 'Disney Lorcana',
    title: 'Disney Lorcana Cards for Sale UK',
    heading: 'Disney Lorcana cards',
    blurb: 'Disney Lorcana TCG singles, enchanted cards and sealed product.',
    keywords: ['lorcana', 'the first chapter', 'rise of the floodborn', 'into the inklands', 'ursula’s return', "ursula's return", 'shimmering skies', 'azurite sea', 'archazia', 'whispers in the well'],
    intro: [
      'Shop Disney Lorcana cards from BR Trading Post, a UK trading card shop. We list Lorcana singles, enchanted and foil cards, and sealed product such as booster packs and gift sets.',
      'Everything you see is live from our eBay shop, with the price, condition and photos of the actual item. Pick an item to see the details, then buy it securely on eBay.',
      'Sold Lorcana cards stay on the site with a Sold out banner, so you can see what we’ve had before. Follow us on social media to catch new Lorcana stock as it arrives.',
    ],
    faq: [
      ['How do I buy Disney Lorcana cards from BR Trading Post?', 'Open the item and tap Buy on eBay. You check out on eBay, so its buyer protection, delivery and returns apply.'],
      ['Where do you post from?', 'We’re a UK shop. The delivery options and costs for each item are shown on its eBay listing.'],
    ],
  },
  {
    id: 'yu-gi-oh',
    logos: ['yu-gi-oh'],
    name: 'Yu-Gi-Oh!',
    title: 'Yu-Gi-Oh! Cards for Sale UK',
    heading: 'Yu-Gi-Oh! cards',
    blurb: 'Yu-Gi-Oh! TCG singles, rares and sealed product.',
    keywords: ['yu-gi-oh', 'yugioh', 'yu gi oh', 'yu-gi-oh!', 'blue-eyes', 'blue eyes white dragon', 'dark magician', 'exodia', 'konami'],
    intro: [
      'Shop Yu-Gi-Oh! cards from BR Trading Post in the UK. We list Yu-Gi-Oh! singles, rare and collectable cards, and sealed product when we have it.',
      'Every listing is live from our eBay shop with the price, condition and photos of the actual card. Choose an item to see the details, then buy it on eBay with eBay’s buyer protection.',
      'Sold Yu-Gi-Oh! cards stay on the site with a Sold out banner, so you can see what we’ve stocked. Follow us on TikTok, Instagram and Facebook to see new cards first.',
    ],
    faq: [
      ['How do I buy Yu-Gi-Oh! cards from BR Trading Post?', 'Open the item and tap Buy on eBay. eBay handles payment, delivery and returns, with its buyer protection.'],
      ['What condition are the cards in?', 'Each listing states the condition and shows photos of the actual card, so you know exactly what you’re buying.'],
    ],
  },
  {
    id: 'other-tcg',
    logos: ['magic', 'digimon'],
    name: 'Other card games',
    title: 'Trading Card Games for Sale UK',
    heading: 'Other card games',
    blurb: 'Magic: The Gathering, Gundam and more trading card games.',
    keywords: ['magic the gathering', 'magic: the gathering', 'mtg', 'flesh and blood', 'digimon', 'dragon ball', 'gundam', 'star wars unlimited', 'weiss schwarz', 'union arena', 'sorcery', 'final fantasy tcg', 'metazoo'],
    intro: [
      'As well as Pokémon, One Piece, Disney Lorcana and Yu-Gi-Oh!, BR Trading Post stocks cards from other trading card games, such as Magic: The Gathering, the Gundam Card Game, Digimon and more.',
      'Every item is live from our eBay shop with the price, condition and photos of the actual item. Open an item for the details, then buy it on eBay with eBay’s buyer protection.',
      'What’s here changes as we find new stock, and sold items stay on the site with a Sold out banner. Follow us on social media to see what’s coming next.',
    ],
    faq: [
      ['Which card games do you sell?', 'Mainly Pokémon, One Piece, Disney Lorcana and Yu-Gi-Oh!, plus other trading card games when we find good stock. Everything we have right now is listed on this page and in the shop.'],
      ['How do I buy from BR Trading Post?', 'Open the item and tap Buy on eBay. You check out on eBay, with its buyer protection.'],
    ],
  },
  {
    id: 'custom-binders',
    logos: [],
    name: 'Custom binders',
    title: 'Custom Painted Card Binders UK',
    heading: 'Custom painted binders',
    blurb: 'Hand painted binders for your card collection, sold on eBay.',
    keywords: ['binder', 'binders', 'portfolio', 'card album'],
    intro: [
      'BR Trading Post makes custom painted binders for trading card collections, painted by hand in the UK. A painted binder makes your collection your own, and makes a great gift for a Pokémon, One Piece or Lorcana fan.',
      'Our custom binders are sold through our eBay shop. Each listing shows the design, size and price, and you buy securely on eBay.',
      'Sold designs stay on the site with a Sold out banner, so you can see the binders we’ve painted before. Follow us on TikTok, Instagram and Facebook to see new designs as they’re finished.',
    ],
    faq: [
      ['Can I ask for my own design?', 'Get in touch by email or on social media with your idea, and we’ll let you know what we can do.'],
      ['Can I return a custom binder?', 'Binders made to your own design are personalised, so the usual 14-day right to cancel doesn’t apply to them. If anything arrives faulty or damaged, contact us and we’ll put it right.'],
    ],
  },
];

export const CATEGORY_ORDER = ['custom-binders', 'pokemon', 'one-piece', 'lorcana', 'yu-gi-oh', 'other-tcg'];
export const FALLBACK_CATEGORY = 'other-tcg';

const normalise = (text) => ` ${String(text ?? '').toLowerCase().normalize('NFKC').replace(/[^a-z0-9é’'!&:\- ]+/g, ' ').replace(/\s+/g, ' ')} `;

function matchCategory(text) {
  const has = (word) => text.includes(` ${normalise(word).trim()}`);
  const binder = CATEGORIES.find((c) => c.id === 'custom-binders');
  if (binder.keywords.some(has) && /\b(custom|painted|hand ?painted)\b/.test(text)) return 'custom-binders';
  for (const id of CATEGORY_ORDER) {
    if (id !== 'custom-binders' && CATEGORIES.find((c) => c.id === id).keywords.some(has)) return id;
  }
  return null;
}

export function categoryFor({ title = '', tags = [], specifics = [] } = {}) {
  return matchCategory(normalise(title))
    || matchCategory(normalise([title, ...tags, ...specifics.flat()].join(' ')))
    || FALLBACK_CATEGORY;
}

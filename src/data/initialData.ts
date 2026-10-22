import { CakeProduct, CartItem, LowStockItem, Order, Review } from '../types';

export const LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCtGwfamoWtmt5u344pIkL7As-GBsfcyExPz5SrzPuNio4NCOhWz-xk8j2pGXw3DvdD23tRVbL1ks4doTiqQ3K0CLEmnfIXN1gqT0HTY3Fe8pR9NLr-hOhhsCOSG1xRZ5dEMnJJwlWgnX07LXOVckSdAGdnX67X628kmktYo0ejqcrkog5tckJ4Cq94lzVuFKKR-XreRgkpLHaqUNEEWX8B3HRw6yvqrZC5WSl9cr44LZx5SGEd1hQCXCY2MdsnBXPnw';
export const HERO_CAKE_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJlNM16ulk1Up7BOPjHjzyPzXvUQjB1oFwrEdVZU5AMg7QgA9dlc1ZVaIBtwkDVhqwih1cn3XRcqd4InWU5V3Bh1Fzy7uY8GNI05CjyILLrLyvPGU36biebVsN8RMAXx7NzhG08jLx_lcITcItaRJGkdNGc3lA6PJIQF-fEcYBfYgmlxHNSpf2NCuBPei2hawlqX3dW4SRRjq2dPCYsQW0JKFSesTN-g6ZCIAVlDLQ7anKQvpWD-zP';
export const INGREDIENTS_IMAGE_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJ6iwsBbhyRk5MvUgz7uo4Ws4yZmyXi9gRPPRqEDKQbZuuTen-06spSv-ZqDXfl6DnugHgS25AyVP_RzFwtr0-UngYWtDYhVMXtxA3jABh_egJ8zLNOceyxEJ_uGOTFplNFW0LFyRshJfnI_0bofpACGlren7oTSFJf4Mo1Ex4QwkvWyAebqXVNVf3Tk1Fobi1cDv9XbJlza5DqEeEl0qQ208XIpV0QshNLZJcUegJW1IhkRsxbpgy';
export const CHEFS_IMAGE_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJHfUCbPbpFizayrPgDMCR1b4BFi7kge4aSFyzerD9SqFGKWGtiFfNnHTKh8gysph7WR20eCsm2yrvm37qQ_qg2DmTzPZNbzV7Jn9hJBFohsERF7_edNJvQpmMuXBM1fDqZtJkTefMPmBMCbZjD0dANCPT_ppHAHlJ1-hRWkSt-IpTNJA3aH5yB9OdVDMvSXkU0Uk_j1P10q4wYKBZKxrfPkuoWz4nfjwoMf6IYpW394O2Cvxq84mR';

export const SIGNATURE_CAKES: CakeProduct[] = [
  {
    id: 'velvet-berry-bliss',
    name: 'Velvet Berry Bliss',
    price: 68,
    description: 'Rich cocoa-infused red velvet sponge with Madagascar vanilla cream cheese.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9DiUZ0jTeohGPTjZTuvzBL2Nec7Sc_o85m4jEIdHHXEr5InuqH8lxaueM6qLTVr4GMCbkhNlItt1gpTkU2LKLIiIOJ6RH1MS4Va-rsD-UPbdmROC21BCho5HkHJFQ9_f_Y-u4bGfXcGgC2HcHcj6Rs3d58ACwvbtg-VHGhcHzwib9RrmU5bBLcHguPM8ho2ErFEGRS0miBeIuxL45trXzUfMTcT74roqPTnbLiROPoymn5LLQu5ts',
    ingredients: 'Ecuadorian cocoa, Bourbon vanilla beans, organic cultured cream cheese, fresh Oregon blackberries & raspberries.',
    servings: '8 - 10 Servings',
    tags: ['Best Seller', 'Artisanal Berries']
  },
  {
    id: 'gold-leaf-ganache',
    name: 'Gold Leaf Ganache',
    price: 85,
    description: 'Valrhona dark chocolate fudge layers wrapped in 24k edible gold leaf accents.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4a4tBcFBG0WWJ5qV5t3p7yFADXyhseAXygj8Ll0fZOh4QVS31Z7HzsDHBDhcj-gUYYJ3JSO-CFdND4NM5N_Fw6LtEtiJ7EB_9D3nldgWK6HTwJM8tbD4Gr_cByx23ed9gG7NCk_R3mEI4SRI6m-q1Jpq388ETrAF4eOX1PZS_sAktOEyWjL9GekiTQPdAjoH7tDdexom1xfSTtTOvMEPa0Tq2XlHkc27vH1gsnJa4QDkCmYLXxXVL',
    ingredients: 'Valrhona 70% Guanaja chocolate, French Normandy butter, 24k edible Florentine gold flakes, dark truffle cream.',
    servings: '10 - 12 Servings',
    tags: ['Gala Favorite', '24k Gold']
  },
  {
    id: 'matcha-dream',
    name: 'Matcha Dream',
    price: 72,
    description: 'Ceremonial grade Uji matcha sponge with white chocolate mousse filling.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyhqtgmcZ5Oth_k-L1yO2pe8oOZMUszxk9nOypmEF5AdJp-mZ3-z8NUiEDNTvf6qLpSoVH0gmALV5JelyigqnW5TRKXmHGsM94yzkTTJovO8xccqGWtoY7la-ePZXGNt4ag4wUNDAcFhqvQxxndN-W722JIrFaY-QzEQ1PKVruwCvsD6gRASbfcv8-mKPXe-XbV93KD1OTp0eOydjjQCbqZgPm1pdkMqRMOr2zZTHdWLX8PkgRJB6_',
    ingredients: 'First-harvest Kyoto Uji matcha, Belgian Opalys 33% white chocolate, light chiffon sponge, piped whipped ganache.',
    servings: '8 - 10 Servings',
    tags: ['Organic', 'Japanese Chiffon']
  },
  {
    id: 'salted-caramel-symphony',
    name: 'Salted Caramel Symphony',
    price: 78,
    description: 'Brown butter sponge layered with house-made fleur de sel caramel and roasted pecans.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBcSc_ePy1OnUpB1tpvBsQOoLLvUwMiB8vG272JCYQgHAEvETdLEz1aORn_40ZSRkSN-VyCmtj9I2YUi9ZA8Q0Fc1RS8dw9BJ11J6eyehshVZkHYrOWp_8SS8qXLCp9a7J2p86I4NMz1hoZ4Rv03SqVDjRDLe0piTP8cqBGB36wMn8jgKpVoyTiwQ74NFYAGrLfJDTpj_trds05d8D-ypaYWR_TtSVC-ujF7uxLloeuRdT3LYE5p35a',
    ingredients: 'French brown butter (beurre noisette), Guérande fleur de sel, copper-kettle amber caramel, caramelized Georgia pecans.',
    servings: '10 - 12 Servings',
    tags: ['Chef Signature', 'Fleur De Sel']
  }
];

export const INITIAL_CART: CartItem[] = [
  {
    id: 'cart-1',
    cakeId: 'velvet-berry-bliss',
    name: 'Velvet Berry Bliss',
    price: 68,
    quantity: 1,
    image: SIGNATURE_CAKES[0].image,
    details: 'Standard 8-10 servings with fresh berry garnish'
  },
  {
    id: 'cart-2',
    cakeId: 'gold-leaf-ganache',
    name: 'Gold Leaf Ganache',
    price: 85,
    quantity: 1,
    image: SIGNATURE_CAKES[1].image,
    details: 'Includes personalized gold chocolate plaque'
  },
  {
    id: 'cart-3',
    cakeId: 'salted-caramel-symphony',
    name: 'Salted Caramel Symphony',
    price: 78,
    quantity: 1,
    image: SIGNATURE_CAKES[3].image,
    details: 'Extra fleur de sel caramel drizzle'
  }
];

export const REVIEWS: Review[] = [
  {
    id: 'rev-1',
    quote: '"The Gold Leaf Ganache cake was an absolute showstopper at our anniversary gala. Not only did it look like high art, but the taste was impeccably balanced and rich."',
    author: 'Eleanor Vance',
    role: 'Event Director, Manhattan',
    initials: 'EV',
    rating: 5
  },
  {
    id: 'rev-2',
    quote: '"Ordering custom tiered cakes used to be stressful, but CakeZone\'s bespoke service made it effortless. The Matcha Dream cake exceeded all expectations!"',
    author: 'Julian Laurent',
    role: 'Food Critic',
    initials: 'JL',
    rating: 5
  },
  {
    id: 'rev-3',
    quote: '"Unmatched quality! The Velvet Berry Bliss cake was moist, decadent, and had the most refined cream cheese frosting I\'ve ever tasted. Highly recommended."',
    author: 'Sophia Martinez',
    role: 'Private Client',
    initials: 'SM',
    rating: 5
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: '#CZ-8492',
    customer: 'Eleanor Vance',
    cakeItem: 'Triple Berry Velvet Tier',
    date: 'Today, 2:45 PM',
    status: 'Pending',
    amount: 145.00
  },
  {
    id: '#CZ-8491',
    customer: 'Marcus Sterling',
    cakeItem: 'Custom Gold Leaf Anniversary Cake',
    date: 'Today, 11:30 AM',
    status: 'Baking',
    amount: 320.50
  },
  {
    id: '#CZ-8490',
    customer: 'Sophia Loren',
    cakeItem: 'Classic French Opera Cake',
    date: 'Yesterday, 4:15 PM',
    status: 'Delivered',
    amount: 85.00
  },
  {
    id: '#CZ-8489',
    customer: 'Liam Hemsworth',
    cakeItem: 'Matcha Green Tea Chiffon',
    date: 'Yesterday, 1:20 PM',
    status: 'Delivered',
    amount: 65.00
  },
  {
    id: '#CZ-8488',
    customer: 'Olivia Wilde',
    cakeItem: 'Salted Caramel Macaron Tower',
    date: 'Oct 24, 2023',
    status: 'Delivered',
    amount: 210.00
  }
];

export const INITIAL_LOW_STOCK: LowStockItem[] = [
  {
    id: 'stock-1',
    name: 'Madagascar Vanilla Bean',
    remaining: 'Only 4 pods remaining',
    count: 4,
    unit: 'pods',
    icon: 'nutrition'
  },
  {
    id: 'stock-2',
    name: 'Belgian Dark Chocolate',
    remaining: '1.5 kg remaining',
    count: 1.5,
    unit: 'kg',
    icon: 'bakery_dining'
  },
  {
    id: 'stock-3',
    name: 'Organic Farm Fresh Eggs',
    remaining: '12 cartons left',
    count: 12,
    unit: 'cartons',
    icon: 'egg'
  }
];

import { CakeProduct, CartItem, LowStockItem, Order, Review } from '../types';

export const LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCtGwfamoWtmt5u344pIkL7As-GBsfcyExPz5SrzPuNio4NCOhWz-xk8j2pGXw3DvdD23tRVbL1ks4doTiqQ3K0CLEmnfIXN1gqT0HTY3Fe8pR9NLr-hOhhsCOSG1xRZ5dEMnJJwlWgnX07LXOVckSdAGdnX67X628kmktYo0ejqcrkog5tckJ4Cq94lzVuFKKR-XreRgkpLHaqUNEEWX8B3HRw6yvqrZC5WSl9cr44LZx5SGEd1hQCXCY2MdsnBXPnw';
export const HERO_CAKE_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJlNM16ulk1Up7BOPjHjzyPzXvUQjB1oFwrEdVZU5AMg7QgA9dlc1ZVaIBtwkDVhqwih1cn3XRcqd4InWU5V3Bh1Fzy7uY8GNI05CjyILLrLyvPGU36biebVsN8RMAXx7NzhG08jLx_lcITcItaRJGkdNGc3lA6PJIQF-fEcYBfYgmlxHNSpf2NCuBPei2hawlqX3dW4SRRjq2dPCYsQW0JKFSesTN-g6ZCIAVlDLQ7anKQvpWD-zP';
export const INGREDIENTS_IMAGE_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJ6iwsBbhyRk5MvUgz7uo4Ws4yZmyXi9gRPPRqEDKQbZuuTen-06spSv-ZqDXfl6DnugHgS25AyVP_RzFwtr0-UngYWtDYhVMXtxA3jABh_egJ8zLNOceyxEJ_uGOTFplNFW0LFyRshJfnI_0bofpACGlren7oTSFJf4Mo1Ex4QwkvWyAebqXVNVf3Tk1Fobi1cDv9XbJlza5DqEeEl0qQ208XIpV0QshNLZJcUegJW1IhkRsxbpgy';
export const CHEFS_IMAGE_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJHfUCbPbpFizayrPgDMCR1b4BFi7kge4aSFyzerD9SqFGKWGtiFfNnHTKh8gysph7WR20eCsm2yrvm37qQ_qg2DmTzPZNbzV7Jn9hJBFohsERF7_edNJvQpmMuXBM1fDqZtJkTefMPmBMCbZjD0dANCPT_ppHAHlJ1-hRWkSt-IpTNJA3aH5yB9OdVDMvSXkU0Uk_j1P10q4wYKBZKxrfPkuoWz4nfjwoMf6IYpW394O2Cvxq84mR';

export const SIGNATURE_CAKES: CakeProduct[] = [
  {
    id: 'chocolate-truffle',
    name: 'Chocolate Truffle',
    price: 899,
    rating: 4.8,
    reviewsCount: 124,
    category: 'Chocolate',
    description: 'Decadent dark chocolate sponge layered with silky Belgian chocolate truffle ganache.',
    image: '/assets/aistudio/cake_chocolate_truffle.png',
    ingredients: 'Belgian 70% dark chocolate, Dutch-processed cocoa, fresh cream, French butter.',
    servings: '8 - 10 Servings',
    tags: ['Chocolate', 'Best Seller']
  },
  {
    id: 'strawberry-dream',
    name: 'Strawberry Dream',
    price: 999,
    rating: 4.9,
    reviewsCount: 98,
    category: 'Birthday',
    description: 'Light vanilla sponge crowned with fresh farm strawberries, berries, and floral buttercream.',
    image: '/assets/aistudio/cake_strawberry_dream.png',
    ingredients: 'Fresh strawberries, organic blueberries, whipped mascarpone cream, Madagascar vanilla.',
    servings: '8 - 10 Servings',
    tags: ['Birthday', 'Fresh Fruit']
  },
  {
    id: 'red-velvet',
    name: 'Red Velvet',
    price: 949,
    rating: 4.8,
    reviewsCount: 76,
    category: 'Red Velvet',
    description: 'Classic crimson cocoa velvet layers finished with whipped cream cheese frosting rosettes.',
    image: '/assets/aistudio/cake_red_velvet.png',
    ingredients: 'Cultured cream cheese, Ecuadorian cocoa touch, buttermilk sponge, vanilla bean frosting.',
    servings: '8 - 10 Servings',
    tags: ['Red Velvet', 'Signature']
  },
  {
    id: 'butterscotch-bliss',
    name: 'Butterscotch Bliss',
    price: 899,
    rating: 4.7,
    reviewsCount: 64,
    category: 'Birthday',
    description: 'Warm brown-butter sponge drizzled with golden caramel butterscotch sauce and crunchy praline.',
    image: '/assets/aistudio/cake_butterscotch_bliss.png',
    ingredients: 'Caramelized cashew praline, house-made butterscotch drizzle, brown sugar sponge, whipped cream.',
    servings: '8 - 10 Servings',
    tags: ['Birthday', 'Caramel Praline']
  },
  {
    id: 'black-forest',
    name: 'Black Forest',
    price: 949,
    rating: 4.8,
    reviewsCount: 92,
    category: 'Chocolate',
    description: 'Traditional German chocolate sponge layered with Chantilly cream, dark chocolate curls, and cherries.',
    image: '/assets/aistudio/cake_black_forest.png',
    ingredients: 'Morello cherries, dark chocolate shavings, Chantilly whipped cream, rich cocoa sponge.',
    servings: '8 - 10 Servings',
    tags: ['Chocolate', 'Classic']
  },
  {
    id: 'vanilla-fresh-cream',
    name: 'Vanilla Fresh Cream',
    price: 799,
    rating: 4.6,
    reviewsCount: 56,
    category: 'Vanilla',
    description: 'Feather-light Madagascar vanilla sponge frosted in fresh dairy cream with hand-piped pastel roses.',
    image: '/assets/aistudio/cake_vanilla_fresh_cream.png',
    ingredients: 'Madagascar Bourbon vanilla pods, pure dairy whipping cream, pastel buttercream florals.',
    servings: '8 - 10 Servings',
    tags: ['Vanilla', 'Floral']
  },
  {
    id: 'kitkat-cake',
    name: 'KitKat Cake',
    price: 1099,
    rating: 4.0,
    reviewsCount: 121,
    category: 'Chocolate',
    description: 'Indulgent chocolate layer cake with glossy ganache drips and crispy wafer chocolate swirls.',
    image: '/assets/aistudio/cake_kitkat.png',
    ingredients: 'Crispy chocolate wafer fingers, milk & dark chocolate ganache, fudge sponge.',
    servings: '10 - 12 Servings',
    tags: ['Chocolate', 'Birthday']
  },
  {
    id: 'designer-cake',
    name: 'Designer Cake',
    price: 1299,
    rating: 4.9,
    reviewsCount: 87,
    category: 'Custom',
    description: 'Bespoke couture celebration cake adorned with cascading hand-sculpted buttercream roses and botanicals.',
    image: '/assets/aistudio/cake_designer.png',
    ingredients: 'Swiss meringue buttercream, artisanal sponge of choice, hand-piped botanical florals.',
    servings: '10 - 14 Servings',
    tags: ['Custom', 'Designer']
  }
];

export const INITIAL_CART: CartItem[] = [];

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

export type ScreenType = 'storefront' | 'signin' | 'signup' | 'dashboard' | 'profile' | 'update-password';

export interface CakeProduct {
  id: string;
  name: string;
  price: number;
  rating?: number;
  reviewsCount?: number;
  category?: string;
  description: string;
  image: string;
  ingredients: string;
  servings: string;
  tags: string[];
}

export interface CartItem {
  id: string;
  cakeId?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  details?: string;
}

export type OrderStatus = 'Pending' | 'Baking' | 'Delivered';

export interface Order {
  id: string;
  customer: string;
  cakeItem: string;
  date: string;
  status: OrderStatus;
  amount: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  remaining: string;
  count: number;
  unit: string;
  icon: string;
  isRestocked?: boolean;
}

export interface Review {
  id: string;
  quote: string;
  author: string;
  role: string;
  initials: string;
  rating: number;
}

export interface CustomCakeConfig {
  tiers: number;
  spongeFlavor: string;
  filling: string;
  exteriorFinish: string;
  accents: string[];
  servings: number;
  message: string;
  eventDate: string;
  estimatedPrice: number;
}

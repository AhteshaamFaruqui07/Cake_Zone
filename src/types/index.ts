export type ScreenType = 'storefront' | 'signin' | 'signup' | 'dashboard' | 'profile' | 'update-password';

export interface CakeProduct {
  id: string;
  name: string;
  caption?: string;
  price: number;
  rating?: number;
  reviewsCount?: number;
  category?: string;
  description: string;
  image: string;
  storagePath?: string;
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
  isCustomCake?: boolean;
  customCakeData?: {
    customerName: string;
    phoneNumber: string;
    eventDate: string;
    designNotes: string;
    referenceImageName?: string;
    referenceImageUrl?: string;
  };
}

export type OrderStatus = 'Pending' | 'Baking' | 'Delivered';

export interface Order {
  id: string;
  userId?: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  cakeItem: string;
  cakeTypeDetail?: string;
  date: string;
  timeOfIssue?: string;
  createdAt?: string;
  status: OrderStatus;
  amount: number;
  specialInstructions?: string;
}

export interface LoggedInUserRecord {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  city?: string;
  cityCode?: string;
  address?: string;
  lastLoginAt?: string;
  lastActive?: string;
  avatarUrl?: string;
}

export interface CustomCakeTierOption {
  count: number;
  label: string;
  guests: string;
  price: number;
}

export interface CustomCakeBuilderSettings {
  tiers: CustomCakeTierOption[];
  accentPrice: number;
  spongeFlavors: string[];
  fillings: string[];
  exteriorFinishes: string[];
  accents: string[];
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

export interface GalleryItem {
  id: string;
  userId?: string;
  category: string; // Type / Badge (e.g. 'BESPOKE ROYAL', 'WEDDING TIERED')
  title: string; // Item Heading
  subHeading?: string; // Sub-heading / Signature Notes
  description: string; // Description
  image: string; // Resolved image URL
  storagePath?: string; // Supabase Storage path in 'app-files'
  fallbackImage: string;
  servings: string;
  leadTime: string;
  rowNumber: 1 | 2; // Row 1 (Left marquee) or Row 2 (Right marquee)
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GallerySectionSettings {
  heading: string;
  subHeading: string;
  description: string;
}

export interface SavedUserProfileRecord {
  id: string;
  userId?: string;
  fullName: string;
  email: string;
  phone: string;
  cityCode?: string;
  address: string;
  coverImage?: string;
  coverImageName?: string;
  coverStoragePath?: string;
  dietaryNotes: string;
  savedAt: string;
  role?: string;
}



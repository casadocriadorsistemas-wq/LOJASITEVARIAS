export type SellMode = 'bag_and_bulk' | 'bag_only' | 'bulk_only' | 'unit';

export interface BagVariation {
  id: string;
  weightKg: number;
  price: number;
  stockBags?: number;
}

export type AnimalType = 'dog' | 'cat' | 'bird' | 'fish' | 'other';

export interface Product {
  id: string;
  lojaId?: string;
  name: string;
  description: string;
  categoryId: string;
  categoryIds?: string[];
  imageUrl: string;
  sellMode: SellMode;
  bagPrice?: number;
  bagWeightKg?: number;
  bagVariations?: BagVariation[];
  bulkPricePerKg?: number;
  unitPrice?: number;
  unitLabel?: string; // e.g. "unidade", "frasco", "pacote", "lata"
  stockKg?: number;
  stockBags?: number;
  stockUnits?: number;
  inStock: boolean;
  isFeatured?: boolean;
  isConsultationOnly?: boolean;
  isOnSale?: boolean;
  promoDiscountText?: string; // e.g. "10% OFF" or "Preço Baixo"
  animalType?: AnimalType;
  animalTypes?: AnimalType[];
  createdAt?: string;
}

export interface Category {
  id: string;
  lojaId?: string;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
}

export type CartItemType = 'bag' | 'bulk_kg' | 'bulk_value' | 'unit';

export interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  imageUrl: string;
  type: CartItemType;
  label: string;
  details: string;
  unitPrice: number;
  quantity: number; // for bags or units, or 1 for bulk
  calculatedWeightKg?: number;
  totalPrice: number;
}

export interface Coupon {
  id: string;
  lojaId?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  isActive: boolean;
  description?: string;
}

export interface StoreSettings {
  id: string;
  lojaId?: string;
  storeName: string;
  whatsappNumber: string;
  address: string;
  deliveryFeeType: 'fixed' | 'free_above' | 'calculate';
  fixedDeliveryFee: number;
  freeDeliveryThreshold: number;
  scheduleMode: 'auto' | 'forced_open' | 'forced_closed';
  weekdayOpen: string;
  weekdayClose: string;
  saturdayOpen: string;
  saturdayClose: string;
  sundayOpen: string;
  sundayClose: string;
  isSundayClosed: boolean;
  closedMessage: string;
  whatsappHelpNotice: string;
  adminPassword?: string;
  hidePetFilters?: boolean;
  disablePetMode?: boolean;
  logoUrl?: string;
  shareDescription?: string;
}

export interface CustomerProfile {
  id?: string;
  phone: string; // 11 clean digits e.g. "44999918762"
  formattedPhone: string; // formatted "(44) 99991-8762"
  name: string;
  streetAddress?: string;
  numberAddress?: string;
  neighborhood?: string;
  reference?: string;
  lojaId?: string;
  ordersCount?: number;
  updatedAt?: string;
}

export interface OrderRecord {
  id: string;
  lojaId?: string;
  customerName: string;
  customerPhone: string;
  isExistingCustomer?: boolean;
  deliveryType: 'delivery' | 'pickup';
  address: string;
  paymentMethod: string;
  changeFor?: string;
  notes?: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string;
  itemsSummary: string;
  status: 'novo' | 'preparando' | 'saiu_entrega' | 'concluido' | 'cancelado';
  createdAt: string;
}

export interface SystemSubscription {
  id: string; // 'config'
  lojaId?: string;
  monthlyFee: number;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  isExpiredManualOverride?: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface StoreTenantSummary {
  lojaId: string;
  storeName: string;
  phone: string;
  address: string;
  notes: string;
  dueDate: string;
  monthlyFee: number;
  startDate?: string;
  isExpired: boolean;
  isExpiredManualOverride?: boolean;
  daysRemaining: number;
  formattedDueDate: string;
  productsCount?: number;
  categoriesCount?: number;
  ordersCount?: number;
  updatedAt?: string;
}


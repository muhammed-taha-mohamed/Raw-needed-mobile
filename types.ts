// Payment Information (Admin)
export type PaymentType = 'BANK_ACCOUNT' | 'ELECTRONIC_WALLET';

export interface PaymentInfo {
  id: string;
  transferNumber: string;
  accountNumber?: string;
  paymentType: PaymentType;
  accountHolderName?: string;
  bankName?: string;
  walletProvider?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Plan features enum (backend sends these keys; display names translated in UI)
export enum PlanFeaturesEnum {
  SUPPLIER_ADVERTISEMENTS = 'SUPPLIER_ADVERTISEMENTS',
  SUPPLIER_PRIVATE_ORDERS = 'SUPPLIER_PRIVATE_ORDERS',
  SUPPLIER_SPECIAL_OFFERS = 'SUPPLIER_SPECIAL_OFFERS',
  SUPPLIER_ADVANCED_REPORTS = 'SUPPLIER_ADVANCED_REPORTS',
  CUSTOMER_PRIVATE_ORDERS = 'CUSTOMER_PRIVATE_ORDERS',
  CUSTOMER_RAW_MATERIALS_ADVANCE = 'CUSTOMER_RAW_MATERIALS_ADVANCE',
  CUSTOMER_VIEW_SUPPLIER_OFFERS = 'CUSTOMER_VIEW_SUPPLIER_OFFERS',
  CUSTOMER_ADVANCED_REPORTS = 'CUSTOMER_ADVANCED_REPORTS',
}

export interface PlanFeature {
  feature: PlanFeaturesEnum | string;
  price: number;
}

export interface ProductSearchesConfig {
  from?: number;
  to?: number;
  unlimited?: boolean;
  pricePerSearch?: number;
}

export interface UserActivity {
  id: string;
  userName: string;
  userInitial: string;
  action: string;
  status: 'Completed' | 'Pending' | 'Open' | 'Rejected';
  date: string;
  colorClass: string;
}

export type BillingFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type PlanType = 'SUPPLIER' | 'CUSTOMER' | 'BOTH';

export interface SpecialOffer {
  minUserCount: number;
  discountPercentage: number;
  description: string;
}

export interface Plan {
  id: string;
  name: string;
  pricePerUser: number;
  description?: string;
  billingFrequency: BillingFrequency;
  planType: PlanType;
  specialOffers: SpecialOffer[];
  status?: 'Active' | 'Archived' | 'Draft';
  active: boolean;
  isPopular?: boolean;
  features?: (string | PlanFeature)[];
  productSearchesConfig?: ProductSearchesConfig;
  baseSubscriptionPrice?: number;
  exclusive: boolean;
  description?: string;
  hasAdvertisements?: boolean;
}

export interface Advertisement {
  id: string;
  image: string;
  text: string;
  userId?: string; // The supplier ID returned from API
  supplierId?: string; // Compatibility field
  createdAt?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  numberOfUsers: number;
  usedUsers: number;
  remainingUsers: number;
  total: number;
  discount: number;
  finalPrice: number;
  filePath: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submissionDate: string;
  subscriptionDate: string;
  expiryDate: string;
  numberOfSearchesPurchased?: number;
  remainingSearches?: number;
  pointsEarned?: number;
  selectedFeatures?: (PlanFeaturesEnum | string)[];
}

// Calculate price request/response for subscriptions
export interface CalculatePriceRequest {
  planId: string;
  numberOfUsers: number;
  numberOfSearches?: number;
  selectedFeatures?: (PlanFeaturesEnum | string)[];
}

export interface CalculatePriceResponse {
  planId: string;
  planName: string;
  pricePerUser: number;
  numberOfUsers: number;
  basePrice?: number;
  numberOfSearches?: number;
  searchesPrice?: number;
  featuresPrice?: number;
  total: number;
  discount: number;
  finalPrice: number;
  appliedOffer?: SpecialOffer;
  availableOffers: SpecialOffer[];
}

export interface UserSubscriptionRequest {
  planId: string;
  numberOfUsers: number;
  subscriptionFile: string;
  numberOfSearches?: number;
  selectedFeatures?: (PlanFeaturesEnum | string)[];
}

export interface ComplaintMessage {
  id: string;
  complaintId: string;
  userId: string;
  userName: string;
  message: string;
  image: string | null;
  createdAt: string;
  admin: boolean;
}

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  description: string;
  image: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages: ComplaintMessage[];
}

export interface OrderMessage {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userOrganizationName: string;
  message: string;
  image: string | null;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  companyName: string;
  companyLogo: string;
  planRequested: string;
  submittedOn: string;
  totalValue: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface SubCategory {
  id: string;
  name: string;
  arabicName: string;
}

export interface Category {
  id: string;
  name: string;
  arabicName: string;
  subCategories?: SubCategory[];
  isLoadingSubs?: boolean;
}

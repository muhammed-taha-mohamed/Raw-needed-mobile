export const APP_LOGO = "https://res.cloudinary.com/drzge8ywz/image/upload/v1767602047/trust-app-images/s6agj3qyywabs6bgnwk3.png";

// Plan feature display names (AR/EN) and which plan type they belong to
import type { PlanType } from './types';

export const PLAN_FEATURE_LABELS: Record<string, { en: string; ar: string; planType: 'SUPPLIER' | 'CUSTOMER' }> = {
  // Supplier Features
  SUPPLIER_ADVERTISEMENTS: { en: 'Advertisements', ar: 'الإعلانات', planType: 'SUPPLIER' },
  SUPPLIER_PRIVATE_ORDERS: { en: 'Private Orders', ar: 'الطلبات الخاصة', planType: 'SUPPLIER' },
  SUPPLIER_SPECIAL_OFFERS: { en: 'Special Offers', ar: 'العروض الخاصة', planType: 'SUPPLIER' },
  SUPPLIER_ADVANCED_REPORTS: { en: 'Advanced Reports', ar: 'التقارير المتقدمة', planType: 'SUPPLIER' },
  // Customer Features
  CUSTOMER_PRIVATE_ORDERS: { en: 'Private Orders', ar: 'الطلبات الخاصة', planType: 'CUSTOMER' },
  CUSTOMER_RAW_MATERIALS_ADVANCE: { en: 'Raw Materials Advance', ar: 'سلفة الخامات', planType: 'CUSTOMER' },
  CUSTOMER_VIEW_SUPPLIER_OFFERS: { en: 'View Supplier Special Offers', ar: 'ظهور العروض الخاصة للموردين', planType: 'CUSTOMER' },
  CUSTOMER_ADVANCED_REPORTS: { en: 'Advanced Reports', ar: 'التقارير المتقدمة', planType: 'CUSTOMER' },
};

export function getPlanFeaturesForType(planType: PlanType): string[] {
  const list = Object.entries(PLAN_FEATURE_LABELS)
    .filter(([, v]) => planType === 'BOTH' || v.planType === planType)
    .map(([k]) => k);
  return list;
}

export function getPlanFeatureLabel(key: string, lang: 'ar' | 'en'): string {
  const entry = PLAN_FEATURE_LABELS[key];
  return entry ? (lang === 'ar' ? entry.ar : entry.en) : key;
}
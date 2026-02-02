import { api } from '../api';
import { UserSubscription, PlanFeaturesEnum } from '../types';

let cachedSubscription: UserSubscription | null = null;
let subscriptionPromise: Promise<UserSubscription | null> | null = null;

/**
 * Fetches the current user's subscription
 */
export async function getUserSubscription(): Promise<UserSubscription | null> {
  // Return cached subscription if available
  if (cachedSubscription) {
    return cachedSubscription;
  }

  // Return existing promise if already fetching
  if (subscriptionPromise) {
    return subscriptionPromise;
  }

  // Fetch subscription
  subscriptionPromise = (async () => {
    try {
      const subscription = await api.get<UserSubscription>('/api/v1/user-subscriptions/my-subscription');
      cachedSubscription = subscription;
      return subscription;
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      return null;
    } finally {
      subscriptionPromise = null;
    }
  })();

  return subscriptionPromise;
}

/**
 * Clears the cached subscription (call this when subscription changes)
 */
export function clearSubscriptionCache() {
  cachedSubscription = null;
  subscriptionPromise = null;
}

/**
 * Checks if the user has a specific feature in their subscription
 */
export async function hasFeature(feature: PlanFeaturesEnum | string): Promise<boolean> {
  const subscription = await getUserSubscription();
  if (!subscription || !subscription.selectedFeatures) {
    return false;
  }
  return subscription.selectedFeatures.includes(feature);
}

/**
 * Gets all features the user has in their subscription
 */
export async function getUserFeatures(): Promise<(PlanFeaturesEnum | string)[]> {
  const subscription = await getUserSubscription();
  return subscription?.selectedFeatures || [];
}

/**
 * Checks if user has feature synchronously (uses cached subscription)
 * Returns null if subscription not yet loaded, true/false if loaded
 */
export function hasFeatureSync(feature: PlanFeaturesEnum | string): boolean | null {
  if (!cachedSubscription || !cachedSubscription.selectedFeatures) {
    return null;
  }
  return cachedSubscription.selectedFeatures.includes(feature);
}

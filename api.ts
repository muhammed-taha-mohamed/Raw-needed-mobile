
// Base URL 
 //export const BASE_URL = 'https://localhost:8644/raw-needed';
export const BASE_URL = 'https://api.rawneeded.com/raw-needed';


export interface ApiResponse<T> {
  date?: string;
  content?: {
    success: boolean;
    data: T;
  };
  error?: {
    errorMessage: string;
  };
}

// Toast service to show errors globally
let toastService: ((message: string, type?: 'error' | 'success' | 'info' | 'warning') => void) | null = null;

export const setToastService = (service: (message: string, type?: 'error' | 'success' | 'info' | 'warning') => void) => {
  toastService = service;
};

// Track pending requests to prevent duplicate calls
const pendingRequests = new Map<string, Promise<any>>();

// Track recent errors to prevent spam
const recentErrors = new Map<string, number>();
const ERROR_COOLDOWN = 10000; // 10 seconds cooldown between error toasts for same endpoint

// Track failed requests to prevent immediate retries
const failedRequests = new Map<string, number>();
const FAILED_REQUEST_COOLDOWN = 30000; // 30 seconds cooldown before retrying failed network requests

async function internalRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const lang = localStorage.getItem('lang') || 'ar';
  
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${BASE_URL}${cleanEndpoint}`;

  // Create a unique request key to prevent duplicate calls
  // Include body hash for POST/PUT/PATCH to differentiate requests with different data
  let requestKey = `${options.method || 'GET'}:${fullUrl}`;
  
  // For requests with body, add a simple hash to differentiate them
  if (options.body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
    if (options.body instanceof FormData) {
      // For FormData, don't deduplicate (each upload is unique)
      // This allows multiple file uploads
      requestKey += `:${Date.now()}`;
    } else {
      // For JSON, create a simple hash from the body string to identify duplicate requests
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      // Use first 200 chars as hash to identify similar requests
      const bodyHash = bodyStr.length > 200 ? bodyStr.substring(0, 200) : bodyStr;
      requestKey += `:${bodyHash}`;
    }
  }
  
  // Check if there's already a pending request for this endpoint - return it instead of creating new one
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey)!;
  }

  // Check if this request recently failed (network error) - block it for cooldown period
  const lastFailedTime = failedRequests.get(requestKey);
  if (lastFailedTime) {
    const now = Date.now();
    const timeSinceFailure = now - lastFailedTime;
    
    if (timeSinceFailure < FAILED_REQUEST_COOLDOWN) {
      // Request failed recently, block it and throw error immediately
      const errorMsg = `Network Error: Unable to connect. Please wait before retrying.`;
      throw new Error(errorMsg);
    } else {
      // Enough time has passed, allow retry and clear the failure record
      failedRequests.delete(requestKey);
    }
  }

  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Accept-Language': lang,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Create the request promise
  const requestPromise = (async (): Promise<T> => {
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        mode: 'cors',
        cache: 'no-cache',
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = { content: { success: response.ok } };
      }

      // Interceptor: Handle errors when status is not 200
      if (!response.ok || data.error) {
        const errorMsg = data.error?.errorMessage || `Server error (${response.status}): ${response.statusText}`;
        const errorCode = data.error?.errorCode;

        // Check cooldown before showing error toast (skip for 518 - no searches, 513 - existing session - so UI can handle)
        const lastErrorTime = recentErrors.get(requestKey) || 0;
        const now = Date.now();
        const shouldShowToast = (now - lastErrorTime) > ERROR_COOLDOWN && errorCode !== '518' && errorCode !== '513';
        if (shouldShowToast && toastService && errorMsg) {
          recentErrors.set(requestKey, now);
          toastService(errorMsg, 'error');
        }

        const err = new Error(errorMsg) as Error & { errorCode?: string };
        if (errorCode) err.errorCode = errorCode;
        throw err;
      }

      // Clear error tracking on success
      recentErrors.delete(requestKey);
      failedRequests.delete(requestKey);
      
      return (data.content?.data !== undefined ? data.content.data : data.content) as T;
    } catch (err: any) {
      // Handle network errors specifically
      if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
        const helpMsg = `Network Error: Unable to connect to ${BASE_URL}.`;
        
        // Mark this request as failed
        const now = Date.now();
        failedRequests.set(requestKey, now);
        
        // Check cooldown before showing network error toast
        const lastErrorTime = recentErrors.get(requestKey) || 0;
        const shouldShowToast = (now - lastErrorTime) > ERROR_COOLDOWN;
        
        if (shouldShowToast && toastService) {
          recentErrors.set(requestKey, now);
          toastService(helpMsg, 'error');
        }
        
        throw new Error(helpMsg);
      }
      
      throw err;
    } finally {
      // Always remove from pending requests after completion (success or failure)
      // Use setTimeout to ensure this happens after error handling
      setTimeout(() => {
        pendingRequests.delete(requestKey);
      }, 100);
    }
  })();

  // Store the pending request BEFORE returning
  pendingRequests.set(requestKey, requestPromise);
  
  return requestPromise;
}

export const api = {
  request: internalRequest,
  get<T>(endpoint: string) { return internalRequest<T>(endpoint, { method: 'GET' }); },
  post<T>(endpoint: string, body: any) { 
    const isFormData = body instanceof FormData;
    return internalRequest<T>(endpoint, { 
      method: 'POST', 
      body: isFormData ? body : JSON.stringify(body) 
    }); 
  },
  put<T>(endpoint: string, body: any) { 
    const isFormData = body instanceof FormData;
    return internalRequest<T>(endpoint, { 
      method: 'PUT', 
      body: isFormData ? body : JSON.stringify(body) 
    }); 
  },
  patch<T>(endpoint: string, body: any) { 
    const isFormData = body instanceof FormData;
    return internalRequest<T>(endpoint, { 
      method: 'PATCH', 
      body: isFormData ? body : JSON.stringify(body) 
    }); 
  },
  delete<T>(endpoint: string) { return internalRequest<T>(endpoint, { method: 'DELETE' }); },
};

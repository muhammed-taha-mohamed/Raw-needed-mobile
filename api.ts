
const BASE_URL = 'https://api.rawneeded.com/raw-needed';

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

async function internalRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const lang = localStorage.getItem('lang') || 'ar';
  
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${BASE_URL}${cleanEndpoint}`;

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

    if (!response.ok || data.error) {
      const errorMsg = data.error?.errorMessage || `Server error (${response.status}): ${response.statusText}`;
      throw new Error(errorMsg);
    }

    return (data.content?.data !== undefined ? data.content.data : data.content) as T;
  } catch (err: any) {
    if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
      const helpMsg = `Network Error: Unable to connect to ${BASE_URL}.`;
      throw new Error(helpMsg);
    }
    throw err;
  }
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

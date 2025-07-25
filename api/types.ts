export interface SPAPICredentials {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
  expiresIn: number;
  expiresAt: number;
}


export interface SPAPIError {
  code: string;
  message: string;
  details?: string;
}

export interface SPAPIResponse<T> {
  payload?: T;
  errors?: SPAPIError[];
}

export interface RateLimitInfo {
  rate: number;
  burst: number;
  timeWindow: string;
}

export interface APIEndpoint {
  resource: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  rateLimits?: RateLimitInfo[];
}

// Common SP-API endpoints
export const SP_API_ENDPOINTS = {
  TOKEN: '/auth/o2/token',
  CATALOG_ITEMS: '/catalog/2020-12-01/items',
  LISTINGS_ITEMS: '/listings/2021-08-01/items',
} as const;
export interface AmazonConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  region: 'us-east-1' | 'eu-west-1' | 'us-west-2';
  marketplaceId: string;
  sellerId: string;
  sandbox?: boolean; // Enable sandbox mode
}

export interface AppConfig {
  amazon: AmazonConfig;
  defaults: {
    dryRun: boolean;
    verbose: boolean;
    retryAttempts: number;
    requestTimeout: number;
  };
}

export interface PartialAppConfig {
  amazon?: Partial<AmazonConfig>;
  defaults?: Partial<{
    dryRun: boolean;
    verbose: boolean;
    retryAttempts: number;
    requestTimeout: number;
  }>;
}

export const DEFAULT_CONFIG: Partial<AppConfig> = {
  defaults: {
    dryRun: false,
    verbose: false,
    retryAttempts: 3,
    requestTimeout: 30000, // 30 seconds
  },
};

export const MARKETPLACE_IDS = {
  'us-east-1': 'ATVPDKIKX0DER', // US
  'eu-west-1': 'A1PA6795UKMFR9', // DE
  'us-west-2': 'ATVPDKIKX0DER', // US West
} as const;

export const REGION_ENDPOINTS = {
  'us-east-1': 'https://sellingpartnerapi-na.amazon.com',
  'eu-west-1': 'https://sellingpartnerapi-eu.amazon.com',
  'us-west-2': 'https://sellingpartnerapi-fe.amazon.com',
} as const;

export const SANDBOX_ENDPOINTS = {
  'us-east-1': 'https://sandbox.sellingpartnerapi-na.amazon.com',
  'eu-west-1': 'https://sandbox.sellingpartnerapi-eu.amazon.com',
  'us-west-2': 'https://sandbox.sellingpartnerapi-fe.amazon.com',
} as const;
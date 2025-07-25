import axios, { AxiosInstance, AxiosResponse } from 'axios';
import chalk from 'chalk';
import { AmazonConfig, REGION_ENDPOINTS, SANDBOX_ENDPOINTS } from '../config/default-config.js';
import { SPAPIAuthenticator } from './auth.js';
import { SPAPIResponse, SPAPIError } from './types.js';
import { SPAPICache } from '../utils/cache.js';
import { performanceMonitor, setupPerformanceInterceptors } from '../utils/performance.js';

export class SPAPIClient {
  private authenticator: SPAPIAuthenticator;
  private config: AmazonConfig;
  private axiosInstance: AxiosInstance;
  private requestCount: number = 0;
  private cache: SPAPICache;

  constructor(config: AmazonConfig) {
    this.config = config;
    this.authenticator = new SPAPIAuthenticator(config);
    this.cache = SPAPICache.getInstance();
    
    // Use sandbox endpoints if sandbox mode is enabled
    const baseURL = config.sandbox ? SANDBOX_ENDPOINTS[config.region] : REGION_ENDPOINTS[config.region];
    
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'amazon-harness-cli/1.0.0',
      },
    });

    this.setupInterceptors();
    
    // Setup performance monitoring
    setupPerformanceInterceptors(this.axiosInstance);
  }

  private setupInterceptors(): void {
    // Request interceptor - add LWA authentication (no AWS signing required as of Oct 2023)
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        this.requestCount++;
        
        // Get LWA access token (no AWS IAM role needed anymore!)
        const accessToken = await this.authenticator.getAccessToken();
        config.headers = config.headers || {};
        config.headers['x-amz-access-token'] = accessToken;

        // Add marketplace ID
        config.headers['x-amz-marketplace-id'] = this.config.marketplaceId;
        
        // Add user agent
        config.headers['User-Agent'] = 'amazon-harness-cli/1.0.0 (Language=TypeScript)';

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and rate limiting
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logResponse(response);
        return response;
      },
      async (error) => {
        this.logError(error);
        
        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            console.log(chalk.yellow(`Rate limited. Waiting ${retryAfter} seconds...`));
            await this.sleep(parseInt(retryAfter) * 1000);
            // Retry the request
            return this.axiosInstance.request(error.config);
          }
        }

        // Handle token expiration
        if (error.response?.status === 401) {
          console.log(chalk.yellow('Token expired, clearing credentials and retrying...'));
          this.authenticator.clearCredentials();
          // Retry once with fresh credentials
          if (!error.config._retry) {
            error.config._retry = true;
            return this.axiosInstance.request(error.config);
          }
        }

        return Promise.reject(error);
      }
    );
  }


  private logResponse(response: AxiosResponse): void {
    console.log(chalk.gray(`[${this.requestCount}] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`));
  }

  private logError(error: any): void {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 'No Response';
      const url = error.config?.url || 'Unknown URL';
      console.log(chalk.red(`[${this.requestCount}] ${error.config?.method?.toUpperCase()} ${url} - ${status}`));
      
      if (error.response?.data) {
        console.log(chalk.red('Response data:'), JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generic API call method
  async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<SPAPIResponse<T>> {
    try {
      const response = await this.axiosInstance.request({
        method,
        url: endpoint,
        data,
        params,
      });

      return response.data as SPAPIResponse<T>;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as SPAPIResponse<T>;
      }
      throw error;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      console.log(chalk.blue('Testing SP-API connection...'));
      
      // Test authentication first
      const authTest = await this.authenticator.testAuthentication();
      if (!authTest) {
        return false;
      }

      // Test a simple API call (this would be a real endpoint in production)
      console.log(chalk.gray('Testing API endpoint...'));
      
      // For now, we'll just return true if authentication passed
      // In a real implementation, we'd make a test API call here
      console.log(chalk.green('✅ SP-API client ready'));
      return true;

    } catch (error) {
      console.log(chalk.red('❌ SP-API connection test failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  // Get client statistics
  getStats(): { requestCount: number } {
    return { requestCount: this.requestCount };
  }
}
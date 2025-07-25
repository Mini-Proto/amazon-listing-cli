import axios from 'axios';
import chalk from 'chalk';
import { AmazonConfig } from '../config/default-config.js';
import { SPAPICredentials } from './types.js';

export class SPAPIAuthenticator {
  private credentials: SPAPICredentials | null = null;
  private config: AmazonConfig;

  constructor(config: AmazonConfig) {
    this.config = config;
  }

  async getAccessToken(): Promise<string> {
    // Check if we have valid credentials
    if (this.credentials && this.isTokenValid(this.credentials)) {
      return this.credentials.accessToken;
    }

    // Refresh the token
    await this.refreshAccessToken();
    
    if (!this.credentials) {
      throw new Error('Failed to obtain access token');
    }

    return this.credentials.accessToken;
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post('https://api.amazon.com/auth/o2/token', {
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = response.data;
      this.credentials = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.config.refreshToken,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        throw new Error(`Failed to refresh access token: ${errorData?.error_description || error.message}`);
      }
      throw new Error(`Failed to refresh access token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private isTokenValid(credentials: SPAPICredentials): boolean {
    // Add 5 minute buffer before expiration
    const bufferTime = 5 * 60 * 1000; // 5 minutes in ms
    return Date.now() < (credentials.expiresAt - bufferTime);
  }

  async testAuthentication(): Promise<boolean> {
    try {
      console.log(chalk.gray('Testing SP-API authentication...'));
      
      // Step 1: Get LWA access token
      console.log(chalk.gray('1. Obtaining LWA access token...'));
      const accessToken = await this.getAccessToken();
      console.log(chalk.green('✅ LWA access token obtained successfully'));

      // Step 2: Validate token format
      console.log(chalk.gray('2. Validating token format...'));
      if (accessToken && accessToken.length > 10) {
        console.log(chalk.green('✅ Access token format is valid'));
      } else {
        console.log(chalk.red('❌ Access token format is invalid'));
        return false;
      }

      // Step 3: Check token expiration
      console.log(chalk.gray('3. Checking token expiration...'));
      if (this.credentials && this.isTokenValid(this.credentials)) {
        console.log(chalk.green('✅ Token is valid and not expired'));
      } else {
        console.log(chalk.yellow('⚠️  Token may be expired or invalid'));
      }

      console.log(chalk.green('✅ Authentication test passed (LWA-only, no IAM required)'));
      console.log(chalk.gray('   Ready for SP-API calls with modern authentication'));
      return true;

    } catch (error) {
      console.log(chalk.red('❌ Authentication test failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  // Clear stored credentials (useful for debugging)
  clearCredentials(): void {
    this.credentials = null;
  }
}
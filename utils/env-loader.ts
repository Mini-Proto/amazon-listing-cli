import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { AmazonConfig, PartialAppConfig } from '../config/default-config.js';

export interface EnvConfig {
  amazon?: Partial<AmazonConfig>;
  defaults?: {
    dryRun?: boolean;
    verbose?: boolean;
    retryAttempts?: number;
    requestTimeout?: number;
  };
  debug?: {
    logLevel?: string;
    debugMode?: boolean;
  };
}

export class EnvLoader {
  private static loaded = false;

  static loadEnvironment(envPath?: string): EnvConfig {
    if (!this.loaded) {
      // Try to load .env file from project root
      const defaultEnvPath = resolve(process.cwd(), '.env');
      const targetEnvPath = envPath || defaultEnvPath;

      if (existsSync(targetEnvPath)) {
        const result = dotenvConfig({ path: targetEnvPath });
        if (result.error) {
          console.warn(chalk.yellow(`Warning: Could not load .env file: ${result.error.message}`));
        } else {
          console.log(chalk.gray(`Loaded environment from: ${targetEnvPath}`));
        }
      }

      this.loaded = true;
    }

    return this.parseEnvironmentVariables();
  }

  private static parseEnvironmentVariables(): EnvConfig {
    const env = process.env;
    const config: EnvConfig = {};

    // Parse Amazon SP-API configuration
    const amazon: Partial<AmazonConfig> = {};
    
    if (env.AMAZON_CLIENT_ID) amazon.clientId = env.AMAZON_CLIENT_ID;
    if (env.AMAZON_CLIENT_SECRET) amazon.clientSecret = env.AMAZON_CLIENT_SECRET;
    if (env.AMAZON_REFRESH_TOKEN) amazon.refreshToken = env.AMAZON_REFRESH_TOKEN;
    if (env.AMAZON_REGION) {
      const region = env.AMAZON_REGION as AmazonConfig['region'];
      if (['us-east-1', 'eu-west-1', 'us-west-2'].includes(region)) {
        amazon.region = region;
      } else {
        console.warn(chalk.yellow(`Warning: Invalid AMAZON_REGION '${region}'. Using default.`));
      }
    }
    if (env.AMAZON_MARKETPLACE_ID) amazon.marketplaceId = env.AMAZON_MARKETPLACE_ID;
    if (env.AMAZON_SELLER_ID) amazon.sellerId = env.AMAZON_SELLER_ID;
    if (env.AMAZON_SANDBOX) {
      amazon.sandbox = env.AMAZON_SANDBOX.toLowerCase() === 'true';
    }

    if (Object.keys(amazon).length > 0) {
      config.amazon = amazon;
    }

    // Parse default settings
    const defaults: NonNullable<EnvConfig['defaults']> = {};
    
    if (env.DEFAULT_DRY_RUN) {
      defaults.dryRun = env.DEFAULT_DRY_RUN.toLowerCase() === 'true';
    }
    if (env.DEFAULT_VERBOSE) {
      defaults.verbose = env.DEFAULT_VERBOSE.toLowerCase() === 'true';
    }
    if (env.REQUEST_TIMEOUT) {
      const timeout = parseInt(env.REQUEST_TIMEOUT, 10);
      if (!isNaN(timeout) && timeout > 0) {
        defaults.requestTimeout = timeout;
      }
    }
    if (env.RETRY_ATTEMPTS) {
      const retries = parseInt(env.RETRY_ATTEMPTS, 10);
      if (!isNaN(retries) && retries >= 0) {
        defaults.retryAttempts = retries;
      }
    }

    if (Object.keys(defaults).length > 0) {
      config.defaults = defaults;
    }

    // Parse debug settings
    const debug: NonNullable<EnvConfig['debug']> = {};
    
    if (env.LOG_LEVEL) {
      debug.logLevel = env.LOG_LEVEL;
    }
    if (env.DEBUG_MODE) {
      debug.debugMode = env.DEBUG_MODE.toLowerCase() === 'true';
    }

    if (Object.keys(debug).length > 0) {
      config.debug = debug;
    }

    return config;
  }

  // Convert environment config to PartialAppConfig format
  static toAppConfig(envConfig: EnvConfig): PartialAppConfig {
    const appConfig: PartialAppConfig = {};

    if (envConfig.amazon && Object.keys(envConfig.amazon).length > 0) {
      appConfig.amazon = envConfig.amazon;
    }

    if (envConfig.defaults && Object.keys(envConfig.defaults).length > 0) {
      appConfig.defaults = envConfig.defaults;
    }

    return appConfig;
  }

  // Validate environment configuration
  static validateEnvConfig(envConfig: EnvConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for complete Amazon configuration
    if (envConfig.amazon) {
      const amazon = envConfig.amazon;
      const requiredFields = ['clientId', 'clientSecret', 'refreshToken', 'region', 'marketplaceId', 'sellerId'];
      
      requiredFields.forEach(field => {
        if (!amazon[field as keyof typeof amazon]) {
          warnings.push(`Missing AMAZON_${field.toUpperCase().replace(/([A-Z])/g, '_$1')} in environment`);
        }
      });

      // Validate region
      if (amazon.region && !['us-east-1', 'eu-west-1', 'us-west-2'].includes(amazon.region)) {
        errors.push(`Invalid AMAZON_REGION: ${amazon.region}. Must be us-east-1, eu-west-1, or us-west-2`);
      }
    }

    // Validate numeric values
    if (envConfig.defaults) {
      const defaults = envConfig.defaults;
      
      if (defaults.requestTimeout !== undefined && (defaults.requestTimeout <= 0 || defaults.requestTimeout > 300000)) {
        errors.push('REQUEST_TIMEOUT must be between 1 and 300000 milliseconds');
      }

      if (defaults.retryAttempts !== undefined && (defaults.retryAttempts < 0 || defaults.retryAttempts > 10)) {
        errors.push('RETRY_ATTEMPTS must be between 0 and 10');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Display environment configuration status
  static displayEnvStatus(envConfig: EnvConfig, verbose: boolean = false): void {
    console.log(chalk.blue('Environment Configuration:'));
    console.log(chalk.gray('---------------------------'));

    if (envConfig.amazon && Object.keys(envConfig.amazon).length > 0) {
      console.log(chalk.cyan('Amazon SP-API:'));
      const amazon = envConfig.amazon;
      
      console.log(`  Client ID: ${amazon.clientId ? chalk.green('✓ Set') : chalk.red('✗ Missing')}`);
      console.log(`  Client Secret: ${amazon.clientSecret ? chalk.green('✓ Set') : chalk.red('✗ Missing')}`);
      console.log(`  Refresh Token: ${amazon.refreshToken ? chalk.green('✓ Set') : chalk.red('✗ Missing')}`);
      console.log(`  Region: ${amazon.region ? chalk.green(amazon.region) : chalk.red('✗ Missing')}`);
      console.log(`  Marketplace ID: ${amazon.marketplaceId ? chalk.green(amazon.marketplaceId) : chalk.red('✗ Missing')}`);
      console.log(`  Seller ID: ${amazon.sellerId ? chalk.green('✓ Set') : chalk.red('✗ Missing')}`);

      if (verbose && amazon.sellerId) {
        console.log(chalk.gray(`    Seller ID: ${amazon.sellerId}`));
      }
    } else {
      console.log(chalk.yellow('Amazon SP-API: No environment variables found'));
    }

    if (envConfig.defaults && Object.keys(envConfig.defaults).length > 0) {
      console.log(chalk.cyan('\nDefault Settings:'));
      const defaults = envConfig.defaults;
      
      if (defaults.dryRun !== undefined) {
        console.log(`  Dry Run: ${defaults.dryRun ? chalk.yellow('true') : chalk.green('false')}`);
      }
      if (defaults.verbose !== undefined) {
        console.log(`  Verbose: ${defaults.verbose ? chalk.blue('true') : chalk.gray('false')}`);
      }
      if (defaults.requestTimeout !== undefined) {
        console.log(`  Request Timeout: ${chalk.blue(defaults.requestTimeout + 'ms')}`);
      }
      if (defaults.retryAttempts !== undefined) {
        console.log(`  Retry Attempts: ${chalk.blue(defaults.retryAttempts.toString())}`);
      }
    }

    if (envConfig.debug && Object.keys(envConfig.debug).length > 0) {
      console.log(chalk.cyan('\nDebug Settings:'));
      const debug = envConfig.debug;
      
      if (debug.logLevel) {
        console.log(`  Log Level: ${chalk.blue(debug.logLevel)}`);
      }
      if (debug.debugMode !== undefined) {
        console.log(`  Debug Mode: ${debug.debugMode ? chalk.yellow('enabled') : chalk.gray('disabled')}`);
      }
    }
  }

  // Check if .env file exists and provide setup guidance
  static checkEnvFileStatus(): void {
    const envPath = resolve(process.cwd(), '.env');
    const examplePath = resolve(process.cwd(), '.env.example');

    if (!existsSync(envPath)) {
      console.log(chalk.yellow('\n⚠️  No .env file found'));
      
      if (existsSync(examplePath)) {
        console.log(chalk.gray('To set up environment variables:'));
        console.log(chalk.gray('1. Copy .env.example to .env'));
        console.log(chalk.gray('2. Fill in your Amazon SP-API credentials'));
        console.log(chalk.gray('3. Run the command again'));
        console.log(chalk.blue('\ncp .env.example .env'));
      } else {
        console.log(chalk.gray('Create a .env file with your Amazon SP-API credentials'));
      }
    } else {
      console.log(chalk.green('✓ .env file found'));
    }
  }
}
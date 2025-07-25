import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { AmazonConfig, AppConfig, PartialAppConfig, DEFAULT_CONFIG } from '../config/default-config.js';
import { EnvLoader } from './env-loader.js';

export class ConfigManager {
  private configDir: string;
  private configPath: string;

  constructor() {
    this.configDir = join(homedir(), '.amazon-harness');
    this.configPath = join(this.configDir, 'config.json');
  }

  async ensureConfigDir(): Promise<void> {
    if (!existsSync(this.configDir)) {
      await fs.mkdir(this.configDir, { mode: 0o700 });
    }
  }

  async load(): Promise<AppConfig> {
    try {
      await this.ensureConfigDir();
      
      // Load environment variables first
      const envConfig = EnvLoader.loadEnvironment();
      const envAppConfig = EnvLoader.toAppConfig(envConfig);
      
      let fileConfig: PartialAppConfig = {};
      
      // Load configuration file if it exists
      if (existsSync(this.configPath)) {
        const configData = await fs.readFile(this.configPath, 'utf-8');
        fileConfig = JSON.parse(configData) as PartialAppConfig;
      } else if (Object.keys(envAppConfig).length === 0) {
        // No config file and no environment variables
        throw new Error('Configuration not found. Run `amazon-harness configure` first or create a .env file.');
      }
      
      // Merge configurations: defaults < env < file (file takes precedence)
      const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...envAppConfig,
        ...fileConfig,
        amazon: {
          ...envAppConfig.amazon,
          ...fileConfig.amazon,
        },
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          ...envAppConfig.defaults,
          ...fileConfig.defaults,
        },
      };
      
      return mergedConfig as AppConfig;
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('Configuration not found')) {
        throw error;
      }
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async save(config: PartialAppConfig): Promise<void> {
    try {
      await this.ensureConfigDir();
      
      let existingConfig: PartialAppConfig = {};
      
      // Load existing config if it exists
      if (existsSync(this.configPath)) {
        const existingData = await fs.readFile(this.configPath, 'utf-8');
        existingConfig = JSON.parse(existingData);
      }
      
      // Merge configs
      const mergedConfig = {
        ...existingConfig,
        ...config,
        amazon: {
          ...existingConfig.amazon,
          ...config.amazon,
        },
        defaults: {
          ...existingConfig.defaults,
          ...config.defaults,
        },
      };
      
      // Write config with restricted permissions
      await fs.writeFile(
        this.configPath,
        JSON.stringify(mergedConfig, null, 2),
        { mode: 0o600 }
      );
      
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async validateConfig(config: AppConfig): Promise<string[]> {
    const errors: string[] = [];
    
    if (!config.amazon) {
      errors.push('Amazon configuration is missing');
      return errors;
    }

    const { amazon } = config;
    
    if (!amazon.clientId) {
      errors.push('Amazon Client ID is required');
    }
    
    if (!amazon.clientSecret) {
      errors.push('Amazon Client Secret is required');
    }
    
    if (!amazon.refreshToken) {
      errors.push('Amazon Refresh Token is required');
    }
    
    if (!amazon.region) {
      errors.push('AWS Region is required');
    } else if (!['us-east-1', 'eu-west-1', 'us-west-2'].includes(amazon.region)) {
      errors.push('Invalid AWS Region. Must be: us-east-1, eu-west-1, or us-west-2');
    }
    
    if (!amazon.marketplaceId) {
      errors.push('Amazon Marketplace ID is required');
    }
    
    if (!amazon.sellerId) {
      errors.push('Amazon Seller ID is required');
    }
    
    return errors;
  }

  async showConfig(): Promise<void> {
    try {
      const config = await this.load();
      
      console.log(chalk.blue('Current Configuration:'));
      console.log(chalk.gray('------------------------'));
      
      if (config.amazon) {
        console.log(`${chalk.cyan('Region:')} ${config.amazon.region}`);
        console.log(`${chalk.cyan('Marketplace ID:')} ${config.amazon.marketplaceId}`);
        console.log(`${chalk.cyan('Seller ID:')} ${config.amazon.sellerId}`);
        console.log(`${chalk.cyan('Client ID:')} ${config.amazon.clientId ? '***configured***' : chalk.red('not set')}`);
        console.log(`${chalk.cyan('Client Secret:')} ${config.amazon.clientSecret ? '***configured***' : chalk.red('not set')}`);
        console.log(`${chalk.cyan('Refresh Token:')} ${config.amazon.refreshToken ? '***configured***' : chalk.red('not set')}`);
      }
      
      console.log(chalk.gray('------------------------'));
      console.log(`${chalk.cyan('Retry Attempts:')} ${config.defaults?.retryAttempts || 'default'}`);
      console.log(`${chalk.cyan('Request Timeout:')} ${config.defaults?.requestTimeout || 'default'}ms`);
      
      const errors = await this.validateConfig(config);
      if (errors.length > 0) {
        console.log(chalk.yellow('\n⚠️  Configuration Issues:'));
        errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
      } else {
        console.log(chalk.green('\n✅ Configuration is valid'));
      }
      
    } catch (error) {
      console.error(chalk.red('Error loading configuration:'), error instanceof Error ? error.message : String(error));
      console.log(chalk.gray('Use `amazon-harness configure` to set up your credentials'));
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }
}
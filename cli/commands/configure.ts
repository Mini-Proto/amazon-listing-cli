import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../utils/config.js';
import { AmazonConfig, PartialAppConfig } from '../../config/default-config.js';

interface ConfigureOptions {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  region?: string;
  marketplaceId?: string;
  sellerId?: string;
  show?: boolean;
}

const VALID_REGIONS = ['us-east-1', 'eu-west-1', 'us-west-2'] as const;
type ValidRegion = typeof VALID_REGIONS[number];

const configureCommand = new Command('configure');

configureCommand
  .description('Configure Amazon SP-API credentials and settings')
  .option('--client-id <id>', 'Amazon SP-API Client ID')
  .option('--client-secret <secret>', 'Amazon SP-API Client Secret')
  .option('--refresh-token <token>', 'Amazon SP-API Refresh Token')
  .option('--region <region>', `AWS region (${VALID_REGIONS.join(', ')})`)
  .option('--marketplace-id <id>', 'Amazon Marketplace ID')
  .option('--seller-id <id>', 'Amazon Seller ID')
  .option('--show', 'Show current configuration (without sensitive values)')
  .action(async (options: ConfigureOptions) => {
    try {
      const configManager = new ConfigManager();
      
      if (options.show) {
        await configManager.showConfig();
        return;
      }
      
      // Validate region if provided
      if (options.region && !VALID_REGIONS.includes(options.region as ValidRegion)) {
        console.error(chalk.red(`Error: Invalid region '${options.region}'. Valid regions: ${VALID_REGIONS.join(', ')}`));
        process.exit(1);
      }
      
      // Count provided options
      const providedOptions = Object.entries(options).filter(([key, value]) => key !== 'show' && value !== undefined);
      
      if (providedOptions.length === 0) {
        console.log(chalk.yellow('No configuration options provided.'));
        console.log(chalk.gray('Use --help to see available options, or --show to view current config'));
        return;
      }
      
      console.log(chalk.blue('Configuring Amazon SP-API credentials...'));
      console.log(chalk.gray(`Updating ${providedOptions.length} configuration setting(s)...`));
      
      // Build partial Amazon config from provided options
      const amazonConfig: Partial<AmazonConfig> = {};
      
      if (options.clientId) amazonConfig.clientId = options.clientId;
      if (options.clientSecret) amazonConfig.clientSecret = options.clientSecret;
      if (options.refreshToken) amazonConfig.refreshToken = options.refreshToken;
      if (options.region) amazonConfig.region = options.region as ValidRegion;
      if (options.marketplaceId) amazonConfig.marketplaceId = options.marketplaceId;
      if (options.sellerId) amazonConfig.sellerId = options.sellerId;
      
      // Save configuration
      const configUpdate: PartialAppConfig = { amazon: amazonConfig };
      await configManager.save(configUpdate);
      
      console.log(chalk.green('✅ Configuration saved successfully'));
      console.log(chalk.gray(`Config location: ${configManager.getConfigPath()}`));
      
      // Validate the updated configuration
      try {
        const fullConfig = await configManager.load();
        const errors = await configManager.validateConfig(fullConfig);
        
        if (errors.length > 0) {
          console.log(chalk.yellow('\n⚠️  Configuration incomplete:'));
          errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
          console.log(chalk.gray('\nRun `amazon-harness configure --help` to see all required options'));
        } else {
          console.log(chalk.green('\n✅ Configuration is complete and valid'));
        }
      } catch (error) {
        console.log(chalk.yellow('\n⚠️  Could not validate configuration'));
      }
      
    } catch (error) {
      console.error(chalk.red('Error configuring credentials:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export default configureCommand;
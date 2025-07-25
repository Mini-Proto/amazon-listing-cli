import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../utils/config.js';
import { SPAPIClient } from '../../api/client.js';

interface TestOptions {
  verbose?: boolean;
  config?: boolean;
  auth?: boolean;
  api?: boolean;
}

const testCommand = new Command('test');

testCommand
  .description('Test various components of the Amazon CLI')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--config', 'Test configuration loading and validation')
  .option('--auth', 'Test SP-API authentication')
  .option('--api', 'Test SP-API connection')
  .action(async (options: TestOptions) => {
    try {
      console.log(chalk.blue('🧪 Running Amazon Harness CLI Tests\n'));

      let allPassed = true;

      // Test configuration if requested or by default
      if (options.config || (!options.auth && !options.api)) {
        console.log(chalk.cyan('📋 Testing Configuration...'));
        const configPassed = await testConfiguration(options.verbose || false);
        allPassed = allPassed && configPassed;
        console.log('');
      }

      // Test authentication if requested
      if (options.auth || options.api) {
        console.log(chalk.cyan('🔐 Testing Authentication...'));
        const authPassed = await testAuthentication(options.verbose || false);
        allPassed = allPassed && authPassed;
        console.log('');
      }

      // Test API connection if requested
      if (options.api) {
        console.log(chalk.cyan('🌐 Testing API Connection...'));
        const apiPassed = await testAPIConnection(options.verbose || false);
        allPassed = allPassed && apiPassed;
        console.log('');
      }

      // Summary
      if (allPassed) {
        console.log(chalk.green('✅ All tests passed!'));
      } else {
        console.log(chalk.red('❌ Some tests failed. Check output above for details.'));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('Error running tests:'), error instanceof Error ? error.message : String(error));
      if (options.verbose && error instanceof Error) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

async function testConfiguration(verbose: boolean): Promise<boolean> {
  try {
    const configManager = new ConfigManager();
    
    // Test loading configuration
    console.log(chalk.gray('  • Loading configuration...'));
    const config = await configManager.load();
    console.log(chalk.green('    ✓ Configuration loaded'));

    // Test validation
    console.log(chalk.gray('  • Validating configuration...'));
    const errors = await configManager.validateConfig(config);
    
    if (errors.length === 0) {
      console.log(chalk.green('    ✓ Configuration is valid'));
      return true;
    } else {
      console.log(chalk.red('    ✗ Configuration has errors:'));
      errors.forEach(error => console.log(chalk.red(`      • ${error}`)));
      return false;
    }

  } catch (error) {
    console.log(chalk.red('    ✗ Configuration test failed'));
    if (verbose) {
      console.error(chalk.gray(`      Error: ${error instanceof Error ? error.message : String(error)}`));
    }
    return false;
  }
}

async function testAuthentication(verbose: boolean): Promise<boolean> {
  try {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    
    // Validate config first
    const errors = await configManager.validateConfig(config);
    if (errors.length > 0) {
      console.log(chalk.red('    ✗ Cannot test authentication: configuration errors'));
      return false;
    }

    // Test authentication
    const client = new SPAPIClient(config.amazon);
    return await client.testConnection();

  } catch (error) {
    console.log(chalk.red('    ✗ Authentication test failed'));
    if (verbose) {
      console.error(chalk.gray(`      Error: ${error instanceof Error ? error.message : String(error)}`));
    }
    return false;
  }
}

async function testAPIConnection(verbose: boolean): Promise<boolean> {
  try {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    
    // Validate config first
    const errors = await configManager.validateConfig(config);
    if (errors.length > 0) {
      console.log(chalk.red('    ✗ Cannot test API: configuration errors'));
      return false;
    }

    // Test API connection
    console.log(chalk.gray('  • Creating SP-API client...'));
    const client = new SPAPIClient(config.amazon);
    
    console.log(chalk.gray('  • Testing connection...'));
    const connected = await client.testConnection();
    
    if (connected) {
      const stats = client.getStats();
      console.log(chalk.green(`    ✓ API connection successful (${stats.requestCount} requests made)`));
      return true;
    } else {
      console.log(chalk.red('    ✗ API connection failed'));
      return false;
    }

  } catch (error) {
    console.log(chalk.red('    ✗ API connection test failed'));
    if (verbose) {
      console.error(chalk.gray(`      Error: ${error instanceof Error ? error.message : String(error)}`));
    }
    return false;
  }
}

export default testCommand;
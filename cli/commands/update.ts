import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { ConfigManager } from '../../utils/config.js';
import { YAMLParser } from '../../utils/yaml-parser.js';
import { SPAPIClient } from '../../api/client.js';
import { ListingsItemsAPI } from '../../api/listings-items.js';
import { AmazonImageUploadService } from '../../api/image-upload.js';
import { DiffDetector } from '../../utils/diff-detector.js';

interface UpdateOptions {
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;
  skipImages?: boolean;
}

const updateCommand = new Command('update');

updateCommand
  .description('Update an existing Amazon product listing from YAML configuration')
  .argument('<config-file>', 'Path to YAML configuration file')
  .option('-d, --dry-run', 'Show what would be updated without making changes')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-f, --force', 'Force update even if conflicts detected')
  .option('--skip-images', 'Skip image upload and only update text content')
  .action(async (configFile: string, options: UpdateOptions) => {
    try {
      console.log(chalk.blue('🔄 Amazon Listing Update Tool\n'));

      // Validate config file exists
      const configPath = resolve(configFile);
      if (!existsSync(configPath)) {
        console.error(chalk.red(`Error: Configuration file not found: ${configPath}`));
        process.exit(1);
      }

      // Load configuration
      const configManager = new ConfigManager();
      const appConfig = await configManager.load();
      const yamlParser = new YAMLParser();
      const harnessConfig = await yamlParser.parseFile(configPath);

      // Initialize API clients
      const client = new SPAPIClient(appConfig.amazon);
      const listingsAPI = new ListingsItemsAPI(client);
      const imageAPI = new AmazonImageUploadService(client);

      const sku = harnessConfig.product.sku;
      const marketplaceIds = [appConfig.amazon.marketplaceId];

      console.log(chalk.yellow(`📦 Updating product: ${sku}`));

      // Get existing listing
      console.log(chalk.gray('🔍 Fetching existing listing...'));
      const existingListing = await listingsAPI.getListing(sku, marketplaceIds);
      
      if (!existingListing) {
        console.log(chalk.red(`❌ Listing not found for SKU: ${sku}`));
        console.log(chalk.gray('💡 Use the "create" command to create a new listing'));
        process.exit(1);
      }

      console.log(chalk.green('✅ Found existing listing'));

      // Detect changes
      const diffDetector = new DiffDetector();
      const changes = await diffDetector.detectChanges(existingListing, harnessConfig);

      if (changes.length === 0) {
        console.log(chalk.yellow('⏭️  No changes detected - listing is already up to date'));
        return;
      }

      // Show changes
      console.log(chalk.blue('\n📋 Changes to be made:'));
      changes.forEach((change, index) => {
        const changeIcon = change.changeType === 'added' ? '➕' : change.changeType === 'removed' ? '➖' : '🔄';
        console.log(chalk.gray(`${index + 1}. ${changeIcon} ${change.field}: ${change.oldValue} → ${change.newValue}`));
      });

      // Dry run mode
      if (options.dryRun) {
        console.log(chalk.yellow('\n🔍 Dry run mode - no changes will be made'));
        console.log(chalk.gray('Run without --dry-run to apply these changes'));
        return;
      }

      // Confirmation prompt
      if (!options.force) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(chalk.yellow('\n❓ Apply these changes? (y/N): '), (answer) => {
            rl.close();
            resolve(answer);
          });
        });

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log(chalk.gray('❌ Update cancelled'));
          return;
        }
      }

      // Process images if needed
      let uploadedImages: any[] = [];
      if (!options.skipImages && changes.some(c => c.field.includes('image'))) {
        console.log(chalk.yellow('\n📸 Processing images...'));
        try {
          // Process images first, then upload
          const { ImageProcessor } = await import('../../utils/image-processor.js');
          const processor = new ImageProcessor();
          const processingResult = await processor.processImages(harnessConfig.images);
          
          if (processingResult.success.length > 0) {
            const uploadResult = await imageAPI.uploadImages(processingResult.success, sku);
            uploadedImages = uploadResult.uploaded;
            console.log(chalk.green(`✅ Uploaded ${uploadedImages.length} images`));
          } else {
            console.log(chalk.red('❌ No images processed successfully'));
            if (processingResult.errors.length > 0) {
              processingResult.errors.forEach(error => {
                console.log(chalk.red(`   • ${error.path}: ${error.error}`));
              });
            }
            console.log(chalk.gray('💡 Use --skip-images to update without images'));
            return;
          }
        } catch (error) {
          console.log(chalk.red('❌ Image processing/upload failed:'), error instanceof Error ? error.message : String(error));
          console.log(chalk.gray('💡 Use --skip-images to update without images'));
          return;
        }
      } else if (options.skipImages) {
        console.log(chalk.gray('⏭️  Skipping image upload'));
      }

      // Update listing
      console.log(chalk.yellow('\n🔄 Updating listing...'));
      const result = await listingsAPI.updateListing(
        sku,
        harnessConfig,
        uploadedImages,
        marketplaceIds
      );

      if (result.status === 'ACCEPTED') {
        console.log(chalk.green('✅ Listing update submitted successfully!'));
        console.log(chalk.gray(`📋 Submission ID: ${result.submissionId}`));
        
        // Wait for processing if submission ID is available
        if (result.submissionId) {
          console.log(chalk.yellow('⏳ Waiting for Amazon to process update...'));
          try {
            const finalStatus = await listingsAPI.waitForSubmissionCompletion(result.submissionId, 120000); // 2 minutes
            
            if (finalStatus.status === 'DONE') {
              console.log(chalk.green('🎉 Update completed successfully!'));
            } else if (finalStatus.status === 'FATAL') {
              console.log(chalk.red('❌ Update failed during processing'));
              if (finalStatus.issues) {
                finalStatus.issues.forEach(issue => {
                  console.log(chalk.red(`   • ${issue.message}`));
                });
              }
            }
          } catch (error) {
            console.log(chalk.yellow('⏳ Update is still processing (check Seller Central in a few minutes)'));
          }
        }
      } else {
        console.log(chalk.red('❌ Update failed'));
        if (result.issues) {
          result.issues.forEach(issue => {
            console.log(chalk.red(`   • ${issue.message}`));
          });
        }
      }

    } catch (error) {
      console.error(chalk.red('❌ Failed to update listing:'), error instanceof Error ? error.message : String(error));
      if (options.verbose && error instanceof Error) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

export default updateCommand;
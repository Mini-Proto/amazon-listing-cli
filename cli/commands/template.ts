#!/usr/bin/env tsx

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readdirSync, statSync } from 'fs';
import { promises as fs } from 'fs';
import { resolve, join, dirname, basename } from 'path';
import { YAMLParser } from '../../utils/yaml-parser.js';
import { validateHarnessConfig } from '../../utils/validator.js';

interface TemplateOptions {
  verbose?: boolean;
  force?: boolean;
  output?: string;
}

interface TemplateVariables {
  [key: string]: string | number;
}

const templateCommand = new Command('template')
  .description('Manage configuration templates')
  .addCommand(createTemplateListCommand())
  .addCommand(createTemplateCreateCommand())
  .addCommand(createTemplateUseCommand())
  .addCommand(createTemplateValidateCommand());

function createTemplateListCommand(): Command {
  return new Command('list')
    .description('List available configuration templates')
    .option('-v, --verbose', 'Show template details')
    .action(async (options: TemplateOptions) => {
      try {
        console.log(chalk.blue('📋 Available Configuration Templates\n'));

        const templatesDir = getTemplatesDirectory();
        await ensureTemplatesDirectory(templatesDir);

        // Get all template files
        const templateFiles = getTemplateFiles(templatesDir);

        if (templateFiles.length === 0) {
          console.log(chalk.yellow('No templates found.'));
          console.log(chalk.gray('Create templates with: amazon-harness template create <file>'));
          return;
        }

        console.log(chalk.green(`Found ${templateFiles.length} template(s):\n`));

        for (const file of templateFiles) {
          const templateName = basename(file, '.template.yaml');
          const templatePath = join(templatesDir, file);
          const stats = statSync(templatePath);

          console.log(chalk.bold(`📄 ${templateName}`));
          console.log(chalk.gray(`   File: ${file}`));
          console.log(chalk.gray(`   Modified: ${stats.mtime.toLocaleDateString()}`));

          if (options.verbose) {
            try {
              const content = await fs.readFile(templatePath, 'utf-8');
              const variables = extractTemplateVariables(content);
              if (variables.length > 0) {
                console.log(chalk.gray(`   Variables: ${variables.join(', ')}`));
              }
              
              // Show first few lines of description if available
              const lines = content.split('\n');
              const descLine = lines.find(line => line.includes('description:'));
              if (descLine) {
                const desc = descLine.split(':')[1]?.trim().replace(/['"]/g, '');
                if (desc) {
                  console.log(chalk.gray(`   Description: ${desc.substring(0, 60)}...`));
                }
              }
            } catch (error) {
              console.log(chalk.red(`   Error reading template: ${error instanceof Error ? error.message : String(error)}`));
            }
          }
          console.log('');
        }

      } catch (error) {
        console.error(chalk.red('❌ Failed to list templates:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

function createTemplateCreateCommand(): Command {
  return new Command('create')
    .description('Create a new template from existing configuration')
    .argument('<config-file>', 'Source YAML configuration file')
    .argument('[template-name]', 'Template name (defaults to config filename)')
    .option('-f, --force', 'Overwrite existing template')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (configFile: string, templateName: string | undefined, options: TemplateOptions) => {
      try {
        console.log(chalk.blue('📝 Creating Configuration Template\n'));

        // Validate source file exists
        const configPath = resolve(configFile);
        if (!existsSync(configPath)) {
          console.error(chalk.red(`❌ Configuration file not found: ${configPath}`));
          process.exit(1);
        }

        // Determine template name
        const finalTemplateName = templateName || basename(configFile, '.yaml');
        const templatesDir = getTemplatesDirectory();
        await ensureTemplatesDirectory(templatesDir);
        
        const templatePath = join(templatesDir, `${finalTemplateName}.template.yaml`);

        // Check if template exists
        if (existsSync(templatePath) && !options.force) {
          console.error(chalk.red(`❌ Template already exists: ${finalTemplateName}`));
          console.log(chalk.gray('Use --force to overwrite'));
          process.exit(1);
        }

        // Validate source configuration
        console.log(chalk.yellow('🔍 Validating source configuration...'));
        const yamlParser = new YAMLParser();
        const config = await yamlParser.parseFile(configPath);
        const validation = await validateHarnessConfig(config);

        if (!validation.isValid) {
          console.log(chalk.red('❌ Source configuration has errors:'));
          validation.errors.forEach(error => {
            console.log(chalk.red(`  • ${error.field}: ${error.message}`));
          });
          process.exit(1);
        }

        // Convert to template
        console.log(chalk.yellow('🔄 Converting to template...'));
        const templateContent = convertConfigToTemplate(config, finalTemplateName);

        // Write template file
        await fs.writeFile(templatePath, templateContent, 'utf-8');

        console.log(chalk.green(`✅ Template created: ${finalTemplateName}`));
        console.log(chalk.gray(`   Location: ${templatePath}`));

        // Show template variables
        const variables = extractTemplateVariables(templateContent);
        if (variables.length > 0) {
          console.log(chalk.blue('\n📋 Template Variables:'));
          variables.forEach(variable => {
            console.log(chalk.gray(`  • {{${variable}}}`));
          });
          console.log(chalk.gray('\nUse these variables when applying the template.'));
        }

      } catch (error) {
        console.error(chalk.red('❌ Failed to create template:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

function createTemplateUseCommand(): Command {
  return new Command('use')
    .description('Generate configuration from template')
    .argument('<template-name>', 'Template name to use')
    .option('-o, --output <file>', 'Output configuration file')
    .option('-v, --verbose', 'Show detailed output')
    .option('--var <key=value>', 'Set template variable (can be used multiple times)', [])
    .action(async (templateName: string, options: TemplateOptions & { var: string[] }) => {
      try {
        console.log(chalk.blue('🔧 Generating Configuration from Template\n'));

        const templatesDir = getTemplatesDirectory();
        const templatePath = join(templatesDir, `${templateName}.template.yaml`);

        // Check if template exists
        if (!existsSync(templatePath)) {
          console.error(chalk.red(`❌ Template not found: ${templateName}`));
          console.log(chalk.gray('Available templates:'));
          const available = getTemplateFiles(templatesDir);
          available.forEach(file => {
            const name = basename(file, '.template.yaml');
            console.log(chalk.gray(`  • ${name}`));
          });
          process.exit(1);
        }

        // Read template
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const variables = extractTemplateVariables(templateContent);

        // Parse variables from command line
        const providedVars: TemplateVariables = {};
        for (const varString of options.var) {
          const [key, value] = varString.split('=', 2);
          if (!key || value === undefined) {
            console.error(chalk.red(`❌ Invalid variable format: ${varString}`));
            console.log(chalk.gray('Use format: --var key=value'));
            process.exit(1);
          }
          providedVars[key] = value;
        }

        // Check for missing variables
        const missingVars = variables.filter(v => !(v in providedVars));
        if (missingVars.length > 0) {
          console.log(chalk.red(`❌ Missing required variables:`));
          missingVars.forEach(variable => {
            console.log(chalk.red(`  • {{${variable}}}`));
          });
          console.log(chalk.gray('\nProvide variables with: --var key=value'));
          console.log(chalk.gray('Example: amazon-harness template use ' + templateName + ' --var sku=MP-JST-123 --var price=15.99'));
          process.exit(1);
        }

        // Apply template variables
        console.log(chalk.yellow('🔄 Applying template variables...'));
        let finalContent = templateContent;
        for (const [key, value] of Object.entries(providedVars)) {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          finalContent = finalContent.replace(regex, String(value));
        }

        // Validate generated configuration
        console.log(chalk.yellow('🔍 Validating generated configuration...'));
        const yamlParser = new YAMLParser();
        const config = await yamlParser.parseString(finalContent);
        const validation = await validateHarnessConfig(config);

        if (!validation.isValid) {
          console.log(chalk.red('❌ Generated configuration has errors:'));
          validation.errors.forEach(error => {
            console.log(chalk.red(`  • ${error.field}: ${error.message}`));
          });
          process.exit(1);
        }

        // Show warnings if any
        if (validation.warnings && validation.warnings.length > 0) {
          console.log(chalk.yellow('⚠️  Generated configuration has warnings:'));
          validation.warnings.forEach(warning => {
            console.log(chalk.yellow(`  • ${warning}`));
          });
        }

        // Write output file
        const outputPath = options.output || `${templateName}-${Date.now()}.yaml`;
        await fs.writeFile(outputPath, finalContent, 'utf-8');

        console.log(chalk.green(`✅ Configuration generated: ${outputPath}`));
        console.log(chalk.gray(`   Template: ${templateName}`));
        console.log(chalk.gray(`   Variables applied: ${Object.keys(providedVars).length}`));

        if (options.verbose) {
          console.log(chalk.blue('\n📋 Applied Variables:'));
          Object.entries(providedVars).forEach(([key, value]) => {
            console.log(chalk.gray(`  • ${key}: ${value}`));
          });
        }

      } catch (error) {
        console.error(chalk.red('❌ Failed to generate from template:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

function createTemplateValidateCommand(): Command {
  return new Command('validate')
    .description('Validate all templates')
    .option('-v, --verbose', 'Show detailed validation results')
    .action(async (options: TemplateOptions) => {
      try {
        console.log(chalk.blue('🔍 Validating All Templates\n'));

        const templatesDir = getTemplatesDirectory();
        const templateFiles = getTemplateFiles(templatesDir);

        if (templateFiles.length === 0) {
          console.log(chalk.yellow('No templates found to validate.'));
          return;
        }

        console.log(chalk.yellow(`📄 Validating ${templateFiles.length} template(s)...`));

        let validCount = 0;
        let invalidCount = 0;

        for (const file of templateFiles) {
          const templateName = basename(file, '.template.yaml');
          const templatePath = join(templatesDir, file);

          try {
            const content = await fs.readFile(templatePath, 'utf-8');
            
            // Check if it's valid YAML
            const yamlParser = new YAMLParser();
            await yamlParser.parseString(content);
            
            console.log(chalk.green(`✅ ${templateName} - Valid template syntax`));
            validCount++;

            if (options.verbose) {
              const variables = extractTemplateVariables(content);
              if (variables.length > 0) {
                console.log(chalk.gray(`   Variables: ${variables.join(', ')}`));
              }
            }

          } catch (error) {
            console.log(chalk.red(`❌ ${templateName} - Invalid template`));
            if (options.verbose) {
              console.log(chalk.red(`   Error: ${error instanceof Error ? error.message : String(error)}`));
            }
            invalidCount++;
          }
        }

        console.log(chalk.blue('\n📊 Template Validation Summary:'));
        console.log(chalk.green(`  ✅ Valid: ${validCount}`));
        console.log(chalk.red(`  ❌ Invalid: ${invalidCount}`));

        if (invalidCount > 0) {
          process.exit(1);
        }

      } catch (error) {
        console.error(chalk.red('❌ Template validation failed:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

// Utility functions
function getTemplatesDirectory(): string {
  return join(process.env.HOME || process.cwd(), '.amazon-harness', 'templates');
}

async function ensureTemplatesDirectory(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

function getTemplateFiles(templatesDir: string): string[] {
  try {
    return readdirSync(templatesDir)
      .filter(file => file.endsWith('.template.yaml'))
      .sort();
  } catch (error) {
    return [];
  }
}

function extractTemplateVariables(content: string): string[] {
  const variableRegex = /{{\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*}}/g;
  const variables = new Set<string>();
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables).sort();
}

function convertConfigToTemplate(config: any, templateName: string): string {
  // Convert specific values to template variables
  let configStr = JSON.stringify(config, null, 2);
  
  // Convert to YAML-like format (simplified)
  configStr = configStr
    .replace(/"/g, '')
    .replace(/,$/gm, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '');

  // Apply common template patterns
  const templateContent = `# Template: ${templateName}
# Generated on: ${new Date().toISOString()}
# Description: Configuration template for wire harness products

product:
  title: "{{product_title}}"
  sku: "{{product_sku}}"
  description: |
    {{product_description}}

specifications:
  pin_count: {{pin_count}}
  wire_gauge: "{{wire_gauge}}"
  length: "{{length}}"
  connector_type: "{{connector_type}}"
  current_rating: "{{current_rating}}"
  voltage_rating: "{{voltage_rating}}"
  temperature_range: "{{temperature_range}}"

pricing:
  price: {{price}}
  compare_at_price: {{compare_at_price}}

images:
  - "{{image_1}}"
  - "{{image_2}}"
  - "{{image_3}}"

amazon:
  category: "{{category}}"
  search_keywords:
    - "{{keyword_1}}"
    - "{{keyword_2}}"
    - "{{keyword_3}}"
  bullet_points:
    - "{{bullet_1}}"
    - "{{bullet_2}}"
    - "{{bullet_3}}"
    - "{{bullet_4}}"
    - "{{bullet_5}}"

# Template Variables:
# product_title: Product title for Amazon listing
# product_sku: Unique SKU identifier
# product_description: Detailed product description
# pin_count: Number of pins (integer)
# wire_gauge: Wire gauge (e.g., "18 AWG")
# length: Cable length (e.g., "24 inches")
# connector_type: Type of connector
# current_rating: Current rating (e.g., "3A")
# voltage_rating: Voltage rating (e.g., "250V")
# temperature_range: Operating temperature range
# price: Product price (decimal)
# compare_at_price: Compare at price (decimal)
# image_1, image_2, image_3: Image file paths
# category: Amazon category
# keyword_1, keyword_2, keyword_3: Search keywords
# bullet_1 through bullet_5: Bullet point descriptions
`;

  return templateContent;
}

export default templateCommand;
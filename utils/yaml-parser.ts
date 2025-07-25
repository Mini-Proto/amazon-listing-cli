import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { load as yamlLoad } from 'js-yaml';
import { resolve } from 'path';
import chalk from 'chalk';
import { HarnessConfig, ValidationResult, ValidationError } from '../config/harness-schema.js';
import { validateHarnessConfig } from './validator.js';

export class YAMLParser {
  async parseFile(filePath: string): Promise<HarnessConfig> {
    const resolvedPath = resolve(filePath);
    
    // Check if file exists
    if (!existsSync(resolvedPath)) {
      throw new Error(`YAML file not found: ${resolvedPath}`);
    }

    try {
      // Read and parse YAML file
      const fileContent = await readFile(resolvedPath, 'utf-8');
      const parsedData = yamlLoad(fileContent) as any;

      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('YAML file must contain a valid object');
      }

      // Validate the parsed configuration
      const validationResult = await this.validateConfig(parsedData);
      
      if (!validationResult.isValid) {
        this.displayValidationErrors(validationResult.errors);
        throw new Error(`Configuration validation failed with ${validationResult.errors.length} error(s)`);
      }

      // Display warnings if any
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        this.displayValidationWarnings(validationResult.warnings);
      }

      return parsedData as HarnessConfig;

    } catch (error) {
      if (error instanceof Error && error.message.includes('YAMLException')) {
        throw new Error(`Invalid YAML syntax: ${error.message}`);
      }
      throw error;
    }
  }

  async parseString(yamlContent: string): Promise<HarnessConfig> {
    try {
      const parsedData = yamlLoad(yamlContent) as any;

      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('YAML content must contain a valid object');
      }

      // Validate the parsed configuration
      const validationResult = await this.validateConfig(parsedData);
      
      if (!validationResult.isValid) {
        this.displayValidationErrors(validationResult.errors);
        throw new Error(`Configuration validation failed with ${validationResult.errors.length} error(s)`);
      }

      // Display warnings if any
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        this.displayValidationWarnings(validationResult.warnings);
      }

      return parsedData as HarnessConfig;

    } catch (error) {
      if (error instanceof Error && error.message.includes('YAMLException')) {
        throw new Error(`Invalid YAML syntax: ${error.message}`);
      }
      throw error;
    }
  }

  async validateConfig(config: any): Promise<ValidationResult> {
    return validateHarnessConfig(config);
  }

  private displayValidationErrors(errors: ValidationError[]): void {
    console.log(chalk.red('\n❌ Configuration Validation Errors:\n'));
    
    errors.forEach((error, index) => {
      console.log(chalk.red(`${index + 1}. ${error.field}:`));
      console.log(chalk.red(`   ${error.message}`));
      if (error.value !== undefined) {
        console.log(chalk.gray(`   Current value: ${JSON.stringify(error.value)}`));
      }
      console.log('');
    });
  }

  private displayValidationWarnings(warnings: string[]): void {
    console.log(chalk.yellow('\n⚠️  Configuration Warnings:\n'));
    
    warnings.forEach((warning, index) => {
      console.log(chalk.yellow(`${index + 1}. ${warning}`));
    });
    console.log('');
  }

  // Generate a sample YAML configuration
  static generateSampleConfig(): string {
    return `# Wire Harness Configuration for Amazon Listing
# This is a sample configuration file - modify as needed

product:
  title: "MiniProto 8-Pin Wire Harness | 18 AWG | 24 inches"
  sku: "MH-8PIN-18AWG-24IN"
  description: |
    Professional 8-pin wire harness designed for industrial applications.
    
    Features:
    - High-quality 18 AWG copper wire
    - Durable insulation rated for industrial environments
    - Precision crimped terminals for reliable connections
    - Custom length available upon request
    
    Applications:
    - Industrial automation systems
    - Control panel wiring
    - Machine interconnects
    - Custom electronic projects
    
    Quality assured by MiniProto's rigorous testing standards.

specifications:
  pin_count: 8
  wire_gauge: "18 AWG"
  length: "24 inches"
  connector_type: "Crimp Terminal"
  current_rating: "10A"
  voltage_rating: "300V"
  temperature_range: "-40°C to +85°C"

pricing:
  price: 24.99
  compare_at_price: 34.99

images:
  - "./images/harness-main.jpg"
  - "./images/harness-connector-detail.jpg"
  - "./images/harness-dimensions.jpg"
  - "./images/harness-application.jpg"

amazon:
  category: "industrial-electrical"
  search_keywords:
    - "wire harness"
    - "8 pin connector"
    - "18 AWG wire"
    - "industrial cable"
    - "custom harness"
    - "electrical connector"
    - "control cable"
    - "automation wire"
  bullet_points:
    - "INDUSTRIAL GRADE: 18 AWG copper wire with high-quality insulation rated for harsh environments"
    - "RELIABLE CONNECTIONS: Precision crimped terminals ensure secure, long-lasting electrical connections"
    - "VERSATILE APPLICATION: Perfect for industrial automation, control panels, and custom electronic projects"
    - "QUALITY ASSURED: Manufactured to strict standards with comprehensive testing for reliability"
    - "CUSTOM SOLUTION: Professional wire harness solution designed for demanding applications"
`;
  }

  // Validate file path and extension
  static validateFilePath(filePath: string): { isValid: boolean; error?: string } {
    if (!filePath) {
      return { isValid: false, error: 'File path is required' };
    }

    if (!filePath.toLowerCase().endsWith('.yaml') && !filePath.toLowerCase().endsWith('.yml')) {
      return { isValid: false, error: 'File must have .yaml or .yml extension' };
    }

    const resolvedPath = resolve(filePath);
    if (!existsSync(resolvedPath)) {
      return { isValid: false, error: `File not found: ${resolvedPath}` };
    }

    return { isValid: true };
  }
}
import { extname } from 'path';
import chalk from 'chalk';

/**
 * Interface for CSV row data matching the Amazon Product Pricing structure
 */
export interface ProductData {
  sku: string;
  ipn: string;
  pinCount: number;
  packSize: number;
  family: string;
  connectorType1: string;
  connectorType2: string;
  length: string;
}

/**
 * Interface for pattern matching results
 */
export interface PatternMatch {
  pinCount?: number;
  connectorTypeFirst?: 'F' | 'M';
  connectorTypeSecond?: 'F' | 'M';
  length?: string;
  packSize?: number;
  family?: string;
  variant?: 'Main' | 'Secondary';
  isValid: boolean;
  confidence: number;
}

/**
 * Interface for renaming operation result
 */
export interface RenameOperation {
  originalPath: string;
  newPath: string;
  sku: string;
  variant: 'Main' | 'Secondary';
  confidence: number;
  isValid: boolean;
  reason?: string;
}

/**
 * Supported connector families with their patterns
 */
const CONNECTOR_FAMILIES = {
  MFJ: {
    patterns: ['MFJ', '(MFJ)', 'micro-fit', 'microfit'],
    prefix: 'MPA-MFJ'
  },
  UF3: {
    patterns: ['UF3', '(UF3)', 'ultra-fit', 'ultrafit'],
    prefix: 'MPA-UF3'
  },
  DDT: {
    patterns: ['DDT', '(DDT)', 'deutsch', 'dt04', 'dt06'],
    prefix: 'MPA-DDT'
  },
  DTM: {
    patterns: ['DTM', '(DTM)', 'dtm04', 'dtm06'],
    prefix: 'MPA-DTM'
  }
} as const;

/**
 * Length patterns with standardization
 */
const LENGTH_PATTERNS = [
  { pattern: /6\s*in|6\s*inch|6"|6'/i, standard: '6in' },
  { pattern: /12\s*in|12\s*inch|12"|12'|1\s*ft|1\s*foot/i, standard: '12in' },
  { pattern: /18\s*in|18\s*inch|18"|18'/i, standard: '18in' },
  { pattern: /24\s*in|24\s*inch|24"|24'|2\s*ft|2\s*foot/i, standard: '24in' },
  { pattern: /36\s*in|36\s*inch|36"|36'|3\s*ft|3\s*foot/i, standard: '36in' }
];

/**
 * Pin count extraction patterns
 */
const PIN_COUNT_PATTERNS = [
  { pattern: /(\d+)x(\d+)/, extractor: (match: RegExpMatchArray) => parseInt(match[1]) * parseInt(match[2]) },
  { pattern: /(\d+)\s*p(?:in|ins)?(?:\s|$)/i, extractor: (match: RegExpMatchArray) => parseInt(match[1]) },
  { pattern: /(\d+)\s*way/i, extractor: (match: RegExpMatchArray) => parseInt(match[1]) },
  { pattern: /(\d+)\s*pos(?:ition)?/i, extractor: (match: RegExpMatchArray) => parseInt(match[1]) }
];

/**
 * Connector type patterns for Male/Female identification
 */
const CONNECTOR_TYPE_PATTERNS = {
  female: ['female', 'receptacle', 'rec', 'socket', 'f'],
  male: ['male', 'plug', 'pin', 'header', 'm']
};

/**
 * ImageNamer class for generating standardized Amazon image filenames
 */
export class ImageNamer {
  private csvData: Map<string, ProductData> = new Map();

  /**
   * Load CSV data for SKU mapping
   */
  public loadCsvData(csvData: ProductData[]): void {
    this.csvData.clear();
    csvData.forEach(row => {
      this.csvData.set(row.sku.toLowerCase(), row);
      // Also index by potential descriptive patterns
      const description = this.generateDescription(row);
      this.csvData.set(description.toLowerCase(), row);
    });
  }

  /**
   * Extract pattern information from filename
   */
  public extractPattern(filename: string): PatternMatch {
    const cleanName = filename.toLowerCase().replace(/[-_\s]+/g, ' ');
    let confidence = 0;
    const match: Partial<PatternMatch> = {};

    // Extract pin count
    for (const pattern of PIN_COUNT_PATTERNS) {
      const pinMatch = cleanName.match(pattern.pattern);
      if (pinMatch) {
        match.pinCount = pattern.extractor(pinMatch);
        confidence += 20;
        break;
      }
    }

    // Extract connector family
    for (const [family, config] of Object.entries(CONNECTOR_FAMILIES)) {
      if (config.patterns.some(pattern => cleanName.includes(pattern.toLowerCase()))) {
        match.family = family;
        confidence += 15;
        break;
      }
    }

    // Extract connector types
    const connectorTypes = this.extractConnectorTypes(cleanName);
    if (connectorTypes.length >= 2) {
      match.connectorTypeFirst = connectorTypes[0];
      match.connectorTypeSecond = connectorTypes[1];
      confidence += 25;
    }

    // Extract length
    for (const lengthPattern of LENGTH_PATTERNS) {
      if (lengthPattern.pattern.test(cleanName)) {
        match.length = lengthPattern.standard;
        confidence += 10;
        break;
      }
    }

    // Extract pack size (default to 2pk for most harnesses)
    const packMatch = cleanName.match(/(\d+)\s*p(?:ack|k)/i);
    match.packSize = packMatch ? parseInt(packMatch[1]) : 2;
    confidence += 5;

    // Detect variant (Main/Secondary)
    if (cleanName.includes('main') || cleanName.includes('primary') || cleanName.match(/\s1\s*\./) || !cleanName.includes('secondary')) {
      match.variant = 'Main';
    } else if (cleanName.includes('secondary') || cleanName.includes('alt') || cleanName.match(/\s2\s*\./)) {
      match.variant = 'Secondary';
    } else {
      // Default to Main for single images or unclear cases
      match.variant = 'Main';
    }
    confidence += 10;

    return {
      ...match,
      isValid: confidence >= 50,
      confidence
    } as PatternMatch;
  }

  /**
   * Extract connector types from description
   */
  private extractConnectorTypes(description: string): ('F' | 'M')[] {
    const types: ('F' | 'M')[] = [];
    const words = description.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      
      if (CONNECTOR_TYPE_PATTERNS.female.some(pattern => word.includes(pattern))) {
        types.push('F');
      } else if (CONNECTOR_TYPE_PATTERNS.male.some(pattern => word.includes(pattern))) {
        types.push('M');
      }
    }

    return types;
  }

  /**
   * Generate SKU from pattern match
   */
  public generateSku(pattern: PatternMatch): string {
    if (!pattern.family || !pattern.pinCount || !pattern.connectorTypeFirst || !pattern.connectorTypeSecond || !pattern.length) {
      throw new Error('Insufficient pattern data to generate SKU');
    }

    const familyConfig = CONNECTOR_FAMILIES[pattern.family as keyof typeof CONNECTOR_FAMILIES];
    if (!familyConfig) {
      throw new Error(`Unknown connector family: ${pattern.family}`);
    }

    const packSize = pattern.packSize || 2;
    
    return `${familyConfig.prefix}-${pattern.pinCount}p-${pattern.connectorTypeFirst}-${pattern.connectorTypeSecond}-${pattern.length}-${packSize}pk`;
  }

  /**
   * Generate standardized filename
   */
  public generateFilename(sku: string, variant: 'Main' | 'Secondary', extension: string): string {
    // Ensure extension starts with dot
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    return `${sku}-${variant}${ext}`;
  }

  /**
   * Generate description for indexing
   */
  private generateDescription(data: ProductData): string {
    const connType1 = data.connectorType1.toLowerCase().includes('rec') ? 'Female' : 'Male';
    const connType2 = data.connectorType2.toLowerCase().includes('rec') ? 'Female' : 'Male';
    return `${data.pinCount}x1 ${connType1} ${data.family} to ${connType2} ${data.family}, ${data.length}`;
  }

  /**
   * Find matching SKU from CSV data
   */
  public findMatchingSku(pattern: PatternMatch, filename: string): string | null {
    // First, try exact SKU generation
    try {
      const generatedSku = this.generateSku(pattern);
      if (this.csvData.has(generatedSku.toLowerCase())) {
        return generatedSku;
      }
    } catch (error) {
      // Fall through to fuzzy matching
    }

    // Fuzzy matching based on pattern components
    const entries = Array.from(this.csvData.entries());
    for (const [sku, data] of entries) {
      if (sku.startsWith('mpa-') && this.isPatternMatch(pattern, data)) {
        return data.sku;
      }
    }

    return null;
  }

  /**
   * Check if pattern matches product data
   */
  private isPatternMatch(pattern: PatternMatch, data: ProductData): boolean {
    // Family match
    if (pattern.family && !data.family.toLowerCase().includes(pattern.family.toLowerCase())) {
      return false;
    }

    // Pin count match
    if (pattern.pinCount && pattern.pinCount !== data.pinCount) {
      return false;
    }

    // Length match
    if (pattern.length && !data.length.toLowerCase().includes(pattern.length.toLowerCase())) {
      return false;
    }

    // Pack size match
    if (pattern.packSize && pattern.packSize !== data.packSize) {
      return false;
    }

    return true;
  }

  /**
   * Validate filename against Amazon standards
   */
  public validateFilename(filename: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check length
    if (filename.length > 100) {
      errors.push('Filename too long (max 100 characters)');
    }

    // Check characters
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      errors.push('Filename contains invalid characters (only letters, numbers, dots, hyphens, and underscores allowed)');
    }

    // Check extension
    const ext = extname(filename).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
      errors.push('Invalid file extension (must be .png, .jpg, .jpeg, or .gif)');
    }

    // Check SKU pattern
    const baseName = filename.replace(extname(filename), '');
    if (!/^MPA-[A-Z0-9]+-\d+p-[FM]-[FM]-\d+in-\d+pk-(Main|Secondary)$/.test(baseName)) {
      errors.push('Filename does not follow Amazon SKU pattern');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate rename operation
   */
  public generateRenameOperation(
    originalPath: string, 
    targetDirectory: string, 
    pattern: PatternMatch,
    csvData?: Map<string, ProductData>
  ): RenameOperation {
    const filename = originalPath.split('/').pop() || originalPath;
    const extension = extname(filename);
    
    let sku: string;
    let confidence = pattern.confidence;

    // Try to find matching SKU from CSV
    const matchingSku = this.findMatchingSku(pattern, filename);
    if (matchingSku) {
      sku = matchingSku;
      confidence += 20;
    } else {
      try {
        sku = this.generateSku(pattern);
      } catch (error) {
        return {
          originalPath,
          newPath: originalPath,
          sku: '',
          variant: pattern.variant || 'Main',
          confidence: 0,
          isValid: false,
          reason: `Failed to generate SKU: ${(error as Error).message}`
        };
      }
    }

    const newFilename = this.generateFilename(sku, pattern.variant || 'Main', extension);
    const newPath = `${targetDirectory}/${newFilename}`;

    const validation = this.validateFilename(newFilename);
    
    return {
      originalPath,
      newPath,
      sku,
      variant: pattern.variant || 'Main',
      confidence,
      isValid: validation.isValid && confidence >= 50,
      reason: validation.errors.join('; ')
    };
  }

  /**
   * Get connector family statistics
   */
  public getConnectorFamilyStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.csvData.forEach((data) => {
      if (data.family) {
        stats[data.family] = (stats[data.family] || 0) + 1;
      }
    });
    return stats;
  }

  /**
   * Generate preview of rename operations
   */
  public previewRename(operations: RenameOperation[]): void {
    console.log(chalk.blue('\n🔍 Preview of Rename Operations:\n'));
    
    operations.forEach((op, index) => {
      const status = op.isValid ? chalk.green('✅') : chalk.red('❌');
      const confidence = op.confidence >= 80 ? chalk.green(`${op.confidence}%`) : 
                        op.confidence >= 50 ? chalk.yellow(`${op.confidence}%`) : 
                        chalk.red(`${op.confidence}%`);
      
      console.log(`${status} ${index + 1}. ${chalk.gray(op.originalPath.split('/').pop())}`);
      console.log(`   → ${chalk.cyan(op.newPath.split('/').pop())} (${confidence} confidence)`);
      
      if (op.reason && !op.isValid) {
        console.log(`   ${chalk.red('Reason:')} ${op.reason}`);
      }
      console.log('');
    });

    const validOps = operations.filter(op => op.isValid);
    const invalidOps = operations.filter(op => !op.isValid);
    
    console.log(chalk.green(`✅ Valid operations: ${validOps.length}`));
    if (invalidOps.length > 0) {
      console.log(chalk.red(`❌ Invalid operations: ${invalidOps.length}`));
    }
  }
}

/**
 * Parse CSV row into ProductData
 */
export function parseCsvRow(csvRow: string[]): ProductData | null {
  if (csvRow.length < 4) return null;
  
  try {
    return {
      sku: csvRow[0] || '',
      ipn: csvRow[1] || '',
      pinCount: parseInt(csvRow[2]) || 0,
      packSize: parseInt(csvRow[3]) || 2,
      family: extractFamilyFromRow(csvRow),
      connectorType1: csvRow[5] || '',
      connectorType2: csvRow[16] || '',
      length: extractLengthFromRow(csvRow)
    };
  } catch (error) {
    return null;
  }
}

/**
 * Extract family from CSV row
 */
function extractFamilyFromRow(csvRow: string[]): string {
  const familyCol = csvRow[4] || '';
  for (const family of Object.keys(CONNECTOR_FAMILIES)) {
    if (familyCol.toUpperCase().includes(family)) {
      return family;
    }
  }
  return '';
}

/**
 * Extract length from CSV row
 */
function extractLengthFromRow(csvRow: string[]): string {
  // Length is typically in the wire spec column or length column
  const wireSpec = csvRow[26] || '';
  const lengthCol = csvRow[28] || '';
  
  for (const lengthPattern of LENGTH_PATTERNS) {
    if (lengthPattern.pattern.test(wireSpec) || lengthPattern.pattern.test(lengthCol)) {
      return lengthPattern.standard;
    }
  }
  
  return '';
}
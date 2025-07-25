export interface HarnessConfig {
  product: {
    title: string;
    sku: string;
    description: string;
  };
  specifications: {
    pin_count: number;
    wire_gauge: string;
    length: string;
    connector_type: string;
    current_rating?: string;
    voltage_rating?: string;
    temperature_range?: string;
  };
  pricing: {
    price: number;
    compare_at_price?: number;
  };
  images: string[];
  amazon: {
    category: string;
    search_keywords: string[];
    bullet_points: string[];
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

// Amazon category mappings for wire harness products
export const AMAZON_CATEGORIES = {
  'industrial-electrical': {
    browseNodeId: '16310091',
    name: 'Industrial & Scientific > Industrial Electrical > Wire Management',
    requiredAttributes: ['wire_gauge', 'length', 'pin_count'],
  },
  'automotive-electrical': {
    browseNodeId: '15684181',
    name: 'Automotive > Replacement Parts > Electrical',
    requiredAttributes: ['wire_gauge', 'connector_type', 'voltage_rating'],
  },
  'electronics-components': {
    browseNodeId: '1194444',
    name: 'Industrial & Scientific > Raw Materials > Electrical',
    requiredAttributes: ['wire_gauge', 'current_rating'],
  },
} as const;

export type CategoryKey = keyof typeof AMAZON_CATEGORIES;

// Valid wire gauge values (AWG standard)
export const WIRE_GAUGES = [
  '30 AWG', '28 AWG', '26 AWG', '24 AWG', '22 AWG', '20 AWG', 
  '18 AWG', '16 AWG', '14 AWG', '12 AWG', '10 AWG', '8 AWG'
] as const;

// Common connector types
export const CONNECTOR_TYPES = [
  'Crimp Terminal',
  'Ring Terminal',
  'Spade Terminal',
  'Bullet Connector',
  'Pin Connector',
  'Molex Connector',
  'JST Connector',
  'Deutsch Connector',
  'Custom Connector'
] as const;

// Validation rules for different fields
export const VALIDATION_RULES = {
  product: {
    title: {
      minLength: 10,
      maxLength: 200,
      required: true,
      pattern: /^[a-zA-Z0-9\s\-|&(),./]+$/,
    },
    sku: {
      minLength: 3,
      maxLength: 40,
      required: true,
      pattern: /^[A-Z0-9\-_]+$/,
    },
    description: {
      minLength: 50,
      maxLength: 2000,
      required: true,
    },
  },
  specifications: {
    pin_count: {
      min: 2,
      max: 500,
      required: true,
    },
    wire_gauge: {
      required: true,
      validValues: WIRE_GAUGES,
    },
    length: {
      required: true,
      pattern: /^\d+(\.\d+)?\s*(inches?|in|feet?|ft|mm|cm|meters?|m)$/i,
    },
    connector_type: {
      required: true,
      validValues: CONNECTOR_TYPES,
    },
  },
  pricing: {
    price: {
      min: 0.01,
      max: 10000,
      required: true,
    },
    compare_at_price: {
      min: 0.01,
      max: 10000,
      required: false,
    },
  },
  images: {
    minCount: 1,
    maxCount: 10,
    required: true,
    validExtensions: ['.jpg', '.jpeg', '.png'],
  },
  amazon: {
    category: {
      required: true,
      validValues: Object.keys(AMAZON_CATEGORIES) as CategoryKey[],
    },
    search_keywords: {
      minCount: 3,
      maxCount: 50,
      required: true,
    },
    bullet_points: {
      minCount: 3,
      maxCount: 5,
      required: true,
      itemMaxLength: 255,
    },
  },
} as const;
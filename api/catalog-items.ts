import { SPAPIClient } from './client.js';
import { SPAPIResponse } from './types.js';
import { HarnessConfig, AMAZON_CATEGORIES } from '../config/harness-schema.js';

export interface CatalogItem {
  asin: string;
  productTypes: string[];
  salesRanks?: Array<{
    productCategoryId: string;
    rank: number;
  }>;
  browseClassification?: {
    displayName: string;
    classificationId: string;
  };
}

export interface CatalogSearchResult {
  numberOfResults: number;
  items: CatalogItem[];
}

export interface CreateCatalogItemRequest {
  productType: string;
  requirements: string;
  attributes: Record<string, any>;
}

export interface CreateCatalogItemResponse {
  asin?: string;
  status: 'ACCEPTED' | 'INVALID' | 'DUPLICATE';
  submissionId: string;
  issues?: Array<{
    code: string;
    message: string;
    severity: 'ERROR' | 'WARNING';
  }>;
}

export class CatalogItemsAPI {
  private client: SPAPIClient;

  constructor(client: SPAPIClient) {
    this.client = client;
  }

  async searchCatalogItems(
    keywords: string,
    marketplaceIds: string[],
    productTypes?: string[]
  ): Promise<CatalogSearchResult> {
    try {
      const params: Record<string, any> = {
        keywords,
        marketplaceIds: marketplaceIds.join(','),
        includedData: 'summaries,browseClassification,salesRanks',
      };

      if (productTypes && productTypes.length > 0) {
        params.productTypes = productTypes.join(',');
      }

      const response = await this.client.makeRequest<CatalogSearchResult>(
        'GET',
        '/catalog/2020-12-01/items',
        undefined,
        params
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(`Catalog search failed: ${response.errors[0].message}`);
      }

      return response.payload || { numberOfResults: 0, items: [] };

    } catch (error) {
      throw new Error(`Failed to search catalog: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCatalogItem(asin: string, marketplaceIds: string[]): Promise<CatalogItem | null> {
    try {
      const params = {
        marketplaceIds: marketplaceIds.join(','),
        includedData: 'summaries,browseClassification,salesRanks',
      };

      const response = await this.client.makeRequest<CatalogItem>(
        'GET',
        `/catalog/2020-12-01/items/${asin}`,
        undefined,
        params
      );

      if (response.errors && response.errors.length > 0) {
        if (response.errors[0].code === 'NOT_FOUND') {
          return null;
        }
        throw new Error(`Failed to get catalog item: ${response.errors[0].message}`);
      }

      return response.payload || null;

    } catch (error) {
      throw new Error(`Failed to get catalog item: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createCatalogItem(
    harnessConfig: HarnessConfig,
    marketplaceId: string
  ): Promise<CreateCatalogItemResponse> {
    try {
      // Get category information
      const categoryInfo = AMAZON_CATEGORIES[harnessConfig.amazon.category as keyof typeof AMAZON_CATEGORIES];
      if (!categoryInfo) {
        throw new Error(`Invalid category: ${harnessConfig.amazon.category}`);
      }

      // Build the catalog item attributes
      const attributes = this.buildCatalogAttributes(harnessConfig, categoryInfo);

      const request: CreateCatalogItemRequest = {
        productType: 'PRODUCT', // This would be more specific in production
        requirements: 'listing',
        attributes,
      };

      const response = await this.client.makeRequest<CreateCatalogItemResponse>(
        'POST',
        `/catalog/2020-12-01/items`,
        request
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(`Failed to create catalog item: ${response.errors[0].message}`);
      }

      if (!response.payload) {
        throw new Error('No response payload received');
      }

      return response.payload;

    } catch (error) {
      throw new Error(`Failed to create catalog item: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildCatalogAttributes(
    harnessConfig: HarnessConfig,
    categoryInfo: typeof AMAZON_CATEGORIES[keyof typeof AMAZON_CATEGORIES]
  ): Record<string, any> {
    const attributes: Record<string, any> = {
      // Basic product information
      item_name: {
        value: harnessConfig.product.title,
        marketplace_id: 'ATVPDKIKX0DER', // This would be dynamic
      },
      brand: {
        value: 'MiniProto',
        marketplace_id: 'ATVPDKIKX0DER',
      },
      external_product_id: {
        value: harnessConfig.product.sku,
        external_product_id_type: 'EAN',
        marketplace_id: 'ATVPDKIKX0DER',
      },
      
      // Product description
      product_description: {
        value: harnessConfig.product.description,
        marketplace_id: 'ATVPDKIKX0DER',
      },

      // Specifications
      manufacturer: {
        value: 'MiniProto',
        marketplace_id: 'ATVPDKIKX0DER',
      },
      
      // Wire harness specific attributes
      wire_gauge: {
        value: harnessConfig.specifications.wire_gauge,
        marketplace_id: 'ATVPDKIKX0DER',
      },
      
      connector_count: {
        value: harnessConfig.specifications.pin_count.toString(),
        marketplace_id: 'ATVPDKIKX0DER',
      },
      
      cable_length: {
        value: harnessConfig.specifications.length,
        marketplace_id: 'ATVPDKIKX0DER',
      },
      
      connector_type: {
        value: harnessConfig.specifications.connector_type,
        marketplace_id: 'ATVPDKIKX0DER',
      },
    };

    // Add optional specifications if present
    if (harnessConfig.specifications.current_rating) {
      attributes.current_rating = {
        value: harnessConfig.specifications.current_rating,
        marketplace_id: 'ATVPDKIKX0DER',
      };
    }

    if (harnessConfig.specifications.voltage_rating) {
      attributes.voltage_rating = {
        value: harnessConfig.specifications.voltage_rating,
        marketplace_id: 'ATVPDKIKX0DER',
      };
    }

    if (harnessConfig.specifications.temperature_range) {
      attributes.operating_temperature = {
        value: harnessConfig.specifications.temperature_range,
        marketplace_id: 'ATVPDKIKX0DER',
      };
    }

    // Add category-specific required attributes
    categoryInfo.requiredAttributes.forEach(attr => {
      if (harnessConfig.specifications[attr as keyof typeof harnessConfig.specifications] && !attributes[attr]) {
        attributes[attr] = {
          value: harnessConfig.specifications[attr as keyof typeof harnessConfig.specifications],
          marketplace_id: 'ATVPDKIKX0DER',
        };
      }
    });

    return attributes;
  }

  // Check if a product with the same SKU already exists
  async checkExistingProduct(sku: string, marketplaceIds: string[]): Promise<CatalogItem | null> {
    try {
      const searchResult = await this.searchCatalogItems(sku, marketplaceIds);
      
      // Look for exact SKU match
      const exactMatch = searchResult.items.find(item => {
        // In a real implementation, you would check the actual SKU field
        // For now, we'll just check if any items were found
        return searchResult.numberOfResults > 0;
      });

      return exactMatch || null;

    } catch (error) {
      // If search fails, assume no existing product
      return null;
    }
  }

  // Get product type definitions for a category
  async getProductTypeDefinitions(productType: string, marketplaceIds: string[]): Promise<any> {
    try {
      const params = {
        marketplaceIds: marketplaceIds.join(','),
      };

      const response = await this.client.makeRequest(
        'GET',
        `/definitions/2020-09-01/productTypes/${productType}`,
        undefined,
        params
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(`Failed to get product type definitions: ${response.errors[0].message}`);
      }

      return response.payload;

    } catch (error) {
      throw new Error(`Failed to get product type definitions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
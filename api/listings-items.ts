import { SPAPIClient } from './client.js';
import { SPAPIResponse } from './types.js';
import { HarnessConfig } from '../config/harness-schema.js';
import { UploadedImage } from './image-upload.js';

export interface ListingItem {
  sku: string;
  asin?: string;
  productType: string;
  requirements: string;
  attributes: Record<string, any>;
}

export interface ListingSubmission {
  submissionId: string;
  submissionType: 'PARTIAL_UPDATE' | 'DELETE';
  marketplaceIds: string[];
  status: 'ACCEPTED' | 'IN_PROGRESS' | 'CANCELLED' | 'DONE' | 'FATAL';
  issues?: Array<{
    code: string;
    message: string;
    severity: 'ERROR' | 'WARNING';
    attributeName?: string;
  }>;
}

export interface CreateListingRequest {
  productType: string;
  requirements: string;
  attributes: Record<string, any>;
}

export interface CreateListingResponse {
  sku: string;
  status: 'ACCEPTED' | 'INVALID';
  submissionId: string;
  issues?: Array<{
    code: string;
    message: string;
    severity: 'ERROR' | 'WARNING';
    attributeName?: string;
  }>;
}

export class ListingsItemsAPI {
  private client: SPAPIClient;

  constructor(client: SPAPIClient) {
    this.client = client;
  }

  async createListing(
    harnessConfig: HarnessConfig,
    uploadedImages: UploadedImage[],
    marketplaceIds: string[],
    sellerId: string
  ): Promise<CreateListingResponse> {
    try {
      // Build the listing attributes
      const attributes = this.buildListingAttributes(harnessConfig, uploadedImages, marketplaceIds[0]);

      const request: CreateListingRequest = {
        productType: 'ELECTRONIC_WIRE',
        requirements: 'LISTING',
        attributes,
      };

      const response = await this.client.makeRequest<CreateListingResponse>(
        'PUT',
        `/listings/2021-08-01/items/${sellerId}/${harnessConfig.product.sku}`,
        request,
        { marketplaceIds: marketplaceIds.join(',') }
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(`Failed to create listing: ${response.errors[0].message}`);
      }

      // Handle both payload and direct response formats
      const responseData = response.payload || response;
      
      return {
        sku: harnessConfig.product.sku,
        status: (responseData as any).status || 'ACCEPTED',
        submissionId: (responseData as any).submissionId || '',
        issues: (responseData as any).issues || []
      };

    } catch (error) {
      throw new Error(`Failed to create listing: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getListing(sku: string, marketplaceIds: string[]): Promise<ListingItem | null> {
    try {
      const params = {
        marketplaceIds: marketplaceIds.join(','),
        includedData: 'summaries,attributes,fulfillmentAvailability,procurement',
      };

      const response = await this.client.makeRequest<ListingItem>(
        'GET',
        `/listings/2021-08-01/items/${sku}`,
        undefined,
        params
      );

      if (response.errors && response.errors.length > 0) {
        if (response.errors[0].code === 'NOT_FOUND') {
          return null;
        }
        throw new Error(`Failed to get listing: ${response.errors[0].message}`);
      }

      return response.payload || null;

    } catch (error) {
      throw new Error(`Failed to get listing: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateListing(
    sku: string,
    harnessConfig: HarnessConfig,
    uploadedImages: UploadedImage[],
    marketplaceIds: string[]
  ): Promise<CreateListingResponse> {
    try {
      // Build the listing attributes
      const attributes = this.buildListingAttributes(harnessConfig, uploadedImages, marketplaceIds[0]);

      const request: CreateListingRequest = {
        productType: 'ELECTRONIC_WIRE',
        requirements: 'LISTING',
        attributes,
      };

      const response = await this.client.makeRequest<CreateListingResponse>(
        'PATCH',
        `/listings/2021-08-01/items/${sku}`,
        request,
        { marketplaceIds: marketplaceIds.join(',') }
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(`Failed to update listing: ${response.errors[0].message}`);
      }

      if (!response.payload) {
        throw new Error('No response payload received');
      }

      return {
        ...response.payload,
        sku,
      };

    } catch (error) {
      throw new Error(`Failed to update listing: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteListing(sku: string, marketplaceIds: string[]): Promise<void> {
    try {
      const response = await this.client.makeRequest(
        'DELETE',
        `/listings/2021-08-01/items/${sku}`,
        undefined,
        { marketplaceIds: marketplaceIds.join(',') }
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(`Failed to delete listing: ${response.errors[0].message}`);
      }

    } catch (error) {
      throw new Error(`Failed to delete listing: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSubmissionStatus(submissionId: string): Promise<ListingSubmission> {
    try {
      const response = await this.client.makeRequest<ListingSubmission>(
        'GET',
        `/listings/2021-08-01/submissions/${submissionId}`
      );

      if (response.errors && response.errors.length > 0) {
        throw new Error(`Failed to get submission status: ${response.errors[0].message}`);
      }

      if (!response.payload) {
        throw new Error('No submission data received');
      }

      return response.payload;

    } catch (error) {
      throw new Error(`Failed to get submission status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildListingAttributes(
    harnessConfig: HarnessConfig,
    uploadedImages: UploadedImage[],
    marketplaceId: string
  ): Record<string, any> {
    const attributes: Record<string, any> = {
      // Basic product information
      item_name: [
        {
          value: harnessConfig.product.title,
          marketplace_id: marketplaceId,
        }
      ],

      brand: [
        {
          value: 'MiniProto',
          marketplace_id: marketplaceId,
        }
      ],

      manufacturer: [
        {
          value: 'MiniProto',
          marketplace_id: marketplaceId,
        }
      ],

      // Product description and bullet points
      product_description: [
        {
          value: harnessConfig.product.description,
          marketplace_id: marketplaceId,
        }
      ],

      bullet_point: harnessConfig.amazon.bullet_points.map(point => ({
        value: point,
        marketplace_id: marketplaceId,
      })),

      // Pricing
      list_price: [
        {
          value: {
            amount: harnessConfig.pricing.price,
            currency_code: 'USD',
          },
          marketplace_id: marketplaceId,
        }
      ],

      // Images
      main_product_image_locator: uploadedImages.length > 0 ? [
        {
          value: {
            media_location: uploadedImages[0].amazonUrl,
          },
          marketplace_id: marketplaceId,
        }
      ] : undefined,

      other_product_image_locator_1: uploadedImages.length > 1 ? [
        {
          value: {
            media_location: uploadedImages[1].amazonUrl,
          },
          marketplace_id: marketplaceId,
        }
      ] : undefined,

      other_product_image_locator_2: uploadedImages.length > 2 ? [
        {
          value: {
            media_location: uploadedImages[2].amazonUrl,
          },
          marketplace_id: marketplaceId,
        }
      ] : undefined,

      other_product_image_locator_3: uploadedImages.length > 3 ? [
        {
          value: {
            media_location: uploadedImages[3].amazonUrl,
          },
          marketplace_id: marketplaceId,
        }
      ] : undefined,

      other_product_image_locator_4: uploadedImages.length > 4 ? [
        {
          value: {
            media_location: uploadedImages[4].amazonUrl,
          },
          marketplace_id: marketplaceId,
        }
      ] : undefined,

      // Wire harness specific attributes
      wire_gauge: [
        {
          value: harnessConfig.specifications.wire_gauge,
          marketplace_id: marketplaceId,
        }
      ],

      cable_length: [
        {
          value: {
            value: parseFloat(harnessConfig.specifications.length.match(/\d+(\.\d+)?/)?.[0] || '0'),
            unit: this.extractLengthUnit(harnessConfig.specifications.length),
          },
          marketplace_id: marketplaceId,
        }
      ],

      connector_type: [
        {
          value: harnessConfig.specifications.connector_type,
          marketplace_id: marketplaceId,
        }
      ],

      number_of_pins: [
        {
          value: harnessConfig.specifications.pin_count,
          marketplace_id: marketplaceId,
        }
      ],

      // Search keywords
      generic_keyword: harnessConfig.amazon.search_keywords.slice(0, 5).map(keyword => ({
        value: keyword,
        marketplace_id: marketplaceId,
      })),

      // Additional specifications
      ...(harnessConfig.specifications.current_rating && {
        current_rating: [
          {
            value: harnessConfig.specifications.current_rating,
            marketplace_id: marketplaceId,
          }
        ],
      }),

      ...(harnessConfig.specifications.voltage_rating && {
        voltage_rating: [
          {
            value: harnessConfig.specifications.voltage_rating,
            marketplace_id: marketplaceId,
          }
        ],
      }),

      ...(harnessConfig.specifications.temperature_range && {
        operating_temperature: [
          {
            value: harnessConfig.specifications.temperature_range,
            marketplace_id: marketplaceId,
          }
        ],
      }),
    };

    // Remove undefined attributes
    Object.keys(attributes).forEach(key => {
      if (attributes[key] === undefined) {
        delete attributes[key];
      }
    });

    return attributes;
  }

  private extractLengthUnit(lengthString: string): string {
    const lowerLength = lengthString.toLowerCase();
    
    if (lowerLength.includes('inch') || lowerLength.includes('in')) {
      return 'inches';
    } else if (lowerLength.includes('feet') || lowerLength.includes('ft')) {
      return 'feet';
    } else if (lowerLength.includes('mm')) {
      return 'millimeters';
    } else if (lowerLength.includes('cm')) {
      return 'centimeters';
    } else if (lowerLength.includes('meter') || lowerLength.includes('m')) {
      return 'meters';
    } else {
      return 'inches'; // default
    }
  }

  // Wait for submission to complete
  async waitForSubmissionCompletion(
    submissionId: string,
    maxWaitTime: number = 300000, // 5 minutes
    pollInterval: number = 5000 // 5 seconds
  ): Promise<ListingSubmission> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const submission = await this.getSubmissionStatus(submissionId);
      
      if (submission.status === 'DONE' || submission.status === 'FATAL' || submission.status === 'CANCELLED') {
        return submission;
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Submission ${submissionId} did not complete within ${maxWaitTime / 1000} seconds`);
  }
}
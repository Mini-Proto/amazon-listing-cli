import { HarnessConfig } from '../config/harness-schema.js';

export interface Change {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'modified' | 'added' | 'removed';
}

export class DiffDetector {
  async detectChanges(existingListing: any, newConfig: HarnessConfig): Promise<Change[]> {
    const changes: Change[] = [];

    try {
      // Extract existing attributes from the listing
      const existing = this.extractExistingAttributes(existingListing);

      // Check basic product information
      this.compareField(changes, 'title', existing.title, newConfig.product.title);
      this.compareField(changes, 'description', existing.description, newConfig.product.description);
      this.compareField(changes, 'price', existing.price, newConfig.pricing.price);

      // Check bullet points
      if (existing.bulletPoints && newConfig.amazon.bullet_points) {
        for (let i = 0; i < Math.max(existing.bulletPoints.length, newConfig.amazon.bullet_points.length); i++) {
          const oldBullet = existing.bulletPoints[i];
          const newBullet = newConfig.amazon.bullet_points[i];
          this.compareField(changes, `bullet_point_${i + 1}`, oldBullet, newBullet);
        }
      }

      // Check specifications
      this.compareField(changes, 'wire_gauge', existing.wireGauge, newConfig.specifications.wire_gauge);
      this.compareField(changes, 'length', existing.length, newConfig.specifications.length);
      this.compareField(changes, 'connector_type', existing.connectorType, newConfig.specifications.connector_type);
      this.compareField(changes, 'pin_count', existing.pinCount, newConfig.specifications.pin_count);
      this.compareField(changes, 'current_rating', existing.currentRating, newConfig.specifications.current_rating);
      this.compareField(changes, 'voltage_rating', existing.voltageRating, newConfig.specifications.voltage_rating);
      this.compareField(changes, 'temperature_range', existing.temperatureRange, newConfig.specifications.temperature_range);

      // Check search keywords
      if (existing.keywords && newConfig.amazon.search_keywords) {
        const oldKeywords = existing.keywords.sort();
        const newKeywords = newConfig.amazon.search_keywords.slice(0, 5).sort();
        if (JSON.stringify(oldKeywords) !== JSON.stringify(newKeywords)) {
          changes.push({
            field: 'search_keywords',
            oldValue: oldKeywords.join(', '),
            newValue: newKeywords.join(', '),
            changeType: 'modified'
          });
        }
      }

      // Check images (simplified - just count for now)
      const oldImageCount = existing.images ? existing.images.length : 0;
      const newImageCount = newConfig.images ? newConfig.images.length : 0;
      if (oldImageCount !== newImageCount) {
        changes.push({
          field: 'image_count',
          oldValue: oldImageCount,
          newValue: newImageCount,
          changeType: 'modified'
        });
      }

      return changes;

    } catch (error) {
      console.warn('Warning: Could not detect all changes due to listing format differences');
      // Return empty changes array rather than failing
      return [];
    }
  }

  private compareField(changes: Change[], fieldName: string, oldValue: any, newValue: any): void {
    // Normalize values for comparison
    const normalizedOld = this.normalizeValue(oldValue);
    const normalizedNew = this.normalizeValue(newValue);

    if (normalizedOld !== normalizedNew) {
      let changeType: 'modified' | 'added' | 'removed' = 'modified';
      
      if (normalizedOld === null || normalizedOld === undefined) {
        changeType = 'added';
      } else if (normalizedNew === null || normalizedNew === undefined) {
        changeType = 'removed';
      }

      changes.push({
        field: fieldName,
        oldValue: normalizedOld || '(empty)',
        newValue: normalizedNew || '(empty)',
        changeType
      });
    }
  }

  private normalizeValue(value: any): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (typeof value === 'string') {
      return value.trim();
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    return String(value);
  }

  private extractExistingAttributes(listing: any): any {
    try {
      // Handle different possible listing formats from Amazon SP-API
      const attributes = listing.attributes || listing.summaries?.[0]?.attributes || {};
      
      return {
        title: this.extractAttributeValue(attributes.item_name) || listing.summaries?.[0]?.itemName,
        description: this.extractAttributeValue(attributes.product_description),
        price: this.extractPriceValue(attributes.list_price) || listing.summaries?.[0]?.lowestPrice?.amount,
        bulletPoints: this.extractBulletPoints(attributes),
        wireGauge: this.extractAttributeValue(attributes.wire_gauge),
        length: this.extractLengthValue(attributes.cable_length),
        connectorType: this.extractAttributeValue(attributes.connector_type),
        pinCount: this.extractAttributeValue(attributes.number_of_pins),
        currentRating: this.extractAttributeValue(attributes.current_rating),
        voltageRating: this.extractAttributeValue(attributes.voltage_rating),
        temperatureRange: this.extractAttributeValue(attributes.operating_temperature),
        keywords: this.extractKeywords(attributes.generic_keyword),
        images: this.extractImages(attributes)
      };
    } catch (error) {
      console.warn('Could not extract existing attributes:', error);
      return {};
    }
  }

  private extractAttributeValue(attr: any): string | null {
    if (!attr) return null;
    
    if (Array.isArray(attr) && attr.length > 0) {
      return attr[0].value || null;
    }
    
    if (typeof attr === 'object' && attr.value) {
      return attr.value;
    }
    
    if (typeof attr === 'string') {
      return attr;
    }
    
    return null;
  }

  private extractPriceValue(attr: any): number | null {
    if (!attr) return null;
    
    if (Array.isArray(attr) && attr.length > 0) {
      const priceObj = attr[0].value;
      if (priceObj && typeof priceObj === 'object' && priceObj.amount) {
        return parseFloat(priceObj.amount);
      }
    }
    
    return null;
  }

  private extractLengthValue(attr: any): string | null {
    if (!attr) return null;
    
    if (Array.isArray(attr) && attr.length > 0) {
      const lengthObj = attr[0].value;
      if (lengthObj && typeof lengthObj === 'object') {
        return `${lengthObj.value} ${lengthObj.unit}`;
      }
    }
    
    return this.extractAttributeValue(attr);
  }

  private extractBulletPoints(attributes: any): string[] {
    const bulletPoints: string[] = [];
    
    if (attributes.bullet_point && Array.isArray(attributes.bullet_point)) {
      attributes.bullet_point.forEach((bullet: any) => {
        const value = bullet.value;
        if (value) {
          bulletPoints.push(value);
        }
      });
    }
    
    return bulletPoints;
  }

  private extractKeywords(attr: any): string[] {
    if (!attr || !Array.isArray(attr)) return [];
    
    return attr.map((keyword: any) => keyword.value).filter(Boolean);
  }

  private extractImages(attributes: any): string[] {
    const images: string[] = [];
    
    // Check for main product image
    if (attributes.main_product_image_locator) {
      const mainImage = this.extractAttributeValue(attributes.main_product_image_locator);
      if (mainImage) images.push(mainImage);
    }
    
    // Check for other product images
    for (let i = 1; i <= 4; i++) {
      const otherImage = this.extractAttributeValue(attributes[`other_product_image_locator_${i}`]);
      if (otherImage) images.push(otherImage);
    }
    
    return images;
  }
}
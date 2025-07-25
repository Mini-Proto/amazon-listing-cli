import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  persistToDisk?: boolean; // Save cache to disk
}

export class Cache<T> {
  private memory: Map<string, CacheEntry<T>> = new Map();
  private options: Required<CacheOptions>;
  private cacheDir: string;
  private isDirty: boolean = false;

  constructor(name: string, options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes default
      maxSize: options.maxSize ?? 1000,
      persistToDisk: options.persistToDisk ?? true
    };

    this.cacheDir = join(
      process.env.HOME || process.cwd(),
      '.amazon-harness',
      'cache'
    );

    if (this.options.persistToDisk) {
      this.loadFromDisk(name);
      
      // Periodically save to disk
      setInterval(() => {
        if (this.isDirty) {
          this.saveToDisk(name);
        }
      }, 30000); // Save every 30 seconds if dirty
    }
  }

  async get(key: string): Promise<T | null> {
    const entry = this.memory.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.memory.delete(key);
      this.isDirty = true;
      return null;
    }

    return entry.data;
  }

  async set(key: string, data: T, customTtl?: number): Promise<void> {
    const ttl = customTtl ?? this.options.ttl;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    };

    // Enforce max size
    if (this.memory.size >= this.options.maxSize) {
      this.evictOldest();
    }

    this.memory.set(key, entry);
    this.isDirty = true;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.memory.delete(key);
    if (deleted) {
      this.isDirty = true;
    }
    return deleted;
  }

  async clear(): Promise<void> {
    this.memory.clear();
    this.isDirty = true;
  }

  async has(key: string): Promise<boolean> {
    const entry = this.memory.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.memory.delete(key);
      this.isDirty = true;
      return false;
    }

    return true;
  }

  size(): number {
    return this.memory.size;
  }

  // Generate cache key from object
  static keyFromObject(obj: any): string {
    const hash = createHash('md5');
    hash.update(JSON.stringify(obj, Object.keys(obj).sort()));
    return hash.digest('hex');
  }

  // Generate cache key from multiple values
  static keyFromValues(...values: any[]): string {
    const hash = createHash('md5');
    hash.update(JSON.stringify(values));
    return hash.digest('hex');
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.memory.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memory.delete(oldestKey);
    }
  }

  private async loadFromDisk(name: string): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const cacheFile = join(this.cacheDir, `${name}.json`);
      
      const data = await fs.readFile(cacheFile, 'utf-8');
      const entries: Array<[string, CacheEntry<T>]> = JSON.parse(data);
      
      // Filter out expired entries
      const now = Date.now();
      const validEntries = entries.filter(([, entry]) => now < entry.expires);
      
      this.memory = new Map(validEntries);
    } catch (error) {
      // Cache file doesn't exist or is corrupted, start fresh
      this.memory = new Map();
    }
  }

  private async saveToDisk(name: string): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const cacheFile = join(this.cacheDir, `${name}.json`);
      
      const entries = Array.from(this.memory.entries());
      await fs.writeFile(cacheFile, JSON.stringify(entries), 'utf-8');
      
      this.isDirty = false;
    } catch (error) {
      // Ignore disk save errors
      console.warn('Cache save failed:', error);
    }
  }
}

// Specialized caches for common use cases
export class SPAPICache {
  private static instance: SPAPICache;
  private listingsCache: Cache<any>;
  private inventoryCache: Cache<any>;
  private catalogCache: Cache<any>;

  private constructor() {
    this.listingsCache = new Cache('sp-api-listings', { 
      ttl: 10 * 60 * 1000, // 10 minutes
      maxSize: 500 
    });
    
    this.inventoryCache = new Cache('sp-api-inventory', { 
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000 
    });
    
    this.catalogCache = new Cache('sp-api-catalog', { 
      ttl: 60 * 60 * 1000, // 1 hour (catalog data changes slowly)
      maxSize: 2000 
    });
  }

  static getInstance(): SPAPICache {
    if (!SPAPICache.instance) {
      SPAPICache.instance = new SPAPICache();
    }
    return SPAPICache.instance;
  }

  // Listing cache methods
  async getListing(sku: string, marketplaceId: string): Promise<any | null> {
    const key = `listing_${sku}_${marketplaceId}`;
    return this.listingsCache.get(key);
  }

  async setListing(sku: string, marketplaceId: string, data: any): Promise<void> {
    const key = `listing_${sku}_${marketplaceId}`;
    return this.listingsCache.set(key, data);
  }

  // Inventory cache methods
  async getInventory(marketplaceId: string, filter?: string): Promise<any | null> {
    const key = `inventory_${marketplaceId}_${filter || 'all'}`;
    return this.inventoryCache.get(key);
  }

  async setInventory(marketplaceId: string, data: any, filter?: string): Promise<void> {
    const key = `inventory_${marketplaceId}_${filter || 'all'}`;
    return this.inventoryCache.set(key, data);
  }

  // Catalog cache methods
  async getCatalogSearch(query: string, marketplaceId: string): Promise<any | null> {
    const key = Cache.keyFromValues('catalog_search', query, marketplaceId);
    return this.catalogCache.get(key);
  }

  async setCatalogSearch(query: string, marketplaceId: string, data: any): Promise<void> {
    const key = Cache.keyFromValues('catalog_search', query, marketplaceId);
    return this.catalogCache.set(key, data);
  }

  // Cache invalidation
  async invalidateListing(sku: string, marketplaceId: string): Promise<void> {
    const key = `listing_${sku}_${marketplaceId}`;
    await this.listingsCache.delete(key);
  }

  async invalidateInventory(marketplaceId: string): Promise<void> {
    // Clear all inventory cache entries for this marketplace
    await this.inventoryCache.clear();
  }

  // Statistics
  getCacheStats(): { listings: number; inventory: number; catalog: number } {
    return {
      listings: this.listingsCache.size(),
      inventory: this.inventoryCache.size(),
      catalog: this.catalogCache.size()
    };
  }
}

// Image processing cache
export class ImageCache {
  private static instance: ImageCache;
  private cache: Cache<Buffer>;

  private constructor() {
    this.cache = new Cache('image-processing', {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 100, // Limit due to memory usage
      persistToDisk: false // Don't persist binary data
    });
  }

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  async getProcessedImage(originalPath: string, options: any): Promise<Buffer | null> {
    const key = Cache.keyFromValues(originalPath, options);
    return this.cache.get(key);
  }

  async setProcessedImage(originalPath: string, options: any, imageBuffer: Buffer): Promise<void> {
    const key = Cache.keyFromValues(originalPath, options);
    return this.cache.set(key, imageBuffer);
  }
}
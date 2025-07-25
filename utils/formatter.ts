import chalk from 'chalk';

export interface ListingInfo {
  sku: string;
  asin?: string;
  title: string;
  price?: number;
  status: string;
  lastModified?: string;
  quantity?: number;
}

export type OutputFormat = 'table' | 'json' | 'csv';

export class Formatter {
  static formatListings(listings: ListingInfo[], format: OutputFormat): string {
    switch (format) {
      case 'json':
        return JSON.stringify(listings, null, 2);
      case 'csv':
        return this.formatAsCSV(listings);
      case 'table':
      default:
        return this.formatAsTable(listings);
    }
  }

  private static formatAsTable(listings: ListingInfo[]): string {
    if (listings.length === 0) {
      return chalk.yellow('No listings found');
    }

    // Calculate column widths
    const widths = {
      sku: Math.max(3, Math.max(...listings.map(l => l.sku.length))),
      asin: Math.max(4, Math.max(...listings.map(l => (l.asin || '').length))),
      title: Math.max(5, Math.max(...listings.map(l => l.title.substring(0, 50).length))),
      price: 8,
      status: 6,
      modified: 12
    };

    // Header
    let output = '\n';
    output += chalk.bold(
      'SKU'.padEnd(widths.sku) + ' │ ' +
      'ASIN'.padEnd(widths.asin) + ' │ ' +
      'Title'.padEnd(widths.title) + ' │ ' +
      'Price'.padEnd(widths.price) + ' │ ' +
      'Status'.padEnd(widths.status) + ' │ ' +
      'Modified'.padEnd(widths.modified)
    );
    output += '\n';
    
    // Separator
    output += '─'.repeat(widths.sku) + '─┼─' +
              '─'.repeat(widths.asin) + '─┼─' +
              '─'.repeat(widths.title) + '─┼─' +
              '─'.repeat(widths.price) + '─┼─' +
              '─'.repeat(widths.status) + '─┼─' +
              '─'.repeat(widths.modified);
    output += '\n';

    // Data rows
    listings.forEach(listing => {
      const title = listing.title.length > 50 
        ? listing.title.substring(0, 47) + '...' 
        : listing.title;
      
      const price = listing.price 
        ? `$${listing.price.toFixed(2)}` 
        : 'N/A';
      
      const modified = listing.lastModified 
        ? new Date(listing.lastModified).toLocaleDateString()
        : 'Unknown';

      const statusColor = this.getStatusColor(listing.status);

      output += 
        listing.sku.padEnd(widths.sku) + ' │ ' +
        (listing.asin || 'N/A').padEnd(widths.asin) + ' │ ' +
        title.padEnd(widths.title) + ' │ ' +
        price.padEnd(widths.price) + ' │ ' +
        statusColor(listing.status.padEnd(widths.status)) + ' │ ' +
        modified.padEnd(widths.modified);
      output += '\n';
    });

    output += '\n';
    output += chalk.gray(`Total: ${listings.length} listing(s)`);
    
    return output;
  }

  private static formatAsCSV(listings: ListingInfo[]): string {
    if (listings.length === 0) {
      return 'SKU,ASIN,Title,Price,Status,LastModified,Quantity\n';
    }

    let csv = 'SKU,ASIN,Title,Price,Status,LastModified,Quantity\n';
    
    listings.forEach(listing => {
      const escapedTitle = listing.title.replace(/"/g, '""');
      const price = listing.price || '';
      const asin = listing.asin || '';
      const modified = listing.lastModified || '';
      const quantity = listing.quantity || '';
      
      csv += `"${listing.sku}","${asin}","${escapedTitle}","${price}","${listing.status}","${modified}","${quantity}"\n`;
    });
    
    return csv;
  }

  private static getStatusColor(status: string): (text: string) => string {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'BUYABLE':
      case 'AVAILABLE':
        return chalk.green;
      case 'INACTIVE':
      case 'SUPPRESSED':
        return chalk.red;
      case 'INCOMPLETE':
      case 'PENDING':
        return chalk.yellow;
      default:
        return chalk.gray;
    }
  }

  static formatProductSummary(listing: any): string {
    let output = '\n';
    output += chalk.bold(`📦 ${listing.sku}\n`);
    
    if (listing.asin) {
      output += chalk.gray(`ASIN: ${listing.asin}\n`);
    }
    
    if (listing.summaries && listing.summaries[0]) {
      const summary = listing.summaries[0];
      output += chalk.blue(`Title: ${summary.itemName || 'N/A'}\n`);
      
      if (summary.lowestPrice) {
        output += chalk.green(`Price: $${summary.lowestPrice.amount} ${summary.lowestPrice.currencyCode}\n`);
      }
      
      if (summary.mainImage) {
        output += chalk.gray(`Main Image: ${summary.mainImage.link}\n`);
      }
    }
    
    if (listing.attributes) {
      output += chalk.yellow('Attributes:\n');
      Object.keys(listing.attributes).slice(0, 5).forEach(key => {
        const value = Array.isArray(listing.attributes[key]) 
          ? listing.attributes[key][0]?.value 
          : listing.attributes[key];
        if (value) {
          output += chalk.gray(`  ${key}: ${value}\n`);
        }
      });
    }
    
    return output;
  }

  static formatSearchResult(item: any): string {
    return `${chalk.bold(item.asin)} - ${item.summaries?.[0]?.itemName || 'Unknown'}`;
  }
}
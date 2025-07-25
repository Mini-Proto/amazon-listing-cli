export class RateLimiter {
  private tokens: Map<string, number> = new Map();
  private lastRefill: Map<string, number> = new Map();
  private readonly defaultRate: number = 10; // requests per second
  private readonly defaultBurst: number = 20; // burst capacity

  constructor() {
    // Initialize with default bucket
    this.tokens.set('default', this.defaultBurst);
    this.lastRefill.set('default', Date.now());
  }

  async waitForToken(endpoint: string = 'default', rate: number = this.defaultRate, burst: number = this.defaultBurst): Promise<void> {
    const now = Date.now();
    const lastRefillTime = this.lastRefill.get(endpoint) || now;
    const currentTokens = this.tokens.get(endpoint) || burst;

    // Calculate tokens to add based on time elapsed
    const timePassed = (now - lastRefillTime) / 1000; // seconds
    const tokensToAdd = Math.floor(timePassed * rate);
    
    // Update tokens (but don't exceed burst capacity)
    const newTokenCount = Math.min(burst, currentTokens + tokensToAdd);
    
    this.tokens.set(endpoint, newTokenCount);
    this.lastRefill.set(endpoint, now);

    // If we have tokens, consume one and proceed
    if (newTokenCount > 0) {
      this.tokens.set(endpoint, newTokenCount - 1);
      return;
    }

    // No tokens available, need to wait
    const waitTime = (1 / rate) * 1000; // time to wait for next token in ms
    await this.sleep(waitTime);
    
    // Recursive call to try again
    return this.waitForToken(endpoint, rate, burst);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current token count for debugging
  getTokenCount(endpoint: string = 'default'): number {
    return this.tokens.get(endpoint) || 0;
  }

  // Reset bucket for testing
  reset(endpoint: string = 'default'): void {
    this.tokens.set(endpoint, this.defaultBurst);
    this.lastRefill.set(endpoint, Date.now());
  }
}
import { performance } from 'perf_hooks';
import chalk from 'chalk';

interface TimingEntry {
  name: string;
  start: number;
  end?: number;
  duration?: number;
  metadata?: any;
}

interface MemorySnapshot {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private timings: Map<string, TimingEntry> = new Map();
  private completedTimings: TimingEntry[] = [];
  private memorySnapshots: Array<{ timestamp: number; memory: MemorySnapshot }> = [];

  private constructor() {
    // Take initial memory snapshot
    this.takeMemorySnapshot();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Timing methods
  startTimer(name: string, metadata?: any): void {
    const entry: TimingEntry = {
      name,
      start: performance.now(),
      metadata
    };
    this.timings.set(name, entry);
  }

  stopTimer(name: string): number | null {
    const entry = this.timings.get(name);
    if (!entry) {
      return null;
    }

    entry.end = performance.now();
    entry.duration = entry.end - entry.start;

    this.completedTimings.push(entry);
    this.timings.delete(name);

    return entry.duration;
  }

  // Memory monitoring
  takeMemorySnapshot(): void {
    const memUsage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers
    };

    this.memorySnapshots.push({
      timestamp: Date.now(),
      memory: snapshot
    });

    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots = this.memorySnapshots.slice(-100);
    }
  }

  // Utility method for timing async operations
  async timeAsync<T>(name: string, operation: () => Promise<T>, metadata?: any): Promise<T> {
    this.startTimer(name, metadata);
    try {
      const result = await operation();
      this.stopTimer(name);
      return result;
    } catch (error) {
      this.stopTimer(name);
      throw error;
    }
  }

  // Utility method for timing sync operations
  timeSync<T>(name: string, operation: () => T, metadata?: any): T {
    this.startTimer(name, metadata);
    try {
      const result = operation();
      this.stopTimer(name);
      return result;
    } catch (error) {
      this.stopTimer(name);
      throw error;
    }
  }

  // Reporting methods
  getTimingReport(): { total: number; average: number; operations: TimingEntry[] } {
    const operations = [...this.completedTimings];
    const total = operations.reduce((sum, op) => sum + (op.duration || 0), 0);
    const average = operations.length > 0 ? total / operations.length : 0;

    return {
      total,
      average,
      operations: operations.sort((a, b) => (b.duration || 0) - (a.duration || 0))
    };
  }

  getMemoryReport(): {
    current: MemorySnapshot;
    peak: MemorySnapshot;
    snapshots: number;
  } {
    const current = this.memorySnapshots[this.memorySnapshots.length - 1]?.memory || {
      rss: 0, heapUsed: 0, heapTotal: 0, external: 0, arrayBuffers: 0
    };

    const peak = this.memorySnapshots.reduce((peak, snapshot) => ({
      rss: Math.max(peak.rss, snapshot.memory.rss),
      heapUsed: Math.max(peak.heapUsed, snapshot.memory.heapUsed),
      heapTotal: Math.max(peak.heapTotal, snapshot.memory.heapTotal),
      external: Math.max(peak.external, snapshot.memory.external),
      arrayBuffers: Math.max(peak.arrayBuffers, snapshot.memory.arrayBuffers)
    }), { rss: 0, heapUsed: 0, heapTotal: 0, external: 0, arrayBuffers: 0 });

    return {
      current,
      peak,
      snapshots: this.memorySnapshots.length
    };
  }

  // Display methods
  displayTimingReport(verbose: boolean = false): void {
    const report = this.getTimingReport();

    console.log(chalk.blue('\n⏱️  Performance Timing Report'));
    console.log(chalk.blue('━'.repeat(40)));
    console.log(chalk.gray(`Total Operations: ${report.operations.length}`));
    console.log(chalk.gray(`Total Time: ${this.formatDuration(report.total)}`));
    console.log(chalk.gray(`Average Time: ${this.formatDuration(report.average)}`));

    if (verbose && report.operations.length > 0) {
      console.log(chalk.blue('\nDetailed Timings:'));
      report.operations.slice(0, 10).forEach((op, index) => {
        const duration = this.formatDuration(op.duration || 0);
        console.log(chalk.gray(`${index + 1}. ${op.name}: ${duration}`));
      });

      if (report.operations.length > 10) {
        console.log(chalk.gray(`... and ${report.operations.length - 10} more operations`));
      }
    }
  }

  displayMemoryReport(): void {
    this.takeMemorySnapshot(); // Take current snapshot
    const report = this.getMemoryReport();

    console.log(chalk.blue('\n💾 Memory Usage Report'));
    console.log(chalk.blue('━'.repeat(40)));
    console.log(chalk.gray(`Current RSS: ${this.formatBytes(report.current.rss)}`));
    console.log(chalk.gray(`Current Heap: ${this.formatBytes(report.current.heapUsed)} / ${this.formatBytes(report.current.heapTotal)}`));
    console.log(chalk.gray(`Peak RSS: ${this.formatBytes(report.peak.rss)}`));
    console.log(chalk.gray(`Peak Heap: ${this.formatBytes(report.peak.heapUsed)}`));
    console.log(chalk.gray(`External: ${this.formatBytes(report.current.external)}`));
    console.log(chalk.gray(`Array Buffers: ${this.formatBytes(report.current.arrayBuffers)}`));
  }

  // Reset methods
  clearTimings(): void {
    this.timings.clear();
    this.completedTimings = [];
  }

  clearMemorySnapshots(): void {
    this.memorySnapshots = [];
    this.takeMemorySnapshot(); // Keep current snapshot
  }

  clearAll(): void {
    this.clearTimings();
    this.clearMemorySnapshots();
  }

  // Utility formatters
  private formatDuration(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(2)}μs`;
    } else if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${size.toFixed(1)} ${sizes[i]}`;
  }
}

// Decorator for automatic timing
export function timed(name?: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const timerName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function(...args: any[]) {
      const monitor = PerformanceMonitor.getInstance();
      return monitor.timeAsync(timerName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-monitoring for common operations
export class AutoMonitor {
  private static isEnabled = false;

  static enable(): void {
    if (this.isEnabled) return;
    this.isEnabled = true;

    // Monitor memory every 30 seconds
    setInterval(() => {
      performanceMonitor.takeMemorySnapshot();
    }, 30000);

    // Monitor process events
    process.on('beforeExit', () => {
      if (process.env.DEBUG || process.env.PERFORMANCE_REPORT) {
        performanceMonitor.displayTimingReport(true);
        performanceMonitor.displayMemoryReport();
      }
    });
  }

  static disable(): void {
    this.isEnabled = false;
  }
}

// Performance-aware axios interceptor
export function setupPerformanceInterceptors(axiosInstance: any): void {
  axiosInstance.interceptors.request.use((config: any) => {
    const monitor = PerformanceMonitor.getInstance();
    const requestId = `${config.method?.toUpperCase()} ${config.url}`;
    monitor.startTimer(`api_${requestId}`, { url: config.url, method: config.method });
    config.metadata = { requestId };
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response: any) => {
      const monitor = PerformanceMonitor.getInstance();
      const requestId = response.config.metadata?.requestId;
      if (requestId) {
        monitor.stopTimer(`api_${requestId}`);
      }
      return response;
    },
    (error: any) => {
      const monitor = PerformanceMonitor.getInstance();
      const requestId = error.config?.metadata?.requestId;
      if (requestId) {
        monitor.stopTimer(`api_${requestId}`);
      }
      return Promise.reject(error);
    }
  );
}
interface PerformanceMetrics {
  pageLoadTime: number;
  totalVideosLoaded: number;
  pagesLoaded: number;
  scrollRestorationTime?: number;
  lastFetchTime?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'development';

  startMetric(key: string) {
    if (!this.enabled) return;
    performance.mark(`${key}-start`);
  }

  endMetric(key: string): number | null {
    if (!this.enabled) return null;

    try {
      performance.mark(`${key}-end`);
      performance.measure(key, `${key}-start`, `${key}-end`);
      const measure = performance.getEntriesByName(key)[0];
      return measure?.duration || null;
    } catch (error) {
      console.warn(`Performance measurement failed for ${key}:`, error);
      return null;
    }
  }

  recordMetric(category: string, data: Partial<PerformanceMetrics>) {
    if (!this.enabled) return;

    const existing = this.metrics.get(category) || {
      pageLoadTime: 0,
      totalVideosLoaded: 0,
      pagesLoaded: 0,
    };

    this.metrics.set(category, { ...existing, ...data });
  }

  getMetrics(category: string): PerformanceMetrics | null {
    return this.metrics.get(category) || null;
  }

  logMetrics(category: string) {
    if (!this.enabled) return;

    const metrics = this.metrics.get(category);
    if (!metrics) return;

    console.group(`Performance Metrics: ${category}`);
    console.table(metrics);
    console.groupEnd();
  }

  clearMetrics(category?: string) {
    if (category) {
      this.metrics.delete(category);
    } else {
      this.metrics.clear();
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
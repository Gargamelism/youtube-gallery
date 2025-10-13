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

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  startMetric(key: string) {
    if (!this.enabled) return;
    if (typeof performance === 'undefined' || !performance.mark) return;
    performance.mark(`${key}-start`);
  }

  endMetric(key: string): number | null {
    if (!this.enabled) return null;
    if (typeof performance === 'undefined' || !performance.mark || !performance.measure) return null;

    try {
      performance.mark(`${key}-end`);
      performance.measure(key, `${key}-start`, `${key}-end`);
      const entries = performance.getEntriesByName(key, 'measure');
      const measure = entries[entries.length - 1] as PerformanceEntry | undefined;
      const duration = measure?.duration || null;

      // Cleanup to prevent memory growth and name collisions
      performance.clearMarks(`${key}-start`);
      performance.clearMarks(`${key}-end`);
      performance.clearMeasures(key);

      return duration;
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
    const metrics = this.metrics.get(category);
    return metrics ? { ...metrics } : null;
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
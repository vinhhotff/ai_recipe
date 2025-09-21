import { useEffect, useRef, useState, useCallback } from 'react';

// Performance monitoring hook
export function usePerformanceMonitor() {
  const metricsRef = useRef<{
    renderCount: number;
    renderTimes: number[];
    memoryUsage: number[];
  }>({
    renderCount: 0,
    renderTimes: [],
    memoryUsage: [],
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      metricsRef.current.renderCount++;
      metricsRef.current.renderTimes.push(renderTime);
      
      // Keep only last 100 render times
      if (metricsRef.current.renderTimes.length > 100) {
        metricsRef.current.renderTimes = metricsRef.current.renderTimes.slice(-100);
      }
      
      // Track memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metricsRef.current.memoryUsage.push(memory.usedJSHeapSize);
        
        // Keep only last 50 memory readings
        if (metricsRef.current.memoryUsage.length > 50) {
          metricsRef.current.memoryUsage = metricsRef.current.memoryUsage.slice(-50);
        }
      }
    };
  });

  const getMetrics = useCallback(() => {
    const { renderCount, renderTimes, memoryUsage } = metricsRef.current;
    
    const avgRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length 
      : 0;
    
    const avgMemoryUsage = memoryUsage.length > 0
      ? memoryUsage.reduce((sum, usage) => sum + usage, 0) / memoryUsage.length
      : 0;

    return {
      renderCount,
      avgRenderTime,
      avgMemoryUsage,
      lastRenderTime: renderTimes[renderTimes.length - 1] || 0,
    };
  }, []);

  return { getMetrics };
}

// Lazy loading hook with Intersection Observer
export function useLazyLoad<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoaded) {
            setIsVisible(true);
            setHasLoaded(true);
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin: '50px', // Load 50px before element comes into view
        threshold: 0.1,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasLoaded]);

  return { ref, isVisible, hasLoaded };
}

// Image optimization hook
export function useImageOptimization() {
  const [supportedFormats, setSupportedFormats] = useState<{
    webp: boolean;
    avif: boolean;
  }>({
    webp: false,
    avif: false,
  });

  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
    };

    const checkAVIFSupport = async () => {
      return new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
      });
    };

    setSupportedFormats({
      webp: checkWebPSupport(),
      avif: false, // Will be set asynchronously
    });

    checkAVIFSupport().then((avifSupported) => {
      setSupportedFormats(prev => ({ ...prev, avif: avifSupported }));
    });
  }, []);

  const getOptimizedImageUrl = useCallback((
    baseUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    } = {}
  ) => {
    const { width, height, quality = 85, format = 'auto' } = options;
    
    // If using a CDN service like Cloudinary, ImageKit, etc.
    if (baseUrl.includes('cloudinary.com')) {
      let transformations = [];
      
      if (width) transformations.push(`w_${width}`);
      if (height) transformations.push(`h_${height}`);
      transformations.push(`q_${quality}`);
      
      // Auto format selection based on browser support
      if (format === 'auto') {
        if (supportedFormats.avif) {
          transformations.push('f_avif');
        } else if (supportedFormats.webp) {
          transformations.push('f_webp');
        } else {
          transformations.push('f_auto');
        }
      } else {
        transformations.push(`f_${format}`);
      }
      
      return baseUrl.replace('/upload/', `/upload/${transformations.join(',')}/`);
    }
    
    // For other services or custom CDN
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    params.set('q', quality.toString());
    
    if (format === 'auto') {
      if (supportedFormats.avif) {
        params.set('format', 'avif');
      } else if (supportedFormats.webp) {
        params.set('format', 'webp');
      }
    } else {
      params.set('format', format);
    }
    
    return `${baseUrl}?${params.toString()}`;
  }, [supportedFormats]);

  return { supportedFormats, getOptimizedImageUrl };
}

// Bundle size monitoring
export function useBundleAnalytics() {
  const [bundleInfo, setBundleInfo] = useState<{
    chunkCount: number;
    totalSize: number;
    largestChunk: string;
  } | null>(null);

  useEffect(() => {
    // This would integrate with your build system to get bundle info
    // For now, we'll simulate the data
    if (process.env.NODE_ENV === 'development') {
      setBundleInfo({
        chunkCount: 8,
        totalSize: 2.1 * 1024 * 1024, // 2.1MB
        largestChunk: 'react-vendor',
      });
    }
  }, []);

  return bundleInfo;
}

// Code splitting utilities
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <React.Suspense 
      fallback={fallback ? React.createElement(fallback) : <div>Loading...</div>}
    >
      <LazyComponent {...props} />
    </React.Suspense>
  );
}

// Performance timing hook
export function usePerformanceTiming() {
  const [timings, setTimings] = useState<{
    navigationStart: number;
    domContentLoaded: number;
    loadComplete: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
  } | null>(null);

  useEffect(() => {
    const getTimings = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      let fcp = 0;
      let lcp = 0;
      
      // Get First Contentful Paint
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) fcp = fcpEntry.startTime;
      
      // Get Largest Contentful Paint
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        lcp = lastEntry.startTime;
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Set timings after a delay to ensure all metrics are captured
      setTimeout(() => {
        setTimings({
          navigationStart: navigation.navigationStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
          firstContentfulPaint: fcp,
          largestContentfulPaint: lcp,
        });
        observer.disconnect();
      }, 3000);
    };

    if (document.readyState === 'complete') {
      getTimings();
    } else {
      window.addEventListener('load', getTimings);
      return () => window.removeEventListener('load', getTimings);
    }
  }, []);

  return timings;
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    
    // Update every 10 seconds
    const interval = setInterval(updateMemoryInfo, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const getMemoryUsagePercentage = useCallback(() => {
    if (!memoryInfo) return 0;
    return (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
  }, [memoryInfo]);

  return { memoryInfo, getMemoryUsagePercentage };
}

// Resource preloading hook
export function useResourcePreload() {
  const preloadResource = useCallback((url: string, type: 'script' | 'style' | 'image' | 'font') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    
    switch (type) {
      case 'script':
        link.as = 'script';
        break;
      case 'style':
        link.as = 'style';
        break;
      case 'image':
        link.as = 'image';
        break;
      case 'font':
        link.as = 'font';
        link.crossOrigin = 'anonymous';
        break;
    }
    
    document.head.appendChild(link);
  }, []);

  const preloadCriticalResources = useCallback(() => {
    // Preload critical fonts
    preloadResource('/fonts/inter-var.woff2', 'font');
    
    // Preload critical images
    preloadResource('/images/hero-bg.webp', 'image');
    
    // Preload critical API data
    if (typeof window !== 'undefined') {
      fetch('/api/health', { method: 'HEAD' }).catch(() => {
        // Silently fail if API is not available
      });
    }
  }, [preloadResource]);

  useEffect(() => {
    preloadCriticalResources();
  }, [preloadCriticalResources]);

  return { preloadResource };
}

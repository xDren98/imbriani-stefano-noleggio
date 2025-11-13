(() => {
  try {
    const nav = performance.getEntriesByType('navigation')[0]
    if (nav) {
      const ttfb = nav.responseStart
      const domContentLoaded = nav.domContentLoadedEventEnd
      const load = nav.loadEventEnd
      console.log('[PERF]', { ttfb, domContentLoaded, load })
    }
    if ('PerformanceObserver' in window) {
      try {
        const po = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              console.log('[PERF] LCP', entry.startTime)
            }
            if (entry.entryType === 'first-input') {
              console.log('[PERF] FID', entry.processingStart - entry.startTime)
            }
          }
        })
        po.observe({ type: 'largest-contentful-paint', buffered: true })
        po.observe({ type: 'first-input', buffered: true })
      } catch (_) {}
    }
  } catch (_) {}
})()


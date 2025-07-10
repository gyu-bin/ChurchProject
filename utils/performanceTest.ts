export type MemoryInfo = {
  usedJSHeapSize?: number; // optional for safety
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
};

export class PerformanceTest {
  private startTimes: Record<string, number> = {};

  startTest(testName: string) {
    console.log(`🚀 Starting performance test: ${testName}`);
    this.startTimes[testName] = Date.now();
    console.time(testName);
  }

  endTest(testName: string) {
    console.timeEnd(testName);
    const startTime = this.startTimes[testName];
    const duration = startTime ? Date.now() - startTime : 0;
    console.log(`✅ Performance test completed: ${testName}`);
    console.log(`⏱️ Duration: ${duration}ms`);

    // FPS는 측정 불가
    const fps: number | undefined = undefined;
    console.log(`🎯 FPS: ${fps ?? 'N/A'}`);

    return { duration, fps };
  }

  measureRenderTime(componentName: string, renderFunction: () => void) {
    this.startTest(`${componentName}_render`);
    renderFunction();
    return this.endTest(`${componentName}_render`);
  }

  measureMemoryUsage(): MemoryInfo | null {
    console.log(`💾 Memory usage: Not supported in Expo Managed Workflow`);
    return null;
  }
}

export const performanceTest = new PerformanceTest();

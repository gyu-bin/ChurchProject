declare module 'react-native-performance' {
  export class Performance {
    start(testName: string): void;
    end(testName: string): number;
    getMemoryInfo(): any;
  }
}

declare module 'react-native-fps-counter' {
  export class FPSCounter {
    start(): void;
    getFPS(): number;
  }
} 
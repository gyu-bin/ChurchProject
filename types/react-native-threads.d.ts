declare module 'react-native-threads' {
  export class Thread {
    constructor(scriptPath: string);
    onmessage: (message: any) => void;
    postMessage(message: any): void;
  }
} 
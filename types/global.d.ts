declare module '*.css';

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isRabby?: boolean;
      isHahaWallet?: boolean;
      isBackpack?: boolean;
      request: (args: { method: string; params?: any[] | Record<string, any> }) => Promise<any>;
      on: (event: string, listener: (...args: any[]) => void) => void;
      removeListener: (event: string, listener: (...args: any[]) => void) => void;
      [key: string]: any;
    };
    phantom?: {
      ethereum?: {
        request: (args: { method: string; params?: any[] | Record<string, any> }) => Promise<any>;
        on: (event: string, listener: (...args: any[]) => void) => void;
        removeListener: (event: string, listener: (...args: any[]) => void) => void;
        [key: string]: any;
      };
    };
    backpack?: {
      ethereum?: {
        request: (args: { method: string; params?: any[] | Record<string, any> }) => Promise<any>;
        on: (event: string, listener: (...args: any[]) => void) => void;
        removeListener: (event: string, listener: (...args: any[]) => void) => void;
        [key: string]: any;
      };
    };
  }
}
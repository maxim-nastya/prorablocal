// This file provides TypeScript definitions for environment variables
// to prevent build errors when `tsc` is run.

// By adding this, we tell TypeScript that a global 'process' object exists
// with an 'env' property, which is what Vite's `define` config simulates.
// This prevents the "Cannot find name 'process'" error during the tsc build step.
// FIX: Changed from redeclaring `process` to augmenting `NodeJS.ProcessEnv`.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
    }
  }
}

// An empty export is needed to treat this file as a module and allow global augmentation.
export {};

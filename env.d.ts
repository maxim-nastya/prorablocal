// This file provides TypeScript definitions for environment variables
// to prevent build errors when `tsc` is run.

declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY: string;
  }
}

// This file provides TypeScript definitions for environment variables
// to prevent build errors when `tsc` is run.

// Fix for "Cannot redeclare block-scoped variable 'process'".
// Augment the existing NodeJS.ProcessEnv interface instead of redeclaring the 'process' variable.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}

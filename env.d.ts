// This file provides a global type definition for the `process` object
// to prevent TypeScript errors during the `tsc` build step. Vite's `define`
// config makes `process.env.API_KEY` available in the client code, and this
// declaration makes TypeScript aware of its type.

// FIX: To avoid the "Cannot redeclare block-scoped variable 'process'" error,
// this file is updated to augment the existing NodeJS.ProcessEnv interface instead of
// redeclaring the global 'process' variable. This is a common and safe fix for
// type conflicts when @types/node is present in the project.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}

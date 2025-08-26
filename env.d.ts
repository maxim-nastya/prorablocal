// This file provides a global type definition for the `process` object
// to prevent TypeScript errors during the `tsc` build step. Vite's `define`
// config makes `process.env.API_KEY` available in the client code, and this
// declaration makes TypeScript aware of its type.

// FIX: Replaced `declare var process` with namespace augmentation to avoid redeclaration errors.
// This correctly merges the API_KEY type into the existing `process.env` definition.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}

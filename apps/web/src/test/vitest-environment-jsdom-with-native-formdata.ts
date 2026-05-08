/**
 * Custom Vitest environment: extends jsdom but restores node-native
 * FormData / File / Blob after jsdom overwrites them.
 *
 * jsdom replaces these globals with its own implementations. When tests use
 * MSW's node interceptor, the interceptor creates a native node `Request`
 * whose constructor only recognises the undici (node-native) `FormData` as a
 * multipart body. jsdom's FormData serialises as `text/plain` instead.
 *
 * We capture the native constructors before the jsdom environment sets up and
 * restore them immediately after, so all tests see the proper Web API types
 * while still running in a jsdom DOM context.
 */

import { builtinEnvironments } from 'vitest/environments';

const jsdomEnv = builtinEnvironments.jsdom;

// Capture native Web API constructors before jsdom replaces them.
// This module is loaded in the worker process where these are still native.
const NativeFormData = globalThis.FormData;
const NativeFile = globalThis.File;
const NativeBlob = globalThis.Blob;

export default {
  ...jsdomEnv,
  name: 'jsdom-with-native-formdata',
  async setup(global: typeof globalThis, options: Record<string, unknown>) {
    const env = await jsdomEnv.setup(global, options);

    // Restore native constructors that jsdom just overwrote.
    if (NativeFormData) {
      Object.defineProperty(global, 'FormData', {
        value: NativeFormData,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (NativeFile) {
      Object.defineProperty(global, 'File', {
        value: NativeFile,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (NativeBlob) {
      Object.defineProperty(global, 'Blob', {
        value: NativeBlob,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    return env;
  },
} satisfies import('vitest').Environment;

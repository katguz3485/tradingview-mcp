// Test-process-only interception; the shipped CLI never imports this file.
import { pineFetchFixture } from './pine-fetch.js';
globalThis.fetch = pineFetchFixture;

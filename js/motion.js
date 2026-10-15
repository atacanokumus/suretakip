/**
 * Motion animation library (https://motion.dev), loaded as an ES module from a
 * CDN - same approach the Firebase modules use, so no build step is needed.
 *
 * Everything goes through this one file so the version is pinned in a single
 * place. To upgrade, change the URL below; to drop the CDN dependency later,
 * vendor the bundle and point the export at the local copy.
 *
 * Usage:
 *   import { animate, inView, stagger } from './motion.js';
 *   animate('#card', { opacity: [0, 1], y: [8, 0] }, { duration: 0.25 });
 */

export * from "https://cdn.jsdelivr.net/npm/motion@12.43.0/+esm";

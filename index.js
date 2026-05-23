/**
 * FileBridge
 * A lightweight JavaScript library for bridging browser localStorage
 * and portable data files.
 *
 * https://github.com/Patrick-W-McMahon/filebridge
 */

export { default } from './src/FileBridge.js';
export { default as FileBridge } from './src/FileBridge.js';
export { default as LocalStore } from './src/localStore.js';
export { buildHeader, parseHeader, validateHeader, migrateData } from './src/headerParser.js';

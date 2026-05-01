#!/usr/bin/env node
/**
 * Post-install script that applies local patches to node_modules.
 * These patches fix issues with native addon loading in restricted environments.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const patches = [
  {
    name: 'node-datachannel ESM wrapper',
    path: 'node_modules/node-datachannel/dist/esm/lib/node-datachannel.mjs',
    apply() {
      const content = `// -- Shims --
import cjsUrl from 'node:url';
import cjsPath from 'node:path';
import cjsModule from 'node:module';
const __filename = cjsUrl.fileURLToPath(import.meta.url);
const __dirname = cjsPath.dirname(__filename);
const require = cjsModule.createRequire(import.meta.url);

let nodeDataChannel;
try {
  nodeDataChannel = require("../../../build/Release/node_datachannel.node");
} catch (err) {
  const errorCode = err && err.code;
  if (errorCode === 'ERR_DLOPEN_DISABLED' || errorCode === 'ERR_DLOPEN_FAILED') {
    console.warn('node-datachannel: native addon unavailable, WebRTC peer connections will be disabled');
    nodeDataChannel = {
      PeerConnection: class {
        constructor() {
          throw new Error('WebRTC is not available: native datachannel addon is disabled');
        }
      },
      RtcpReceivingSession: class {},
      Video: class {},
      Audio: class {},
    };
  } else {
    throw err;
  }
}

export { nodeDataChannel as default };
`;
      writeFileSync(join(rootDir, this.path), content, 'utf8');
      console.log(`[patch] Applied ${this.name}`);
    },
  },
  {
    name: 'node-datachannel CJS wrapper',
    path: 'node_modules/node-datachannel/dist/cjs/lib/node-datachannel.cjs',
    apply() {
      const content = `'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

let nodeDataChannel;
try {
  nodeDataChannel = require("../../../build/Release/node_datachannel.node");
} catch (err) {
  const errorCode = err && err.code;
  if (errorCode === 'ERR_DLOPEN_DISABLED' || errorCode === 'ERR_DLOPEN_FAILED') {
    console.warn('node-datachannel: native addon unavailable, WebRTC peer connections will be disabled');
    nodeDataChannel = {
      PeerConnection: class {
        constructor() {
          throw new Error('WebRTC is not available: native datachannel addon is disabled');
        }
      },
      RtcpReceivingSession: class {},
      Video: class {},
      Audio: class {},
    };
  } else {
    throw err;
  }
}

exports.default = nodeDataChannel;
`;
      writeFileSync(join(rootDir, this.path), content, 'utf8');
      console.log(`[patch] Applied ${this.name}`);
    },
  },
];

let applied = 0;
let skipped = 0;

for (const patch of patches) {
  try {
    patch.apply();
    applied++;
  } catch (err) {
    console.warn(`[patch] Skipped ${patch.name}: ${err.message}`);
    skipped++;
  }
}

console.log(`[patch] Done: ${applied} applied, ${skipped} skipped`);

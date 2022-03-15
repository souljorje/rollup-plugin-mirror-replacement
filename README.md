# rollup-plugin-mirror-replacement

[npm-badge]: https://img.shields.io/npm/v/rollup-plugin-mirror-replacement?color=blue
[npm-url]: https://www.npmjs.com/package/rollup-plugin-mirror-replacement

[![npm-badge][npm-badge]][npm-url]
[![libera manifesto](https://img.shields.io/badge/libera-manifesto-lightgrey.svg)](https://liberamanifesto.com)

A Rollup plugin which allows to replace files in external dependency with local files.

## Usage

### Basic example

1. Initialize plugin

```js
// rollup.config.js
export default {
  plugins: [
    mirrorReplacementPlugin({
      packages: ['@foo/bar'], // ./node_modules/@foo/bar
    }),
  ]
}
```

2. Create file with same route as in mirrored package
3. Now you file is used instead of original
4. Export everything from mirrored file then write your extensions/overrides after, [ecma specs](https://262.ecma-international.org/6.0/#sec-getexportednames) allows to override.

```js
// ./src/baz.js
export * from '@foo/bar/baz';

export const someValue = 'My custom value which will be used instead of original';
```

### Vite & vue@2

```js
// vite.config.js

import { defineConfig, mergeConfig } from 'vite';
import { vueComponentNormalizer, vueHotReload } from 'vite-plugin-vue2';
import mirrorReplacementPlugin from './build/plugins/mirrorReplacement.mjs';
export default ({ command }) => {
    const isBuild = command === 'build';
    return defineConfig({
        plugins: [
            mirrorReplacementPlugin({
                logLevel: isBuild ? 'info' : 'silent',
                packages: ['@foo/bar'], // ./node_modules/@foo/bar
                exclude: [vueComponentNormalizer, vueHotReload], // https://github.com/underfin/vite-plugin-vue2/blob/940ec45a3fd68bd9ba1b1a8808d96e6cbce13207/src/index.ts#L16
                extensions: ['js', 'vue', 'mjs'],
            }),
        ]
    });
}
```

## Options

| Name | Type | Default | Description |
| ---- | ----- | ------ | ----------- |
| packages (**required**) | `string[]` | `undefined` | Names of mirrored packages |
| rootDir | `string` | `process.cwd()` | Project root dir |
| srcDir | `string` | `'./src'` | Project source dir **relative to rootDir** |
| extensions | `string[]` | `['js', 'mjs']` | File extensions affected by plugin |
| include | `string | RegExp | string|RegExp[]` | `undefined` | Used to filter imports (e.g. virtual files). See [createFilter](https://github.com/rollup/plugins/tree/master/packages/pluginutils#createfilter) from Rollup plugin utils. |
| exclude | `string | RegExp | string|RegExp[]` | `undefined` | Used to filter imports (e.g. virtual files). See [createFilter](https://github.com/rollup/plugins/tree/master/packages/pluginutils#createfilter) from Rollup plugin utils. |
| logLevel | `string` | `'silent'` | Logs about replacements if not `'silent'` |

## Limitations ⚠️

1. Mirrored package must not be bundled in runtime
2. Overridden variable can be used only in imports, but locally it won't be overridden.

Example:

```js
// ./node_modules/@foo/bar/baz.js
export const name = 'John';

export function logName() {
  console.log(name);
}

// ./node_modules/@foo/bar/lib.js
import { name } from './baz';

export function sayHi() {
  console.log('Hello, ', name);
}

// ./src/baz.js (used instead of ./node_modules/@foo/bar/baz.js)
export * from '@foo/bar/baz';

export const name = 'Bob';

// ./src/index.js
import { sayHi } from '@foo/bar/lib';
import { logName } from './baz';

sayHi() // 'Bob' (export is overridden)
logName() // 'John' (local variable can't be overridden)

```

The only way 'fix' it is to copy/paste needed part in your mirror file:

```js

// ./src/baz.js (used instead of ./node_modules/@foo/bar/baz.js)
export * from '@foo/bar/baz';

export const name = 'Bob';

export function logName() {
  console.log(name);
}

// ./src/index.js
import { sayHi } from '@foo/bar/lib';
import { logName } from './baz';

sayHi() // 'Bob' (export is overridden)
logName() // 'Bob' (now also overridden)
```

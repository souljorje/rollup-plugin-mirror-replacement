/**
 * - watch for new files
 * - cover non-js/vue files ?
 * - "failed to load sourcemap issue" https://github.com/nuxt/vite/issues/198
 * - publish as NPM package
 * - use Rollup plugin utils (i.e. filter)
 */

import { createRequire } from 'module';
import path from 'path';

import { createFilter, normalizePath } from '@rollup/pluginutils';
import glob from 'glob';
import { vueComponentNormalizer, vueHotReload } from 'vite-plugin-vue2';

import { baseDir, rootDir, logFactory } from '../utils.mjs';

const require = createRequire(import.meta.url);

const NAMESPACE = 'mirror-replacement';

const log = logFactory(`${NAMESPACE}`);

/**
 * @param {{logLevel: string = 'silent', entries: string[], extensions: string[] = ['js', 'mjs'] }} options
 */
function mirrorReplacement({
    logLevel = 'silent',
    include,
    exclude,
    packages,
    extensions = ['js', 'mjs'],
} = {}) {
    const cache = {};
    const filter = createFilter(include, exclude);
    const importers = packages.map((v) => normalizePath(path.dirname(require.resolve(v))));
    const importersRegex = new RegExp(`^(${importers.join('|')})(.*)`);
    const validate = (source, importer) => (
        // ensure if
        // importer is defined
        importer
         // imported file is not vite stuff https://github.com/underfin/vite-plugin-vue2/blob/940ec45a3fd68bd9ba1b1a8808d96e6cbce13207/src/index.ts#L16
         && source !== vueComponentNormalizer
         && source !== vueHotReload
         // importer is specified by user
         && filter(importer)
    );
    const globExtensions = extensions.join(',');
    return {
        name: `rollup-plugin-${NAMESPACE}`,
        enforce: 'pre',
        async resolveId(source, importer) {
            if (!validate(source, importer)) return null;

            const filePath = normalizePath(path.resolve(path.dirname(importer), source));

            if (cache[filePath]) return cache[filePath];

            const relativeFilePath = filePath.replace(importersRegex, (match, importRoot, importPath) => `.${importPath}`);
            const localFilePath = normalizePath(path.resolve(baseDir, relativeFilePath));

            if (filePath === localFilePath) return null;

            const extname = path.extname(localFilePath);
            const globPattern = extname
                ? localFilePath
                : `{${
                    [
                        `${localFilePath}.{${globExtensions}}`,
                        `${localFilePath}/index.{${globExtensions}}`,
                    ].join(',')
                }}`;

            const localFilePathWithExt = glob.sync(globPattern)?.[0];

            if (!localFilePathWithExt) return null;

            cache[filePath] = localFilePathWithExt;

            if (logLevel !== 'silent') {
                if (localFilePathWithExt) {
                    log('info', `${filePath.replace(rootDir, '')} 🔄 ${localFilePathWithExt.replace(rootDir, '')}`);
                }
            }

            return normalizePath(localFilePathWithExt);
        },
    };
}

export default mirrorReplacement;

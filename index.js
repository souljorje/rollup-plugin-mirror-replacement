/**
 * - watch for new files
 */

 import { createRequire } from 'module';
 import path from 'path';
 
 import { createFilter, normalizePath } from '@rollup/pluginutils';
 import glob from 'glob';
 
 const require = createRequire(import.meta.url);
 
 const NAMESPACE = 'mirror-replacement';
 
 function mirrorReplacement({
     logLevel = 'silent',
     include,
     exclude,
     packages,
     rootDir: passedRootDir,
     srcDir: passedSrcDir = './src',
     extensions = ['js', 'mjs'],
 } = {}) {
     const rootDir = passedRootDir || process.cwd();
     const srcDir = path.resolve(rootDir, passedSrcDir);
     const cache = {};
     const filter = createFilter(include, exclude);
     const importers = packages.map((v) => normalizePath(path.dirname(require.resolve(v))));
     const importersRegex = new RegExp(`^(${importers.join('|')})(.*)`);
     const validate = (source, importer) => (importer && filter(source) && importersRegex.test(importer));
     const globExtensions = extensions.join(',');
     return {
         name: `rollup-plugin-${NAMESPACE}`,
         async resolveId(source, importer) {
             if (!validate(source, importer)) return null;
 
             const filePath = normalizePath(path.resolve(path.dirname(importer), source));
 
             if (cache[filePath]) return cache[filePath];
 
             const relativeFilePath = filePath.replace(importersRegex, (match, importRoot, importPath) => `.${importPath}`);
             const localFilePath = normalizePath(path.resolve(srcDir, relativeFilePath));
 
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
                     console.info(`${NAMESPACE}: .${filePath.replace(rootDir, '')} 🔄 .${localFilePathWithExt.replace(rootDir, '')}`);
                 }
             }
 
             return normalizePath(localFilePathWithExt);
         },
     };
 }
 
 export default mirrorReplacement;
 
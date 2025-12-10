const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const fs = require('fs');
const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const rnwPath = fs.realpathSync(
  path.resolve(require.resolve('react-native-windows/package.json'), '..'),
);

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */

const debuggerUiPath = path.resolve(
  __dirname,
  'node_modules',
  '@react-native-community',
  'cli-debugger-ui',
  'build',
  'ui',
);

const serveDebuggerUi = (req, res) => {
  const pathWithQuery = req.url.replace('/debugger-ui/', '');
  const relativePath = pathWithQuery.split('?')[0];
  const filePath = path.join(debuggerUiPath, relativePath);
  if (!fs.existsSync(filePath)) {
    return false;
  }

  let contentType = 'application/octet-stream';
  if (filePath.endsWith('.js')) {
    contentType = 'application/javascript';
  } else if (filePath.endsWith('.map')) {
    contentType = 'application/json';
  } else if (filePath.endsWith('.html')) {
    contentType = 'text/html';
  }

  res.setHeader('Content-Type', contentType);
  fs.createReadStream(filePath).pipe(res);
  return true;
};

const config = {
  resolver: {
    blockList: exclusionList([
      // This stops "react-native run-windows" from causing the metro server to crash if its already running
      new RegExp(
        `${path.resolve(__dirname, 'windows').replace(/[/\\]/g, '/')}.*`,
      ),
      // This prevents "react-native run-windows" from hitting: EBUSY: resource busy or locked, open msbuild.ProjectImports.zip or other files produced by msbuild
      new RegExp(`${rnwPath}/build/.*`),
      new RegExp(`${rnwPath}/target/.*`),
      /.*\.ProjectImports\.zip/,
    ]),
  },
  server: {
    enhanceMiddleware: middleware => {
      return (req, res, next) => {
        if (req.url.startsWith('/debugger-ui/')) {
          const served = serveDebuggerUi(req, res);
          if (served) {
            return;
          }
        }
        return middleware(req, res, next);
      };
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    // This fixes the 'missing-asset-registry-path` error (see https://github.com/microsoft/react-native-windows/issues/11437)
    assetRegistryPath: 'react-native/Libraries/Image/AssetRegistry',
  },
  serializer: {
    // Ensure source maps are generated
    getModulesRunBeforeMainModule: () => [],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

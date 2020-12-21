// Configuration for your app
// https://quasar.dev/quasar-cli/quasar-conf-js

const appPaths = require('./config/app-paths.js')
const envParser = require('./config/envparser.js')

module.exports = function (ctx) {
  return {
    supportTS: true,

    preFetch: false,

    // Quasar looks for *.js files by default
    sourceFiles: {
      router: 'src/router/index.ts',
      store: 'src/store/index.ts'
    },
    
    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://quasar.dev/quasar-cli/cli-documentation/boot-files
    boot: [
      'ai',
      'i18n',
      'axios',
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-css
    css: [
      'app.sass'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v4',
      'fontawesome-v5',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
      'material-icons-outlined'
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-framework
    framework: {
      iconSet: 'material-icons', // Quasar icon set
      lang: 'de', // Quasar language pack

      // Possible values for "all":
      // * 'auto' - Auto-import needed Quasar components & directives
      //            (slightly higher compile time; next to minimum bundle size; most convenient)
      // * false  - Manually specify what to import
      //            (fastest compile time; minimum bundle size; most tedious)
      // * true   - Import everything from Quasar
      //            (not treeshaking Quasar; biggest bundle size; convenient)
      all: 'auto',

      components: [],
      directives: [],

      // Quasar plugins
      plugins: [
        'Notify', 
        'Loading',
        'SessionStorage'
      ]
    },

    // https://quasar.dev/quasar-cli/cli-documentation/supporting-ie
    supportIE: true,

    // Full list of options: https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-build
    build: {
      scopeHoisting: true,
      publicPath: process.env.APP_PUBLIC_PATH || '',
      vueRouterMode: 'history', // available values: 'hash', 'history'
      showProgress: true,
      gzip: false,
      analyze: false,
      devtool: 'source-map',
      // Options below are automatically set depending on the env, set them if you want to override
      // preloadChunks: false,
      // extractCSS: false,

      env: envParser(),

      // https://quasar.dev/quasar-cli/cli-documentation/handling-webpack
      uglifyOptions: {
        minimize: true,        
        compress: {
          warnings: false, // warn about potentially dangerous optimizations/code
          sequences: true,  // join consecutive statemets with the “comma operator”
          properties: true,  // optimize property access: a["foo"] → a.foo
          dead_code: true,  // discard unreachable code
          drop_debugger: true,  // discard “debugger” statements
          unsafe: true, // some unsafe optimizations (see below)
          conditionals: true,  // optimize if-s and conditional expressions
          comparisons: true,  // optimize comparisons
          evaluate: true,  // evaluate constant expressions
          booleans: true,  // optimize boolean expressions
          loops: true,  // optimize loops
          unused: true,  // drop unused variables/functions
          hoist_funs: true,  // hoist function declarations
          hoist_vars: true, // hoist variable declarations
          if_return: true,  // optimize if-s followed by return/continue
          join_vars: true,  // join var declarations
          side_effects: true,  // drop side-effect-free statements
        }
      },

      // https://quasar.dev/quasar-cli/cli-documentation/handling-webpack
      extendWebpack(cfg) {
        cfg.module.rules.push({
          enforce: 'pre',
          test: /\.(js|ts|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules|quasar)/,
          options: {
            formatter: require('eslint').CLIEngine.getFormatter('stylish')
          }
        });
        cfg.resolve.alias = {
          ...cfg.resolve.alias,
          '@': appPaths.srcDir,
        }
      },

      chainWebpack (chain, { isServer, isClient }) {

        // chain.optimization.get('splitChunks').cacheGroups.vendors.name = (_module, chunks) => {
        //   const allChunksNames = chunks.map((item) => item.name).join('~')
        //   if (allChunksNames) return 'vendor'
        //   else return false
        // }

        const PreloadWebpackPlugin = require('preload-webpack-plugin');
        chain
          .plugin('preload-webpack')
          .use(PreloadWebpackPlugin, [
            {
              rel: 'preload',
              as(entry) {
                if (/\.css$/.test(entry)) return 'style';
                if (/\.woff2?$/.test(entry)) return 'font';
                if (/\.png$/.test(entry)) return 'image';
                return 'script';
              },
              include: 'allAssets',
              fileWhitelist: [/(app|vendor).+\.(css|woff2?|js)$/i],
            }
          ])

        const CopyWebpackPlugin = require('copy-webpack-plugin');
        chain
          .plugin('copy-webpack')
          .use(CopyWebpackPlugin, [
            {
              patterns: [{
                from: appPaths.resolve.src('statics'),
                to: 'statics'
              }]
            }
          ])
          
      }
    },

    // Full list of options: https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-devServer
    devServer: {
      https: true,
      //port: 8080,
      open: false, // opens browser window automatically
    },

    // animations: 'all', // --- includes all animations
    // https://quasar.dev/options/animations
    animations: [],

    // https://quasar.dev/quasar-cli/developing-ssr/configuring-ssr
    ssr: {
      pwa: false
    },

    // https://quasar.dev/quasar-cli/developing-pwa/configuring-pwa
    pwa: {
      workboxPluginMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      workboxOptions: {}, // only for GenerateSW
      manifest: {
        name: 'CRM Admin',
        short_name: 'CRM Admin',
        description: 'A free and beautiful Quasar template for CRM.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#027be3',
        icons: [
          {
            'src': 'statics/icons/icon-128x128.png',
            'sizes': '128x128',
            'type': 'image/png'
          },
          {
            'src': 'statics/icons/icon-192x192.png',
            'sizes': '192x192',
            'type': 'image/png'
          },
          {
            'src': 'statics/icons/icon-256x256.png',
            'sizes': '256x256',
            'type': 'image/png'
          },
          {
            'src': 'statics/icons/icon-384x384.png',
            'sizes': '384x384',
            'type': 'image/png'
          },
          {
            'src': 'statics/icons/icon-512x512.png',
            'sizes': '512x512',
            'type': 'image/png'
          }
        ]
      }
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
      id: 'org.cordova.quasar.app'
    },


    // Full list of options: https://quasar.dev/quasar-cli/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-electron-apps/configuring-electron
    electron: {
      bundler: 'packager', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options

        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',

        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'crm_admin'
      },

      // More info: https://quasar.dev/quasar-cli/developing-electron-apps/node-integration
      nodeIntegration: true,

      extendWebpack (cfg) {
        // do something with Electron main process Webpack cfg
        // chainWebpack also available besides this extendWebpack
      }
    }
  }
}

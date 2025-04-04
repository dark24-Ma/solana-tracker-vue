const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: '/',
  productionSourceMap: false,
  devServer: {
    historyApiFallback: true,
    allowedHosts: 'all',
    host: '0.0.0.0',
    port: 6608
  },
  configureWebpack: {
    output: {
      filename: '[name].[hash].js'
    }
  },
  chainWebpack: config => {
    config.plugin('copy')
      .tap(args => {
        const patterns = [
          ...(args[0].patterns || []), 
          { 
            from: 'netlify.toml',
            to: './' 
          },
          { 
            from: '_redirects',
            to: './' 
          }
        ];
        
        args[0] = { patterns };
        return args;
      });
  }
})

module.exports = {
  mode: "development",
  entry: "./src/demo/index.ts",
  output: {
    filename: "index.js",
  },
  module: {
    rules: [
      {
        test: /.ts$/,
        use: "ts-loader",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  devServer: {
    contentBase: [`${__dirname}/public`, `${__dirname}/fixture`],
    port: 8080,
    open: true,
  },
}

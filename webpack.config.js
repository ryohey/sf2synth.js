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
    static: [
      {
        directory: `${__dirname}/public`,
      },
      {
        directory: `${__dirname}/fixture`,
      },
    ],
    port: 8080,
    open: true,
  },
}

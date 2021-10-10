const path = require("path")

module.exports = {
  mode: "development",
  entry: path.join(__dirname, "src/index.ts"),
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
    static: {
      directory: path.join(__dirname, "public"),
    },
    port: 8080,
    open: true,
  },
}

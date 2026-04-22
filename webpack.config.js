const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const {EsbuildPlugin} = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

module.exports = (env, argv) => {
    const isPro = argv.mode === "production";
    const plugins = [
        new MiniCssExtractPlugin({
            filename: "index.css",
        }),
        new CopyPlugin({
            patterns: [
                {from: "src/i18n/", to: "i18n/"},
                {from: "offline-desmos/", to: "offline-desmos/"},
                {from: "icon.png", to: "./"},
                {from: "preview.png", to: "./"},
                {from: "plugin.json", to: "./"},
                {from: "README*.md", to: "./"},
            ],
        })
    ];
    
    if (isPro) {
        plugins.push(new webpack.BannerPlugin({
            banner: () => {
                return fs.readFileSync("LICENSE").toString();
            },
        }));
        plugins.push(new ZipPlugin({
            filename: "package.zip",
            algorithm: "gzip",
            include: [/index\.js$/, /index\.css$/, /i18n\//, /offline-desmos\//, /icon\.png$/, /preview\.png$/, /plugin\.json$/, /README.*\.md$/],
        }));
    }

    return {
        mode: argv.mode || "development",
        watch: !isPro,
        devtool: isPro ? false : "eval",
        output: {
            filename: "index.js",
            path: path.resolve(__dirname),
            libraryTarget: "commonjs2",
            library: {
                type: "commonjs2",
            },
        },
        externals: {
            siyuan: "siyuan",
        },
        entry: "./src/index.ts",
        optimization: {
            minimize: isPro,
            minimizer: [
                new EsbuildPlugin(),
            ],
        },
        resolve: {
            extensions: [".ts", ".scss", ".js", ".json"],
        },
        module: {
            rules: [
                {
                    test: /\.ts(x?)$/,
                    include: [path.resolve(__dirname, "src")],
                    use: [
                        {
                            loader: "esbuild-loader",
                            options: {
                                target: "es6",
                            }
                        },
                    ],
                },
                {
                    test: /\.scss$/,
                    include: [path.resolve(__dirname, "src")],
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: "css-loader",
                        },
                        {
                            loader: "sass-loader",
                        },
                    ],
                }
            ],
        },
        plugins,
    };
};

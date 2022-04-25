import { terser } from "rollup-plugin-terser";
import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';
import rollupGitVersion from 'rollup-plugin-git-version';

let plugin = require('../package.json');
let plugin_name = plugin.name.replace("@gegeweb/", "").replace("machine-", "");

let input = plugin.module;
let output = {
    file: "dist/" + plugin_name + ".js",
    format: "umd",
    sourcemap: true,
    name: plugin_name,

};

let plugins = [
    resolve(),
    commonJS({
        include: '../node_modules/**'
    }),
    rollupGitVersion()
];

export default [
    //** "leaflet-routing-openroute.js" **//
    {
        input: input,
        output: output,
        plugins: plugins,
    },

    //** "leaflet-routing-openroute.min.js" **//
    {
        input: input,
        output: Object.assign({}, output, {
            file: "dist/" + plugin_name + ".min.js"
        }),
        plugins: plugins.concat(terser()),
    }
];
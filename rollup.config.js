import typescript from '@wessberg/rollup-plugin-ts';
import commonjs from "rollup-plugin-commonjs";
import external from "rollup-plugin-peer-deps-external";
import resolve from "rollup-plugin-node-resolve";
import postcss from 'rollup-plugin-postcss'
import babel from 'rollup-plugin-babel';

import pkg from "./package.json";

export default {
  input: "src/index.tsx",
  output: {
    dir: 'build',
    format: 'cjs',
  },
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    typescript(),
    babel({
      sourceMaps: true,
      extensions: [
        '.ts',
        '.tsx'
      ]
    }),
    postcss(),
    external(),
    resolve(),
    commonjs({
      include: ["node_modules/**"],
      namedExports: {
        "node_modules/react/react.js": [
          "Children",
          "Component",
          "PropTypes",
          "createElement"
        ],
        "node_modules/react-dom/index.js": ["render"]
      }
    })
  ]
};
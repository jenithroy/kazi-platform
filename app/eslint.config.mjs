import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Static files served as they are (includes MediaPipe's compiled loader, public/mediapipe), not source to lint.
    "public/**",
  ]),
  // The embroidery digitizer (/digitizer) is ported from the Kazi operations app, which is React 18 without the React Compiler. It is
  // tested end to end, but its hooks read and write refs during render and set state in effects in places the three React Compiler
  // rules below flag. Rewriting a 70 KB working hook to please them is not worth the risk, so they are off for its files only.
  {
    files: ["components/Digitizer/**/*.{js,jsx}", "lib/digitizer/**/*.{js,jsx,mjs}", "lib/embroidery/**/*.{js,jsx,mjs}"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;

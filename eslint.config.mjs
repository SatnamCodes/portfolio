import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-next registers the jsx-a11y plugin but enables only a handful of rules.
  { rules: jsxA11y.flatConfigs.recommended.rules },
  {
    // R3F is imperative by design: Three.js objects from useThree/useMemo are mutated in effects
    // and useFrame. The React Compiler immutability rule can't model that.
    files: ["components/three/**"],
    rules: { "react-hooks/immutability": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;

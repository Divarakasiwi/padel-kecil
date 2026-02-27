import baseConfig from "./eslint.config.mjs";

const stage1Config = [
  ...baseConfig,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default stage1Config;

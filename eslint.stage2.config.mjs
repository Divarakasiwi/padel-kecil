import stage1Config from "./eslint.stage1.config.mjs";

const stage2Config = [
  ...stage1Config,
  {
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
];

export default stage2Config;

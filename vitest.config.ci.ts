import baseConfig from "./vitest.config";

export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    exclude: [
      "**/admin.login.test.ts",
      "**/branding.secrets.test.ts",
      "**/notification.secrets.test.ts",
      "**/trash.test.ts",
    ],
  },
};

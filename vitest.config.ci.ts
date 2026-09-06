import baseConfig from "./vitest.config";

export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    // El CI público no dispone de la base de datos, servidor local ni secretos externos.
    // Se mantienen pruebas unitarias, compartidas y de componentes reproducibles.
    include: ["client/**/*.test.ts", "client/**/*.test.tsx", "shared/**/*.test.ts"],
  },
};

import config from "../../vite.config";
import { defineConfig } from "vite";
// https://vite.dev/config/
export default defineConfig({
  ...config,
  build: {
    ...config.build,
    lib: {
      entry: ["src/jsx-dev-runtime.ts", "src/jsx-runtime.ts", "src/index.ts"],
      formats: ["es"],
      fileName: (_, entryName) => {
        return entryName + ".js";
      },
    },
  },
});

import { defineConfig } from "vitest/config";
import base from "./vitest.config.mjs";

// Alleen de live controle tegen de clubsite: `npm run parse:live`
export default defineConfig({
  ...base,
  test: { ...base.test, include: ["src/**/*.live.ts"] },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves at https://<user>.github.io/coa-dungeon-planner/
  base: "/coa-dungeon-planner/",
});

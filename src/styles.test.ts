import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stylesPath = resolve(projectRoot, "src/styles.css");
const packageJsonPath = resolve(projectRoot, "package.json");
const postcssConfigPath = resolve(projectRoot, "postcss.config.mjs");

function readCssImports(): string[] {
  const css = readFileSync(stylesPath, "utf8");

  return [...css.matchAll(/^@import\s+["']([^"']+)["'];/gm)].map(([, specifier]) => specifier);
}

describe("global CSS imports", () => {
  it("uses dev-server-resolvable Tailwind v4 and shadcn CSS imports once", () => {
    const imports = readCssImports();

    expect(imports).toEqual([
      "tailwindcss",
      "../node_modules/tw-animate-css/dist/tw-animate.css",
      "../node_modules/shadcn/dist/tailwind.css",
      "@fontsource-variable/geist",
    ]);
  });

  it("points package CSS imports at installed files instead of style-only exports", () => {
    const imports = readCssImports();
    const packageCssImports = imports.filter((specifier) =>
      specifier.startsWith("../node_modules/"),
    );

    expect(packageCssImports).toHaveLength(2);

    for (const specifier of packageCssImports) {
      expect(existsSync(resolve(projectRoot, "src", specifier))).toBe(true);
    }
  });

  it("configures Tailwind v4 through the required PostCSS plugin for Next.js", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.devDependencies).toHaveProperty("@tailwindcss/postcss");
    expect(packageJson.devDependencies).toHaveProperty("postcss");
    expect(readFileSync(postcssConfigPath, "utf8")).toContain('"@tailwindcss/postcss": {}');
  });

  it("processes the app stylesheet into Tailwind utilities instead of shipping raw directives", async () => {
    const css = readFileSync(stylesPath, "utf8");
    const result = await postcss([tailwindcss()]).process(css, { from: stylesPath });

    expect(result.css).toContain(".flex");
    expect(result.css).toContain(".bg-background");
    expect(result.css).not.toContain("@apply");
  });
});

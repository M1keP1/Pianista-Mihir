import { build } from "esbuild";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const srcDir = path.join(projectRoot, "src");
const outDir = path.join(projectRoot, ".test-dist");

async function findTests(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findTests(full)));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

async function buildTests(tests) {
  if (tests.length === 0) return;

  const aliasPlugin = {
    name: "alias",
    setup(buildContext) {
      buildContext.onResolve({ filter: /^@\// }, (args) => {
        const rel = args.path.slice(2);
        if (rel === "api/pianista/generateMermaid") {
          return { path: path.join(srcDir, "hooks/mermaidPreview/__testStubs__/generateMermaid.ts") };
        }
        if (rel === "components/Inputbox/TextArea") {
          return { path: path.join(srcDir, "hooks/mermaidPreview/__testStubs__/TextArea.ts") };
        }
        return { path: path.join(srcDir, rel) };
      });
    },
  };

  await build({
    entryPoints: tests,
    outdir: outDir,
    outbase: srcDir,
    format: "cjs",
    bundle: true,
    platform: "node",
    target: ["node20"],
    sourcemap: "inline",
    plugins: [aliasPlugin],
    external: ["node:test"],
    logLevel: "silent",
    outExtension: { ".js": ".cjs" },
  });
}

async function run() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const tests = await findTests(srcDir);
  await buildTests(tests);
  const child = spawn(process.execPath, ["--test", outDir], {
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

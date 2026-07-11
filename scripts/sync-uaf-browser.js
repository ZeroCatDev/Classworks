import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const uafRoot = resolve(root, "..", "UnifiedAssignmentFormat", "implementations", "typescript", "packages", "pdf");
const sourceBundle = resolve(uafRoot, "browser-dist", "browser.js");
const sourceFont = resolve(uafRoot, "assets", "NotoSansSC-Regular.otf");
const sourceWasm = resolve(uafRoot, "assets", "hb-subset.wasm");
const bundleTarget = resolve(root, "src", "vendor", "uaf", "browser.js");
const fontTarget = resolve(root, "public", "uaf", "NotoSansSC-Regular.otf");
const wasmTarget = resolve(root, "public", "uaf", "hb-subset.wasm");
const manifestTarget = resolve(root, "src", "vendor", "uaf", "manifest.json");

await mkdir(dirname(bundleTarget), { recursive: true });
await mkdir(dirname(fontTarget), { recursive: true });
await copyFile(sourceBundle, bundleTarget);
await copyFile(sourceFont, fontTarget);
await copyFile(sourceWasm, wasmTarget);

const [bundle, font, wasm] = await Promise.all([readFile(bundleTarget), readFile(fontTarget), readFile(wasmTarget)]);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
await writeFile(
  manifestTarget,
  `${JSON.stringify({
    uafVersion: "1.0",
    source: "../UnifiedAssignmentFormat/implementations/typescript/packages/pdf",
    bundleSha256: sha256(bundle),
    fontSha256: sha256(font),
    wasmSha256: sha256(wasm),
  }, null, 2)}\n`,
  "utf8",
);

console.log("Synced the UAF browser bundle and font into Classworks.");

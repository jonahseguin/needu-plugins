import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../.claude-plugin/plugin.json", import.meta.url), "utf8"),
);
if (
  typeof manifest.version !== "string" ||
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)
) {
  throw new Error("Needu plugin manifest has an invalid version");
}
console.log(
  JSON.stringify({
    "X-Needu-Plugin-Host": "claude-code",
    "X-Needu-Plugin-Version": manifest.version,
  }),
);

import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const manifest = JSON.parse(await readFile(".release-please-manifest.json", "utf8"));
const generated = await readFile("src/generated/version.ts", "utf8");
const generatedVersion = /boardReadyVersion\s*=\s*"([^"]+)"/.exec(generated)?.[1];
const versions = [packageJson.version, manifest["."], generatedVersion];

if (versions.some((version) => version !== packageJson.version)) {
  throw new Error(
    `version mismatch: package=${packageJson.version} manifest=${manifest["."]} generated=${generatedVersion}`,
  );
}

if (!process.env.ALLOW_MAJOR_RELEASE && isMajorRelease(packageJson.version)) {
  throw new Error("version 1.0.0 or later requires ALLOW_MAJOR_RELEASE=true");
}

function isMajorRelease(version) {
  const major = Number(/^(\d+)\./.exec(version)?.[1] ?? "0");
  return major >= 1;
}

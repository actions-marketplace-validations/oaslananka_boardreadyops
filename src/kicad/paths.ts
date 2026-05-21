export function defaultKicadCliCandidates(): string[] {
  if (process.platform === "win32") {
    return [
      "kicad-cli",
      "C:\\Program Files\\KiCad\\10.1\\bin\\kicad-cli.exe",
      "C:\\Program Files\\KiCad\\10.0\\bin\\kicad-cli.exe",
    ];
  }
  if (process.platform === "darwin") {
    return ["/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli", "kicad-cli"];
  }
  return ["kicad-cli"];
}

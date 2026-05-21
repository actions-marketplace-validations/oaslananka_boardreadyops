export function parseKicadMajor(version: string): number | undefined {
  const match = /(\d+)\./.exec(version);
  return match ? Number(match[1]) : undefined;
}

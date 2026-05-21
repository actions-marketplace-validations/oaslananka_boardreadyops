export function pinmapFormat(file: string): "json" | "yaml" | "csv" {
  const lowered = file.toLowerCase();
  if (lowered.endsWith(".json")) {
    return "json";
  }
  if (lowered.endsWith(".csv")) {
    return "csv";
  }
  return "yaml";
}

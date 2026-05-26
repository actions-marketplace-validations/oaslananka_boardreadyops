export interface BinaryReleaseAssetOptions {
  directory?: string;
  output?: string;
  check?: boolean;
}

export interface BinaryReleaseAssetResult {
  assets: string[];
  checksumsPath: string;
  content: string;
}

export function main(argv?: string[], root?: string): Promise<void>;

export function expectedBinaryAssets(): string[];

export function prepareBinaryReleaseAssets(
  root?: string,
  options?: BinaryReleaseAssetOptions,
): Promise<BinaryReleaseAssetResult>;

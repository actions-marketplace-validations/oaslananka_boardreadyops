export interface BinaryTarget {
  id: string;
  bunTarget: string;
  asset: string;
  output: string;
}

export const BINARY_TARGETS: readonly BinaryTarget[];

export function main(argv?: string[], root?: string): Promise<void>;

export function selectBinaryTargets(argv: string[]): readonly BinaryTarget[];

export function binaryTargetForId(id: string): BinaryTarget | undefined;

export function binaryTargetIds(targets: readonly BinaryTarget[]): string[];

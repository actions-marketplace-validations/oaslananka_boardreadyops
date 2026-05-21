interface PinmapEntry {
  designator: string;
  pin: string;
  net: string;
  firmware?: string | undefined;
}

export interface PinmapDocument {
  version: 1;
  pins: PinmapEntry[];
}

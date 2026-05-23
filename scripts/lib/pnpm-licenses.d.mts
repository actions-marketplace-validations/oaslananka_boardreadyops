export type PnpmLicensePackage = {
  name: string;
  versions: string[];
  license?: string;
  homepage?: string;
  description?: string;
};

export type PnpmLicenseReport = Record<string, PnpmLicensePackage[]>;

export declare function readPnpmLicenseReport(root: string, args: string[]): Promise<PnpmLicenseReport>;

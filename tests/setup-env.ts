const githubRefKeys = ["GITHUB_REF_NAME", "GITHUB_REF_TYPE"] as const;

for (const key of githubRefKeys) {
  delete process.env[key];
}

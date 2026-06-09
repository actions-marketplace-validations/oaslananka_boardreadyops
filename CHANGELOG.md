# Changelog

All notable changes to BoardReadyOps are recorded here.

## Unreleased

## [1.4.4](https://github.com/oaslananka/boardreadyops/compare/v1.4.3...v1.4.4) (2026-06-09)


### Bug Fixes

* add --repo flag to gh workflow run in release-please to avoid dispatch failure ([3190ec0](https://github.com/oaslananka/boardreadyops/commit/3190ec0973e37c21bf4ec0ac2e19823b57b70bed))
* **ci:** use INPUT_* env vars, align Node 24, build local tarball for PRs ([b5d85ba](https://github.com/oaslananka/boardreadyops/commit/b5d85ba4c9abecfd8a81871cca71ab63f25f7103))


### Documentation

* update stale version references to v1.4.3 ([6f66c4b](https://github.com/oaslananka/boardreadyops/commit/6f66c4b0f62af264cd594f3965906c51cedf6616))


### CI

* align branch protection ruleset with live GitHub configuration ([c1eb9e3](https://github.com/oaslananka/boardreadyops/commit/c1eb9e3053a11f3e157dd10f4a32150bd51fdd75))

## [1.4.3](https://github.com/oaslananka/boardreadyops/compare/v1.4.2...v1.4.3) (2026-06-05)


### Bug Fixes

* **ci:** restore npm publish release handoff ([#120](https://github.com/oaslananka/boardreadyops/issues/120)) ([45c41a0](https://github.com/oaslananka/boardreadyops/commit/45c41a05180148a09e1a5343d5d0ebb84778aada))
* **ci:** skip floating tags for manual npm backfills ([6fcb644](https://github.com/oaslananka/boardreadyops/commit/6fcb644301c7f53b6efffc3df0a585fe2ffefd2a))
* **ci:** support historical npm backfills ([#121](https://github.com/oaslananka/boardreadyops/issues/121)) ([0975629](https://github.com/oaslananka/boardreadyops/commit/0975629a260d90e245411b24e011cf220739bb94))
* regenerate dist bundles and release history for v1.4.2 ([#112](https://github.com/oaslananka/boardreadyops/issues/112)) ([4dd98c5](https://github.com/oaslananka/boardreadyops/commit/4dd98c5c8889815378e4d85a37fded76c0965479))

## [1.4.2](https://github.com/oaslananka/boardreadyops/compare/v1.4.1...v1.4.2) (2026-06-04)


### Bug Fixes

* regenerate dist bundles and release history for v1.4.1 ([2734365](https://github.com/oaslananka/boardreadyops/commit/2734365f459a7efdc0c5082bfd31de392f46270a))

## [1.4.1](https://github.com/oaslananka/boardreadyops/compare/v1.4.0...v1.4.1) (2026-06-03)


### Bug Fixes

* restore Unreleased section in CHANGELOG.md ([1c0da85](https://github.com/oaslananka/boardreadyops/commit/1c0da8525e5de5d3dc6cd75523f82e9dc93d8f61))
* restore Unreleased section in CHANGELOG.md ([05fbc8d](https://github.com/oaslananka/boardreadyops/commit/05fbc8d347d070b4afb6a43469839679d45d98ea))
* simulate unavailable kicad-cli in gate requirement test ([c19c0fc](https://github.com/oaslananka/boardreadyops/commit/c19c0fca85b1feb0e25fc863dfe1e9e29e78ee18))
* simulate unavailable kicad-cli in gate requirement test ([69d26b5](https://github.com/oaslananka/boardreadyops/commit/69d26b5d5e5547dd9acae2b6d110521df8d521b4))


### CI

* add branch protection ruleset for main ([a21a4ef](https://github.com/oaslananka/boardreadyops/commit/a21a4efc43b4418bdb55ac7551aec511a0691d67))
* add branch protection ruleset for main ([9f0367c](https://github.com/oaslananka/boardreadyops/commit/9f0367c2cc3f8ea94e7f2bae3eb7cfe2a90a842f))
* add branch protection ruleset for main ([#107](https://github.com/oaslananka/boardreadyops/issues/107)) ([a21a4ef](https://github.com/oaslananka/boardreadyops/commit/a21a4efc43b4418bdb55ac7551aec511a0691d67))

## [1.4.0](https://github.com/oaslananka/boardreadyops/compare/v1.3.0...v1.4.0) (2026-06-03)

### Features

- **cli:** define stable JSON diagnostics contract with status and exitCode ([b90be1a](https://github.com/oaslananka/boardreadyops/commit/b90be1af705127f3e7841a948b8d466891358292))

### Bug Fixes

- align UV_VERSION in publish-npm.yml and disable prerelease in release-please-config ([c64f1e3](https://github.com/oaslananka/boardreadyops/commit/c64f1e33683ef717bf7cbac27beec6c50b4ec743))
- repair CHANGELOG Unreleased positioning and regenerate dist/docs ([b90be1a](https://github.com/oaslananka/boardreadyops/commit/b90be1af705127f3e7841a948b8d466891358292))
- repair CHANGELOG Unreleased positioning and regenerate dist/docs after release-please merge ([d83cfb4](https://github.com/oaslananka/boardreadyops/commit/d83cfb4c483c13e4db874cbd8c146d6bb15af552))
- skip kicad-plugin integration tests when plugin dir not present ([327deca](https://github.com/oaslananka/boardreadyops/commit/327decafca9614b1728a6c0ba93447fb2591784c))
- update action-inputs-docs generator source to v1.3.0 so gc passes ([aa49679](https://github.com/oaslananka/boardreadyops/commit/aa49679442cea76b993c2ca2e95d6ad6b104b30a))

### Code Refactoring

- split more-coverage.test.ts into domain-specific coverage files ([b86b10b](https://github.com/oaslananka/boardreadyops/commit/b86b10bc58afdb74cd5d36a4604b52bba23e7fec))

### CI

- **docs:** replace manual Pages deploy with actions/deploy-pages@v5.0.0 ([161e58c](https://github.com/oaslananka/boardreadyops/commit/161e58c53bde149b73da73d5ac2e065f3ab57ab9))
- pin all workflow runners from ubuntu-latest to ubuntu-24.04 ([f60294f](https://github.com/oaslananka/boardreadyops/commit/f60294f078a775a6c2c2b31d6751c339c3210895))
- remove 4 redundant workflow files consolidated into security.yml and ci.yml ([79706e5](https://github.com/oaslananka/boardreadyops/commit/79706e59a955a1d4db33670e55cf54b4b89344dd))

## [Unreleased]

## [1.3.0](https://github.com/oaslananka/boardreadyops/compare/v1.2.3...v1.3.0) (2026-06-03)

### Features

- **cli:** define stable JSON diagnostics contract with status and exitCode ([#103](https://github.com/oaslananka/boardreadyops/issues/103)) ([8147a1d](https://github.com/oaslananka/boardreadyops/commit/8147a1dddd7bb8f4684e3b95a72e8dda05448cc2))

## [1.2.3](https://github.com/oaslananka/boardreadyops/compare/v1.2.2...v1.2.3) (2026-06-03)

### Bug Fixes

- stabilize v1.2.2 release CI (dist, KiCad metadata, CHANGELOG) ([adb7bb1](https://github.com/oaslananka/boardreadyops/commit/adb7bb190ea1981a48d6ce968999355e0bb526f2))

### CI

- **ci:** add governance workflow concurrency ([b1a735e](https://github.com/oaslananka/boardreadyops/commit/b1a735ed27e81aa9f34e96ea1ccc0f0a9ed03f51)), closes [#100](https://github.com/oaslananka/boardreadyops/issues/100)

## [1.2.2](https://github.com/oaslananka/boardreadyops/compare/v1.2.1...v1.2.2) (2026-06-02)

### Bug Fixes

- stabilize v1.2.1 release automation ([#95](https://github.com/oaslananka/boardreadyops/issues/95)) ([3b493dd](https://github.com/oaslananka/boardreadyops/commit/3b493ddca01e7b01964697db66896ee7169eba13)), closes [#89](https://github.com/oaslananka/boardreadyops/issues/89)

### Documentation

- Normalize release history, generated plugin SDK API docs, and stale-doc verification ([#50](https://github.com/oaslananka/boardreadyops/issues/50)).

### CI

- Update UV_VERSION 0.9.14 to 0.11.16 ([#58](https://github.com/oaslananka/boardreadyops/issues/58)).
- Upgrade pnpm 11.1.3 to 11.3.0 ([#60](https://github.com/oaslananka/boardreadyops/issues/60)).
- Remove KiCad 9.x from integration and container matrices ([#59](https://github.com/oaslananka/boardreadyops/issues/59)).
- Enforce zizmor advisory scan by removing `continue-on-error` ([#61](https://github.com/oaslananka/boardreadyops/issues/61)).
- Extract docs Python dependencies to `docs/requirements.txt` ([#62](https://github.com/oaslananka/boardreadyops/issues/62)).

## [1.2.1](https://github.com/oaslananka/boardreadyops/compare/v1.2.0...v1.2.1) (2026-06-02)

### Bug Fixes

- **ci:** normalize compatibility matrix drift ([#82](https://github.com/oaslananka/boardreadyops/issues/82)) ([793e8ce](https://github.com/oaslananka/boardreadyops/commit/793e8cee6ac54ea438ef3f6544b5a21b01f261f7))

### Documentation

- plan docs toolchain lifecycle ([#86](https://github.com/oaslananka/boardreadyops/issues/86)) ([fe20a0e](https://github.com/oaslananka/boardreadyops/commit/fe20a0e75017df427008450893ee0f069025ea95))
- **release:** normalize release history and sdk api ([#87](https://github.com/oaslananka/boardreadyops/issues/87)) ([d5e0bad](https://github.com/oaslananka/boardreadyops/commit/d5e0badc822f899935e757bb58bdcb015ddd1744))

### Tests

- **ci:** stabilize Vitest timeout on Windows ([#81](https://github.com/oaslananka/boardreadyops/issues/81)) ([d38c8b1](https://github.com/oaslananka/boardreadyops/commit/d38c8b15aa70a50dc0b2cf55722e7e2070afec79))

## [1.2.0](https://github.com/oaslananka/boardreadyops/compare/v1.1.0...boardreadyopsv1.2.0) (2026-05-30)

### CI

- Add manual npm publish dispatch and release-tag retry paths ([11113be](https://github.com/oaslananka/boardreadyops/commit/11113be50f0d9b257321e3c54e2dff888858572b), [2132170](https://github.com/oaslananka/boardreadyops/commit/21321705df4f15c029af833b098775127a87dab6), [6b9b9e0](https://github.com/oaslananka/boardreadyops/commit/6b9b9e0d439de3c5bc657f0649bdd6698cdf2578)).
- Make npm publish retry idempotent and harden manual tag repair ([7aacbed](https://github.com/oaslananka/boardreadyops/commit/7aacbed67550e5da29d130082ec1e56194a2f205), [a791ffe](https://github.com/oaslananka/boardreadyops/commit/a791ffed7ce6dbba694c088185985dd230d2429a)).
- Add manual container publish dispatch for already-published versions ([704b2ec](https://github.com/oaslananka/boardreadyops/commit/704b2ec82794f69f69e485f9929d56e718cd3f79)).

### Documentation

- Record v1.1.0 package parity verification ([#69](https://github.com/oaslananka/boardreadyops/issues/69)).

### Dependencies

- Update knip to v6.14.2 and pin dependency versions ([#71](https://github.com/oaslananka/boardreadyops/issues/71), [3724c78](https://github.com/oaslananka/boardreadyops/commit/3724c787a953ad8653f6b37a4c87f6141bd9b366)).
- Update non-major Vitest and coverage packages to v4.1.7 ([#76](https://github.com/oaslananka/boardreadyops/issues/76)).

### Maintenance

- Refresh generated NOTICE artifacts after dependency updates ([f56bfac](https://github.com/oaslananka/boardreadyops/commit/f56bfac33ad3a633ed062c955ab526775769cfa8), [7e4cbba](https://github.com/oaslananka/boardreadyops/commit/7e4cbba3eead4c1078b2a3d16866abb85087c7aa)).

## [1.1.0](https://github.com/oaslananka/boardreadyops/compare/v1.0.2...v1.1.0) (2026-05-26)

### Features

- Add fabrication diffs in PR comments and validate the GitHub Action marketplace listing ([0d9dc32](https://github.com/oaslananka/boardreadyops/commit/0d9dc3281abe0139e2ab3113dbc6a83fe7fae817), [85a4dc7](https://github.com/oaslananka/boardreadyops/commit/85a4dc7476f904c197853143597b4297dfdc2244)).
- Add CLI fix automation, doctor diagnostics, and i18n infrastructure ([dad705b](https://github.com/oaslananka/boardreadyops/commit/dad705b24b260ec15feb4da8d25ad36e1e529f81), [514d606](https://github.com/oaslananka/boardreadyops/commit/514d606f7010539f3981bcb8f00de32ce447b015), [#21](https://github.com/oaslananka/boardreadyops/issues/21)).
- Add finding remediation metadata, gate semantics, suppressions, baselines, structured logging, notifier hooks, and multi-project workspace support ([1bca167](https://github.com/oaslananka/boardreadyops/commit/1bca1679ad5b66f61e9d093975996b36b7bc6bb9), [8c8a9bf](https://github.com/oaslananka/boardreadyops/commit/8c8a9bf38d1ce531bb05cb3b21924e640803e65e), [846357f](https://github.com/oaslananka/boardreadyops/commit/846357f58bd59ea6b36b887d7366f42abdbbbd1f), [6b10f13](https://github.com/oaslananka/boardreadyops/commit/6b10f13d9d1145220742752871ff1ad62304630e), [c535bed](https://github.com/oaslananka/boardreadyops/commit/c535bed352458b819141aafe89fc9d0e11374630), [8c27166](https://github.com/oaslananka/boardreadyops/commit/8c271668e5da3e6b268dbfd9c8c0c66171342463)).
- Add plugin SDK and loader plus the KiCad PCM editor plugin ([0589294](https://github.com/oaslananka/boardreadyops/commit/0589294b424709bfa97c14da049c7b5fd1e563c3), [96eb42a](https://github.com/oaslananka/boardreadyops/commit/96eb42a0f90aabb610f4b08914ec9629ec9206d0)).
- Add binary distribution and full container Action release pipelines ([485c25c](https://github.com/oaslananka/boardreadyops/commit/485c25c0157f568a227b348910d485f4926f79ed), [71f83b0](https://github.com/oaslananka/boardreadyops/commit/71f83b0fe8ffa0e3fd1dad1c4c2842915d2654c8)).
- Add accessible HTML reports, CycloneDX hardware SBOM output, enriched SARIF context, richer rule metadata, and manufacturing output explanations ([#20](https://github.com/oaslananka/boardreadyops/issues/20), [#31](https://github.com/oaslananka/boardreadyops/issues/31), [#17](https://github.com/oaslananka/boardreadyops/issues/17), [0773732](https://github.com/oaslananka/boardreadyops/commit/0773732d1755deac2eff5513830604fd2ee9badd), [533938c](https://github.com/oaslananka/boardreadyops/commit/533938ce475225a92b2ca61fda0c7caea00ab652)).

### Bug Fixes

- Emit configured JUnit reports ([ee4846f](https://github.com/oaslananka/boardreadyops/commit/ee4846f133eda36f69eb3e45ba67feb41d2d6875)).

### Documentation

- Add license compliance notices, structure verifier documentation, and contributing governance docs ([6087066](https://github.com/oaslananka/boardreadyops/commit/6087066b0f53a87639ca2a75dff4c55c6fd1b464), [cf14cf7](https://github.com/oaslananka/boardreadyops/commit/cf14cf7d690997c259ae500c920f35ee284fc7d3), [95852af](https://github.com/oaslananka/boardreadyops/commit/95852af2dcd6dd55f24ce826fa461028a3cb74d8)).
- Record clean consumer channel verification, reference synchronization, and copy-paste audit gates ([5667f1b](https://github.com/oaslananka/boardreadyops/commit/5667f1b5ce14dbd8888fd3e919109abc76655f51), [4efcd6d](https://github.com/oaslananka/boardreadyops/commit/4efcd6d73e2e0de15a39c745b1a67e6c7a4f9ce0), [d3e74b0](https://github.com/oaslananka/boardreadyops/commit/d3e74b08607767743bde22f90efb1e0a1a5fa58b)).

### Tests

- Align CLI version expectations, add fixture regression coverage, cover cross-platform paths, enforce docs accessibility, and add coverage and mutation gates ([90478fc](https://github.com/oaslananka/boardreadyops/commit/90478fc27f9617f1ee3821002416cfe382c30c1c), [e692578](https://github.com/oaslananka/boardreadyops/commit/e6925782e7a28fd18fae48e64d6d88338351328e), [#19](https://github.com/oaslananka/boardreadyops/issues/19), [da3a370](https://github.com/oaslananka/boardreadyops/commit/da3a370ff78498bce4b198084551ea2d16ee5504), [9446b77](https://github.com/oaslananka/boardreadyops/commit/9446b7763277dfb666429ac0dca0138c1c9d1994)).

### CI

- Enforce compatibility matrix drift, action example pinning, Node version coverage, Scorecard publishing, Trivy pin repair, binary release asset hardening, and release self-validation ([#33](https://github.com/oaslananka/boardreadyops/issues/33), [02b55c5](https://github.com/oaslananka/boardreadyops/commit/02b55c590b214c2d70692834b7d46ed3d6fbbbba), [aa52ed6](https://github.com/oaslananka/boardreadyops/commit/aa52ed6c007f96fcade6914f0467b195c4cb143e), [800feb1](https://github.com/oaslananka/boardreadyops/commit/800feb195a1850f6a49942036513e2ae85b818d3), [d8e7ac4](https://github.com/oaslananka/boardreadyops/commit/d8e7ac4b082054d8f2e2ef02a67eecb5d1e16626), [a049987](https://github.com/oaslananka/boardreadyops/commit/a04998799b5fbf3cbdc42ced1204ed6422a1818d), [8e5bdbd](https://github.com/oaslananka/boardreadyops/commit/8e5bdbd3d128c5a84caf04475392773e403a1469), [42a4a5d](https://github.com/oaslananka/boardreadyops/commit/42a4a5d396914278c1e0f9e2c3bf47cd257a7052)).

## [1.0.2](https://github.com/oaslananka/boardreadyops/compare/v1.0.1...v1.0.2) (2026-05-21)

### Maintenance

- Refresh generated artifacts and mark the CLI bundle executable ([1cdcdcf](https://github.com/oaslananka/boardreadyops/commit/1cdcdcf), [c77df5c](https://github.com/oaslananka/boardreadyops/commit/c77df5c)).
- Align release metadata for v1.0.2 ([15e7890](https://github.com/oaslananka/boardreadyops/commit/15e7890), [9210bca](https://github.com/oaslananka/boardreadyops/commit/9210bca)).

## [1.0.1](https://github.com/oaslananka/boardreadyops/compare/v1.0.0...v1.0.1) (2026-05-21)

### Maintenance

- Normalize npm package metadata and publish the v1.0.1 package correction ([2cd39e6](https://github.com/oaslananka/boardreadyops/commit/2cd39e6), [02ff84a](https://github.com/oaslananka/boardreadyops/commit/02ff84a)).

## [1.0.0](https://github.com/oaslananka/boardreadyops/releases/tag/v1.0.0) (2026-05-21)

### Added

- Initial BoardReadyOps CLI and GitHub Action release for KiCad hardware production-readiness checks.
- KiCad DRC/ERC normalization, BOM checks, pinmap validation, manufacturing checks, design sanity checks, release preflight rules, and JSON/SARIF/Markdown/JUnit report outputs.
- Node 24 GitHub Action runtime, committed CLI/action bundles, coverage gates, mutation testing, property tests, SBOM generation, Gitleaks, OSV, CodeQL, Scorecard, Trivy, and npm provenance release workflows.

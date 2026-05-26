# Changelog

## [1.1.0](https://github.com/oaslananka/boardreadyops/compare/boardreadyopsv1.0.2...boardreadyopsv1.1.0) (2026-05-26)


### Features

* **action:** diff fabrication changes in PR comments ([0d9dc32](https://github.com/oaslananka/boardreadyops/commit/0d9dc3281abe0139e2ab3113dbc6a83fe7fae817))
* **action:** validate marketplace listing ([85a4dc7](https://github.com/oaslananka/boardreadyops/commit/85a4dc7476f904c197853143597b4297dfdc2244))
* **ci:** enforce compatibility matrix ([#18](https://github.com/oaslananka/boardreadyops/issues/18)) ([be4135e](https://github.com/oaslananka/boardreadyops/commit/be4135ecc1234448a965fb63aaac10642e3dbb2c))
* **cli:** add automated fix command ([dad705b](https://github.com/oaslananka/boardreadyops/commit/dad705b24b260ec15feb4da8d25ad36e1e529f81))
* **cli:** add i18n infrastructure ([#21](https://github.com/oaslananka/boardreadyops/issues/21)) ([c254552](https://github.com/oaslananka/boardreadyops/commit/c254552cb07b6e7830f098159324a759b510ff1f))
* **cli:** expand doctor diagnostics ([514d606](https://github.com/oaslananka/boardreadyops/commit/514d606f7010539f3981bcb8f00de32ce447b015))
* **core:** add finding remediation metadata ([1bca167](https://github.com/oaslananka/boardreadyops/commit/1bca1679ad5b66f61e9d093975996b36b7bc6bb9))
* **core:** add gate semantics ([8c8a9bf](https://github.com/oaslananka/boardreadyops/commit/8c8a9bf38d1ce531bb05cb3b21924e640803e65e))
* **core:** add notifier framework ([c535bed](https://github.com/oaslananka/boardreadyops/commit/c535bed352458b819141aafe89fc9d0e11374630))
* **core:** add plugin SDK and loader ([0589294](https://github.com/oaslananka/boardreadyops/commit/0589294b424709bfa97c14da049c7b5fd1e563c3))
* **core:** add structured logging ([6b10f13](https://github.com/oaslananka/boardreadyops/commit/6b10f13d9d1145220742752871ff1ad62304630e))
* **core:** add suppressions and baselines ([846357f](https://github.com/oaslananka/boardreadyops/commit/846357f58bd59ea6b36b887d7366f42abdbbbd1f))
* **core:** support multi-project workspaces ([8c27166](https://github.com/oaslananka/boardreadyops/commit/8c271668e5da3e6b268dbfd9c8c0c66171342463))
* **kicad:** add PCM editor plugin ([96eb42a](https://github.com/oaslananka/boardreadyops/commit/96eb42a0f90aabb610f4b08914ec9629ec9206d0))
* **release:** add binary distribution pipeline ([485c25c](https://github.com/oaslananka/boardreadyops/commit/485c25c0157f568a227b348910d485f4926f79ed))
* **release:** add full container action ([71f83b0](https://github.com/oaslananka/boardreadyops/commit/71f83b0fe8ffa0e3fd1dad1c4c2842915d2654c8))
* **report:** add accessible HTML report emitter ([#20](https://github.com/oaslananka/boardreadyops/issues/20)) ([6f895fa](https://github.com/oaslananka/boardreadyops/commit/6f895fac1350bc693c9e81e17cf876b1ef7176f7))
* **report:** add CycloneDX hardware SBOM ([#31](https://github.com/oaslananka/boardreadyops/issues/31)) ([56ab82d](https://github.com/oaslananka/boardreadyops/commit/56ab82dde38efe807ac442b0b41ed5a5845b9fc7))
* **report:** enrich SARIF context ([#17](https://github.com/oaslananka/boardreadyops/issues/17)) ([3fa99fa](https://github.com/oaslananka/boardreadyops/commit/3fa99fa5d23e96e40877b884d715d536c113ebff))
* **rules:** enrich rule metadata ([0773732](https://github.com/oaslananka/boardreadyops/commit/0773732d1755deac2eff5513830604fd2ee9badd))
* **rules:** explain manufacturing outputs ([533938c](https://github.com/oaslananka/boardreadyops/commit/533938ce475225a92b2ca61fda0c7caea00ab652))


### Bug Fixes

* emit configured junit reports ([ee4846f](https://github.com/oaslananka/boardreadyops/commit/ee4846f133eda36f69eb3e45ba67feb41d2d6875))


### Documentation

* **docs:** add license compliance notices ([6087066](https://github.com/oaslananka/boardreadyops/commit/6087066b0f53a87639ca2a75dff4c55c6fd1b464))
* **docs:** document structure verifier ([cf14cf7](https://github.com/oaslananka/boardreadyops/commit/cf14cf7d690997c259ae500c920f35ee284fc7d3))
* expand contributing governance docs ([95852af](https://github.com/oaslananka/boardreadyops/commit/95852af2dcd6dd55f24ce826fa461028a3cb74d8))
* **release:** record clean consumer channel verification ([5667f1b](https://github.com/oaslananka/boardreadyops/commit/5667f1b5ce14dbd8888fd3e919109abc76655f51))
* **release:** record copy-paste audit gate ([d3e74b0](https://github.com/oaslananka/boardreadyops/commit/d3e74b08607767743bde22f90efb1e0a1a5fa58b))
* **release:** record reference synchronization gate ([4efcd6d](https://github.com/oaslananka/boardreadyops/commit/4efcd6d73e2e0de15a39c745b1a67e6c7a4f9ce0))


### Tests

* align CLI version expectation ([90478fc](https://github.com/oaslananka/boardreadyops/commit/90478fc27f9617f1ee3821002416cfe382c30c1c))
* **core:** add fixture regression corpus ([e692578](https://github.com/oaslananka/boardreadyops/commit/e6925782e7a28fd18fae48e64d6d88338351328e))
* **core:** cover cross-platform path handling ([#19](https://github.com/oaslananka/boardreadyops/issues/19)) ([5e1df7a](https://github.com/oaslananka/boardreadyops/commit/5e1df7ae1839108cabe29c225ac7052235a2fd6b))
* **docs:** enforce accessibility checks ([da3a370](https://github.com/oaslananka/boardreadyops/commit/da3a370ff78498bce4b198084551ea2d16ee5504))
* enforce coverage and mutation gates ([9446b77](https://github.com/oaslananka/boardreadyops/commit/9446b7763277dfb666429ac0dca0138c1c9d1994))


### CI

* **ci:** repair trivy action pin ([a049987](https://github.com/oaslananka/boardreadyops/commit/a04998799b5fbf3cbdc42ced1204ed6422a1818d))
* **docs:** enforce compatibility matrix drift guard ([#33](https://github.com/oaslananka/boardreadyops/issues/33)) ([37cf202](https://github.com/oaslananka/boardreadyops/commit/37cf2024d772ace790047b648cbb5dfe33e1a29f))
* enforce action example pinning ([02b55c5](https://github.com/oaslananka/boardreadyops/commit/02b55c590b214c2d70692834b7d46ed3d6fbbbba))
* fix Scorecard SARIF upload action pin ([84d77e2](https://github.com/oaslananka/boardreadyops/commit/84d77e288cf43fa1c5ea680d0d3241b38afb1110))
* publish OpenSSF Scorecard results ([800feb1](https://github.com/oaslananka/boardreadyops/commit/800feb195a1850f6a49942036513e2ae85b818d3))
* publish OpenSSF Scorecard results ([d8e7ac4](https://github.com/oaslananka/boardreadyops/commit/d8e7ac4b082054d8f2e2ef02a67eecb5d1e16626))
* **release:** add self-validation gate ([42a4a5d](https://github.com/oaslananka/boardreadyops/commit/42a4a5d396914278c1e0f9e2c3bf47cd257a7052))
* **release:** harden binary release assets ([8e5bdbd](https://github.com/oaslananka/boardreadyops/commit/8e5bdbd3d128c5a84caf04475392773e403a1469)), closes [#41](https://github.com/oaslananka/boardreadyops/issues/41)
* **security:** harden scorecard gate ([4c7f545](https://github.com/oaslananka/boardreadyops/commit/4c7f54562fc141ffcfaad9985c8e43b40c5a56a4))
* test supported Node versions ([aa52ed6](https://github.com/oaslananka/boardreadyops/commit/aa52ed6c007f96fcade6914f0467b195c4cb143e))

## 1.0.0 - 2026-05-20

### Added

- Initial BoardReadyOps CLI and GitHub Action release for KiCad hardware production-readiness checks.
- KiCad DRC/ERC normalization, BOM checks, pinmap validation, manufacturing checks, design sanity checks, release preflight rules, and JSON/SARIF/Markdown/JUnit report outputs.
- Node 24 GitHub Action runtime, committed CLI/action bundles, coverage gates, mutation testing, property tests, SBOM generation, Gitleaks, OSV, CodeQL, Scorecard, Trivy, and npm provenance release workflows.

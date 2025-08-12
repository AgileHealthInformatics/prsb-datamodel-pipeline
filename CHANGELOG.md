# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## \[Unreleased]

### Added

* Initial repository structure for `prsb-datamodel-pipeline`.
* `README.md` with detailed description of repository structure and usage.
* `CONTRIBUTING.md` with internal-only contribution guidelines.
* `CHANGELOG.md` this file
* Documentation placeholders in `docs/` covering:

  * Overview
  * JSON-to-XML conversion
  * EA import process
  * EA transformation logic
  * Export formats
* Created directory structure for:

  * `schemas/` (JSON and XML schemas)
  * `examples/` (inputs and outputs)
  * `tools/json-xml-converter-dotnet/` (with `src` and `tests`)
  * `ea-scripts/` (import, transform, and export scripts)
  * `ci/github/` (build, lint, and package workflows)
  * `build/packaging/` (packaging scripts)

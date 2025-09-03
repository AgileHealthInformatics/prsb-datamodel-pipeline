# PRSB Data Model Pipeline

## Overview

The **PRSB Data Model Pipeline** is a structured, version-controlled toolkit for working with [Professional Record Standards Body (PRSB)](https://theprsb.org/) healthcare information standards.

It provides:

* A **.NET utility** to convert PRSB JSON specifications into XML for use in modelling tools such as Sparx Enterprise Architect (EA)
* **Import scripts** for EA to bring PRSB XML models into a repository
* **Transformation scripts** for curation, enrichment, and documentation
* **Export scripts** to generate various questionnaire and interoperability formats (FHIR Questionnaire, CDISC ODM, HL7 CDA, REDCap, Lime Survey, etc.)
* Supporting **schemas**, **examples**, and **automation** to ensure consistent, high-quality output

---

## Repository Structure

```
prsb-datamodel-pipeline/
├─ README.md                # This file
├─ LICENSE                  # Project license (MIT/Apache recommended)
├─ CONTRIBUTING.md          # Guidelines for contributors
├─ CHANGELOG.md             # Version history and notable changes
│
├─ docs/                    # Documentation
│  ├─ 00-overview.md        # High-level architecture and pipeline flow
│  ├─ 10-json-to-xml.md     # JSON to XML conversion process
│  ├─ 20-ea-import.md       # EA import process and conventions
│  ├─ 30-ea-transform.md    # EA transformation logic
│  └─ 40-exporters.md       # Export formats and mappings
│
├─ schemas/                 # Schema definitions
│  ├─ prsb-json/            # Original JSON schema/specs & samples
│  └─ prsb-xml/             # XML schemas used for EA import
│
├─ Sparx EA Export/         # XMI file representations of selected contents of the repository
│  ├─ Classes/              # Classes that have been imported from external XML files
│  └─ Instances/            # Instance object representations of each standard
│
├─ examples/                # Sample data for verification
│  ├─ inputs/               # Small, versioned PRSB JSON files
│  └─ outputs/              # Expected XML outputs
│
├─ tools/
│  └─ json-xml-converter-dotnet/   # .NET utility
│     ├─ src/               # C# source code
│     ├─ tests/             # Unit/integration tests
│     └─ README.md          # Usage instructions
│
├─ ea-scripts/              # Sparx EA JScript utilities
│  ├─ import/               # PRSB XML to EA importers
│  ├─ transform/            # Transform & documentation generators
│  └─ export/               # Exporters for various formats
│     ├─ fhir-questionnaire/
│     ├─ cdisc/
│     ├─ redcap/
│     ├─ hl7-cda/
│     └─ lime-survey/
│
├─ ci/github/               # CI/CD workflows (GitHub Actions)
│  ├─ build-dotnet.yml       # Build and test .NET converter
│  ├─ lint-jscript.yml       # Lint/validate EA scripts
│  └─ package-release.yml    # Build and package releases
│
└─ build/                   # Build and packaging scripts
   └─ packaging/             # Scripts for preparing release artifacts
```

---

## Getting Started

1. **Clone the repository**:

   ```bash
   git clone https://github.com/YOUR-ORG/prsb-datamodel-pipeline.git
   cd prsb-datamodel-pipeline
   ```

2. **Build the JSON→XML converter**:

   ```bash
   cd tools/json-xml-converter-dotnet/src
   dotnet build
   ```

3. **Run the converter**:

   ```bash
   dotnet run -- -i ../../examples/inputs/sample.json -o ../../examples/outputs/sample.xml
   ```

4. **Import into EA**:

   * Open EA and run the appropriate script from `ea-scripts/import/`

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

---

## License

Distributed under the terms of the license specified in [`LICENSE`](LICENSE).

---

## Change History

See [`CHANGELOG.md`](CHANGELOG.md) for details of releases and major updates.

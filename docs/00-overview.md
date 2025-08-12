# Overview

## Purpose

The **PRSB Data Model Pipeline** provides a complete, structured workflow for transforming [Professional Record Standards Body (PRSB)](https://theprsb.org/) healthcare information standards into formats suitable for implementation, analysis, and interoperability.

It supports:

* **Standard ingestion**: Converting PRSB JSON specifications into a common XML format for modelling.
* **Curation and enrichment**: Enhancing imported models with metadata, documentation, and value sets.
* **Transformation and export**: Producing multiple target formats including FHIR Questionnaire, CDISC ODM, HL7 CDA, REDCap, and Lime Survey.
* **Version control and reproducibility**: Ensuring consistent outputs across environments and over time.

---

## Pipeline Stages

1. **JSON to XML Conversion**

   * Converts PRSB JSON specifications (including both `dataset`-wrapped and raw formats) into XML.
   * Output XML is structured to match EA import requirements.
   * Conversion logic is implemented in the `.NET` utility under `tools/json-xml-converter-dotnet`.

2. **Import into Enterprise Architect (EA)**

   * Uses EA JScript importers in `ea-scripts/import/`.
   * Builds class models representing the PRSB standard hierarchy.
   * Applies stereotypes, tagged values, and relationships.

3. **Model Transformation**

   * Scripts in `ea-scripts/transform/` enhance and annotate models.
   * Examples: adding SNOMED CT expressions, normalising stereotypes, linking to other standards.

4. **Export to Target Formats**

   * Scripts in `ea-scripts/export/` generate format-specific outputs.
   * Supports healthcare interoperability and research systems.

5. **Verification and Examples**

   * Example input/output files in `examples/` provide reference conversions.
   * Automated checks can verify transformation consistency.

---

## Key Benefits

* **Consistency**: One pipeline ensures identical transformation logic for all PRSB standards.
* **Extensibility**: Modular structure supports new formats and standards.
* **Traceability**: Version-controlled models and scripts for full auditability.
* **Interoperability**: Produces outputs aligned with common healthcare IT standards.

---

## Repository Structure Reference

See the root [`README.md`](../README.md) for a full directory tree and descriptions of all components.

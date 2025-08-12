# Exporters

## Purpose

The exporter stage of the pipeline generates implementation-ready artefacts from the transformed EA model. Each exporter targets a specific interoperability or data collection format, enabling PRSB standards to be deployed across different systems and domains.

---

## General Export Process

1. **Select Export Script**

   * Export scripts are located under `ea-scripts/export/<format>/`.
   * Each format has its own subfolder and may contain multiple scripts.

2. **Run Export Script in EA**

   * Open EA and select the transformed PRSB model package.
   * Execute the export script from the `Scripts` window or assigned EA toolbar.

3. **Review Output**

   * Validate generated output against the format's schema or specification.
   * Store generated files under `examples/outputs/` for versioning.

---

## Supported Export Formats

### 1. CDISC ODM

**Purpose:** Produce [CDISC Operational Data Model](https://www.cdisc.org/standards/foundational/odm) XML files for clinical trial data collection.

* Maps PRSB items to ODM `<ItemDef>` and `<FormDef>` elements.
* Preserves value domains and metadata.

### 2. DDI Lifecycle

**Purpose:** Generate [DDI Lifecycle](https://ddialliance.org/) XML for documenting longitudinal survey and research data.

* Outputs `<Variable>` and `<QuestionItem>` elements.
* Aligns PRSB concepts with DDI lifecycle metadata.

### 3. DDI-CDI

**Purpose:** Produce [DDI Cross-Domain Integration](https://ddialliance.org/Specification/CDI) artefacts for semantic alignment and integration.

* Exports PRSB structure as a CDI graph with entities and relationships.

### 4. FHIR Shorthand

**Purpose:** Generate [FHIR Shorthand (FSH)](https://build.fhir.org/ig/HL7/fhir-shorthand/) files for profile and extension definition.

* Converts PRSB items into FSH `Profile` and `Extension` definitions.
* Facilitates FHIR IG generation via SUSHI.

### 5. FHIR Questionnaire

**Purpose:** Produce [FHIR Questionnaire](https://www.hl7.org/fhir/questionnaire.html) resources for clinical data capture.

* Maps PRSB groups to `Group` items and PRSB items to `Question` items.
* Preserves answer options and constraints.

### 6. HL7 CDA

**Purpose:** Generate [HL7 Clinical Document Architecture](https://www.hl7.org/implement/standards/product_brief.cfm?product_id=7) XML for structured clinical documents.

* Maps PRSB concepts to CDA sections and entries.
* Preserves coded values and narrative text.

### 7. Lime Survey

**Purpose:** Create [LimeSurvey](https://www.limesurvey.org/) survey structures.

* Outputs `.lss` files containing PRSB questions and answer lists.
* Preserves skip logic and constraints where applicable.

### 8. openEHR

**Purpose:** Generate [openEHR](https://www.openehr.org/) Archetypes and Templates.

* Maps PRSB items to Archetype `ELEMENT`s and Templates.
* Preserves data types, constraints, and terminology bindings.

### 9. REDCap

**Purpose:** Produce [REDCap](https://projectredcap.org/) Data Dictionary CSV files.

* Maps PRSB concepts to REDCap field definitions.
* Preserves value labels, branching logic, and validation rules.

---

## Best Practices

* **Validate output** against official schemas or validators before deployment.
* **Version control** generated artefacts to track changes over time.
* **Keep mappings up-to-date** with PRSB standard revisions.
* **Document custom mappings** in the relevant export script README.

---

## Integration with Pipeline

Exporters are the final stage of the PRSB data model pipeline. They transform enriched EA models into deliverables that can be deployed directly into target systems or included in integration projects.

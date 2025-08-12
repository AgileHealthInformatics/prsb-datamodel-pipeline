# EA Transformation

## Purpose

The EA transformation stage enriches and restructures the imported PRSB model within **Sparx Enterprise Architect (EA)**. This step ensures that the model is ready for export into various implementation formats while also enhancing its semantic quality and usability.

---

## Goals of Transformation

* **Enrich metadata** with additional terminology references, guidance, and context.
* **Normalise structure** for consistency across all imported PRSB standards.
* **Apply modelling conventions** such as stereotypes, tagged values, and diagram layouts.
* **Prepare model** for downstream exporters (FHIR, CDISC, HL7 CDA, REDCap, Lime Survey, etc.).

---

## Transformation Scripts

Transformation scripts are stored in:

```
ea-scripts/transform/
```

Each script typically contains:

* **Header metadata**: Purpose, usage, dependencies, update history.
* **Configuration section**: Mappings, terminology settings, processing rules.
* **Main logic**: Iterates over EA elements, applies transformations, updates tagged values.
* **Validation**: Checks for missing data, incorrect stereotypes, and invalid cardinalities.

---

## Common Transformations

1. **Terminology Enrichment**

   * Adding SNOMED CT ECL expressions as tagged values.
   * Linking PRSB concepts to equivalent terms in other standards (e.g., HL7 FHIR, openEHR).

2. **Stereotype Normalisation**

   * Standardising stereotype names for groups, items, and coded value sets.
   * Ensuring stereotypes match EA MDG definitions.

3. **Metadata Augmentation**

   * Adding implementation guidance from PRSB documentation.
   * Applying usage notes and constraints.

4. **Structural Adjustments**

   * Flattening or nesting models as required for export formats.
   * Merging or splitting elements for clarity.

5. **Diagram Layout Improvements**

   * Auto-layout scripts to improve readability.
   * Grouping related elements visually.

---

## Example: Adding SNOMED CT Expressions

```javascript
// Example snippet from a JScript transformation
function addSnomedExpression(element, ecl) {
    var tv = element.TaggedValues.AddNew("SNOMED_ECL", ecl);
    tv.Update();
    element.TaggedValues.Refresh();
}
```

---

## Best Practices

* **Work in a copy** of the model to avoid overwriting clean imports.
* **Apply transformations in sequence** to ensure dependencies are respected.
* **Use consistent naming** for tagged values to simplify exporter logic.
* **Document mappings** between PRSB and external standards.

---

## Integration with Pipeline

The transformation stage connects **EA import** with the **exporters**. After transformation, the EA model is semantically enriched, structurally normalised, and ready for generation into multiple technical formats.

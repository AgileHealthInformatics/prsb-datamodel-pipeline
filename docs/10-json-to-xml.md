# JSON to XML Conversion

## Purpose

The JSON to XML conversion stage transforms **PRSB JSON standard specifications** into an XML format optimised for import into Sparx Enterprise Architect (EA) and compatible with downstream processing in the pipeline.

This conversion ensures:

* Structural fidelity to the original PRSB specification
* Compatibility with EA's class model import requirements
* Consistent representation of concepts, value domains, and metadata across all standards

---

## Input Formats Supported

The converter can parse both:

1. **Wrapped format**: JSON object with a `dataset` property containing the array of dataset items.

   ```json
   {
     "dataset": [ { ... }, { ... } ]
   }
   ```
2. **Raw array format**: Array of dataset items directly at the root.

   ```json
   [ { ... }, { ... } ]
   ```

Both formats are mapped to the `StandardSpec` and `DatasetItem` types defined in `Model.cs`.

---

## Conversion Logic

The **.NET converter** located in `tools/json-xml-converter-dotnet/src` performs the following steps:

1. **Load JSON**

   * Uses `JsonLoader` to parse input and detect format type.
2. **Map to Object Model**

   * Deserialises into `StandardSpec` (wrapped format) or wraps dataset items into a `StandardSpec` (raw array format).
3. **Transform to XML**

   * Uses `XmlTransformer` to walk the object model and build an XML representation.
   * Creates `<Standard>` as root, with nested `<Model>`, `<Element>`, `<TaggedValue>`, and optional `<Multimedia>` elements.
4. **Save XML**

   * Writes formatted XML to the output location.

---

## Output Structure

The generated XML has the following high-level structure:

```xml
<Standard name="..." version="..." description="...">
  <Model name="...">
    <Element name="...">
      <TaggedValue tag="...">...</TaggedValue>
      <Multimedia format="..."/>
    </Element>
  </Model>
</Standard>
```

For a detailed XML schema, see `schemas/prsb-xml/`.

---

## Usage Examples

### Single File Conversion

```bash
cd tools/json-xml-converter-dotnet/src
dotnet run -- -i ../../examples/inputs/sample.json -o ../../examples/outputs/sample.xml
```

### Batch Conversion

```bash
dotnet run -- -i ../../examples/inputs/ -o ../../examples/outputs/ --batch
```

---

## Integration with EA Import

The generated XML can be imported into EA using scripts in `ea-scripts/import/`. This builds the initial class model for further transformation and export.

---

## Maintenance

* Keep the JSON parsing logic in `JsonLoader` aligned with changes in PRSB JSON schema.
* Update `XmlTransformer` when introducing new concept types or metadata requirements.
* Validate output against the XML schema in `schemas/prsb-xml/` to ensure compatibility.

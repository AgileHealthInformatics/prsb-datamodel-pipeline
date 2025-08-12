# JSON to XML Converter (.NET)

## Overview

This **.NET utility** converts PRSB JSON standard specifications into an XML format optimised for import into Sparx Enterprise Architect (EA) and other modelling tools. It is designed to work as part of the `prsb-datamodel-pipeline` but can also be used independently.

The converter supports:

* Parsing PRSB JSON files (standard and wrapped formats)
* Mapping PRSB data model structures into equivalent XML hierarchies
* Output XML conforming to schemas stored in `schemas/prsb-xml/`
* Integration with batch processing or per-file conversion scripts

---

## Features

* **Flexible JSON parsing** – Handles both raw array and `dataset`-wrapped PRSB JSON formats.
* **Preserves structure** – Maintains hierarchy of concepts, value domains, and metadata.
* **Extensible** – Conversion logic can be updated for new PRSB standard releases.
* **Integration-ready** – XML output suitable for direct import into EA via `ea-scripts/import`.

---

## Requirements

* [.NET 6.0 SDK or later](https://dotnet.microsoft.com/en-us/download)
* Newtonsoft.Json (installed via NuGet)

---

## Usage

### Build

```bash
cd tools/json-xml-converter-dotnet/src
dotnet build
```

### Run (Single File)

```bash
dotnet run -- -i path/to/input.json -o path/to/output.xml
```

### Run (Batch Mode)

```bash
dotnet run -- -i ../../examples/inputs/ -o ../../examples/outputs/ --batch
```

Command line arguments:

* `-i`, `--input` : Path to input JSON file or directory
* `-o`, `--output` : Path to output XML file or directory
* `--batch` : Process all `.json` files in the input directory

---

## Project Structure

```
json-xml-converter-dotnet/
├─ src/                  # C# source code for converter
├─ tests/                # Unit/integration tests
└─ README.md              # This file
```

---

## Integration with Pipeline

The generated XML is designed to be imported into EA using scripts in `../../ea-scripts/import/`. Once imported, models can be transformed, annotated, and exported using the rest of the pipeline.

---

## License

Distributed under the same license as the root `prsb-datamodel-pipeline` project. See [`LICENSE`](../../LICENSE).

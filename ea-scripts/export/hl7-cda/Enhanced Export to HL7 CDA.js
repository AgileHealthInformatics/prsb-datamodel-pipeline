/**
 * =============================================================================
 * SCRIPT: Enhanced Export to HL7 CDA (Canonical Version)
 * -----------------------------------------------------------------------------
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2025-06-07
 * VERSION: 2.0
 * -----------------------------------------------------------------------------
 * PURPOSE:
 * This Enterprise Architect (EA) script exports a PRSB-derived instance model
 * into a simplified HL7 Clinical Document Architecture (CDA) XML structure.
 * It generates a CDA template with structured <section> elements, each
 * corresponding to an EA element in the model, using the Notes field for
 * descriptive narrative.
 *
 * -----------------------------------------------------------------------------
 * USAGE:
 * 1. In EA, select the root instance model element.
 * 2. Run this script from the EA scripting window.
 * 3. When prompted, select the output folder (filename is derived from model).
 * 4. Output is saved as: <ModelName>_HL7_CDA.xml
 * -----------------------------------------------------------------------------
 * DEPENDENCIES:
 * - JScript scripting in EA
 * - Windows FileSystemObject for writing output
 * -----------------------------------------------------------------------------
 */

!INC Local Scripts.EAConstants-JScript

function main() {
    Repository.ClearOutput("Script");
    Repository.CreateOutputTab("Script");
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== Exporting PRSB Model to HL7 CDA XML ===", 0);

    var element = Repository.GetTreeSelectedObject();
    if (!element || element.ObjectType != otElement) {
        Repository.WriteOutput("Script", "ERROR: Please select a valid instance model element.", 0);
        return;
    }

    var folderPath = selectOutputFolderViaFileDialog("Select output folder for HL7 CDA file");
    if (!folderPath) {
        Repository.WriteOutput("Script", "\u26A0\uFE0F Export cancelled: No folder selected.", 0);
        return;
    }

    var fileName = sanitizeFileName(element.Name) + "_HL7_CDA.xml";
    var filePath = folderPath + "\\" + fileName;

    var xml = [];
    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push('<ClinicalDocument xmlns="urn:hl7-org:v3">');
    xml.push('  <title>' + escapeXml(element.Name) + '</title>');
    xml.push('  <component>');
    xml.push('    <structuredBody>');

    buildCDASections(element, xml, 3);

    xml.push('    </structuredBody>');
    xml.push('  </component>');
    xml.push('</ClinicalDocument>');

    writeTextFile(filePath, xml.join("\n"));
    Repository.WriteOutput("Script", "\u2705 Export complete: " + filePath, 0);
}

/**
 * Recursively builds CDA <section> components from EA elements.
 */
function buildCDASections(element, xml, indentLevel) {
    var indent = Array(indentLevel + 1).join("  ");
    for (var i = 0; i < element.Elements.Count; i++) {
        var child = element.Elements.GetAt(i);
        var name = escapeXml(child.Name);
        var desc = escapeXml(trimString(child.Notes || child.Name));

        xml.push(indent + '<component>');
        xml.push(indent + '  <section>');
        xml.push(indent + '    <title>' + name + '</title>');
        xml.push(indent + '    <text>' + desc + '</text>');

        if (child.Elements.Count > 0) {
            buildCDASections(child, xml, indentLevel + 2);
        }

        xml.push(indent + '  </section>');
        xml.push(indent + '</component>');
    }
}

/**
 * Prompts user for folder using file dialog workaround.
 */
function selectOutputFolderViaFileDialog(promptText) {
    var project = Repository.GetProjectInterface();
    var dummyPath = project.GetFileNameDialog(promptText, "XML Files (*.xml)|*.xml||", 1, 0, "dummy.xml", 0);
    if (!dummyPath) return null;
    var lastSlash = dummyPath.lastIndexOf("\\");
    return lastSlash !== -1 ? dummyPath.substring(0, lastSlash) : null;
}

/**
 * Writes a string to the specified file path.
 */
function writeTextFile(path, content) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.CreateTextFile(path, true);
    file.Write(content);
    file.Close();
}

/**
 * Escapes XML-reserved characters.
 */
function escapeXml(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&apos;");
}

/**
 * Trims leading/trailing whitespace from a string.
 */
function trimString(str) {
    if (!str) return "";
    return str.replace(/^\s+|\s+$/g, "");
}

/**
 * Creates a safe filename from element name.
 */
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9\-_]/g, "_");
}

// Kick off export
main();

/**
 * =============================================================================
 * SCRIPT: Enhanced Export to CDISC ODM-XML (Canonical Version)
 * -----------------------------------------------------------------------------
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2025-06-07
 * VERSION: 4.0
 * -----------------------------------------------------------------------------
 * PURPOSE:
 * This Enterprise Architect (EA) script exports a PRSB-based instance model
 * into a simplified CDISC ODM (Operational Data Model) XML document for use
 * in clinical trials, data submissions, or interoperability tools.
 *
 * Each model element is transformed into an ODM ItemDef within a FormDef
 * structure, with field labels derived from the element Notes.
 *
 * -----------------------------------------------------------------------------
 * USAGE:
 * 1. In EA, select the root element of a PRSB instance model.
 * 2. Run this script from the EA scripting environment.
 * 3. Select the destination folder via prompt.
 * 4. The script generates a file named <ModelName>_CDISC_ODM.xml.
 * -----------------------------------------------------------------------------
 * DEPENDENCIES:
 * - Microsoft JScript engine inside EA
 * - Windows FileSystemObject for file output
 * =============================================================================
 */

!INC Local Scripts.EAConstants-JScript

function main() {
    Repository.ClearOutput("Script");
    Repository.CreateOutputTab("Script");
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== Exporting PRSB Model to CDISC ODM XML ===", 0);

    var element = Repository.GetTreeSelectedObject();
    if (!element || element.ObjectType != otElement) {
        Repository.WriteOutput("Script", "ERROR: Please select a valid instance model element.", 0);
        return;
    }

    var folderPath = selectOutputFolderViaFileDialog("Select folder to save CDISC ODM XML");
    if (!folderPath) {
        Repository.WriteOutput("Script", "\u26A0\uFE0F Export cancelled: No folder selected.", 0);
        return;
    }

    var baseName = sanitizeFileName(element.Name);
    var fileName = baseName + "_CDISC_ODM.xml";
    var filePath = folderPath + "\\" + fileName;

    var xml = [];
    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push('<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3" ODMVersion="1.3" FileType="Snapshot">');
    xml.push('  <Study OID="PRSB_Study">');
    xml.push('    <MetaDataVersion OID="v1" Name="PRSB Export" Description="PRSB model exported to CDISC ODM">');
    xml.push('      <FormDef OID="F1" Name="PRSB Form" Repeating="No">');

    buildCDISCItems(element, xml, 3);

    xml.push('      </FormDef>');
    xml.push('    </MetaDataVersion>');
    xml.push('  </Study>');
    xml.push('</ODM>');

    writeTextFile(filePath, xml.join("\n"));
    Repository.WriteOutput("Script", "\u2705 Export complete: " + filePath, 0);
}

/**
 * Recursively builds CDISC ODM ItemDefs.
 */
function buildCDISCItems(element, xml, indentLevel) {
    var indent = Array(indentLevel + 1).join("  ");
    for (var i = 0; i < element.Elements.Count; i++) {
        var child = element.Elements.GetAt(i);
        var name = sanitizeFileName(child.Name);
        var label = escapeXml(trimString(child.Notes || child.Name));

        xml.push(indent + '<ItemDef OID="' + name + '" Name="' + name + '" DataType="text">');
        xml.push(indent + '  <Question><TranslatedText xml:lang="en">' + label + '</TranslatedText></Question>');
        xml.push(indent + '</ItemDef>');

        buildCDISCItems(child, xml, indentLevel); // continue traversing
    }
}

/**
 * Uses file dialog to select folder using a dummy file trick.
 */
function selectOutputFolderViaFileDialog(promptText) {
    var project = Repository.GetProjectInterface();
    var dummyFile = project.GetFileNameDialog(promptText, "XML Files (*.xml)|*.xml||", 1, 0, "dummy.xml", 0);
    if (!dummyFile) return null;
    var lastSlash = dummyFile.lastIndexOf("\\");
    return lastSlash !== -1 ? dummyFile.substring(0, lastSlash) : null;
}

/**
 * Write content to file at given path.
 */
function writeTextFile(path, content) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.CreateTextFile(path, true);
    file.Write(content);
    file.Close();
}

/**
 * Trims whitespace from ends of a string.
 */
function trimString(str) {
    if (!str) return "";
    return str.replace(/^\s+|\s+$/g, "");
}

/**
 * Sanitises a string for filename-safe use.
 */
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9\-_]/g, "_");
}

/**
 * Escapes XML reserved characters.
 */
function escapeXml(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/\"/g, "&quot;")
               .replace(/'/g, "&apos;");
}

// Execute export
main();

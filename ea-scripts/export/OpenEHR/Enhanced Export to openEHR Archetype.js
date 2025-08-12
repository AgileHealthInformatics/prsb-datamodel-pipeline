/**
 * =============================================================================
 * SCRIPT: Enhanced Export to openEHR Archetype (Canonical Version)
 * -----------------------------------------------------------------------------
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2025-06-07
 * VERSION: 4.1
 * -----------------------------------------------------------------------------
 * PURPOSE:
 * This Enterprise Architect (EA) script exports a PRSB-derived instance model
 * to an openEHR-compatible XML archetype file. It constructs a simplified
 * openEHR archetype structure based on the element hierarchy and Notes fields.
 *
 * This version enforces:
 * - Verbose documentation and consistent formatting
 * - File output path derived from folder-only selection (no manual filename input)
 * - Element descriptions taken from EA Notes fields
 *
 * -----------------------------------------------------------------------------
 * USAGE:
 * 1. In EA, select the root element of the instance model for export.
 * 2. Run this script from the EA Scripts window.
 * 3. When prompted, select the target folder.
 * 4. The script will generate an XML file named:
 *        <ModelName>_openEHR_Archetype.xml
 * -----------------------------------------------------------------------------
 * DEPENDENCIES:
 * - Microsoft JScript engine in EA
 * - FileSystemObject for output
 * =============================================================================
 */

!INC Local Scripts.EAConstants-JScript

function main() {
    Repository.ClearOutput("Script");
    Repository.CreateOutputTab("Script");
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== Exporting PRSB Model to openEHR Archetype ===", 0);

    var element = Repository.GetTreeSelectedObject();
    if (!element || element.ObjectType != otElement) {
        Repository.WriteOutput("Script", "ERROR: Please select a valid instance model element.", 0);
        return;
    }

    var folderPath = selectOutputFolderViaFileDialog("Select folder to save openEHR Archetype");
    if (!folderPath) {
        Repository.WriteOutput("Script", "\u26A0\uFE0F Export cancelled: No folder selected.", 0);
        return;
    }

    var baseName = sanitizeFileName(element.Name);
    var fileName = baseName + "_openEHR_Archetype.xml";
    var filePath = folderPath + "\\" + fileName;

    var xml = [];
    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push('<archetype xmlns="http://www.openehr.org/">');
    xml.push('<concept>' + escapeXml(element.Name) + '</concept>');
    xml.push('<definition>');

    buildOpenEHRStructure(element, xml, 1);

    xml.push('</definition>');
    xml.push('</archetype>');

    writeTextFile(filePath, xml.join("\n"));
    Repository.WriteOutput("Script", "\u2705 Export complete: " + filePath, 0);
}

/**
 * Recursively exports child elements as nested openEHR slots.
 */
function buildOpenEHRStructure(element, xml, indentLevel) {
    var indent = Array(indentLevel + 1).join("  ");
    for (var i = 0; i < element.Elements.Count; i++) {
        var child = element.Elements.GetAt(i);
        var name = escapeXml(child.Name);
        var desc = escapeXml(trimString(child.Notes || child.Name));

        xml.push(indent + '<element name="' + name + '">');
        xml.push(indent + '  <description>' + desc + '</description>');

        if (child.Elements.Count > 0) {
            xml.push(indent + '  <children>');
            buildOpenEHRStructure(child, xml, indentLevel + 2);
            xml.push(indent + '  </children>');
        }

        xml.push(indent + '</element>');
    }
}

/**
 * Uses file dialog to get output folder (via dummy filename trick).
 */
function selectOutputFolderViaFileDialog(promptText) {
    var project = Repository.GetProjectInterface();
    var dummyFile = project.GetFileNameDialog(promptText, "XML Files (*.xml)|*.xml||", 1, 0, "dummy.xml", 0);
    if (!dummyFile) return null;
    var lastSlash = dummyFile.lastIndexOf("\\");
    return lastSlash !== -1 ? dummyFile.substring(0, lastSlash) : null;
}

/**
 * Writes a string to a file.
 */
function writeTextFile(path, content) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.CreateTextFile(path, true);
    file.Write(content);
    file.Close();
}

/**
 * Removes whitespace from both ends of a string.
 */
function trimString(str) {
    if (!str) return "";
    return str.replace(/^\s+|\s+$/g, "");
}

/**
 * Escapes special characters for XML output.
 */
function escapeXml(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/\"/g, "&quot;")
               .replace(/'/g, "&apos;");
}

/**
 * Sanitises a string for use as a safe filename.
 */
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9\-_]/g, "_");
}

// Start the export process
main();
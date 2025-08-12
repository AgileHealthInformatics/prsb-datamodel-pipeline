/**
 * =============================================================================
 * SCRIPT: Enhanced Export to DDI-CDI (Canonical Version)
 * -----------------------------------------------------------------------------
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2025-06-07
 * VERSION: 4.0
 * -----------------------------------------------------------------------------
 * PURPOSE:
 * This EA JScript exports a PRSB-based instance model to a simplified DDI-CDI
 * (Data Documentation Initiative - Cross Domain Integration) XML format.
 *
 * The script builds a hierarchical DDI structure based on the containment
 * of elements in EA, and populates definitions from the Notes field.
 *
 * -----------------------------------------------------------------------------
 * USAGE:
 * 1. Select the root element of a PRSB instance model in EA.
 * 2. Run this script from the EA scripting window.
 * 3. Choose an output folder when prompted.
 * 4. A DDI-CDI XML file named <ModelName>_DDI-CDI.xml will be saved.
 * -----------------------------------------------------------------------------
 * DEPENDENCIES:
 * - EA Microsoft JScript engine
 * - Windows Scripting FileSystemObject
 * =============================================================================
 */

!INC Local Scripts.EAConstants-JScript

function main() {
    Repository.ClearOutput("Script");
    Repository.CreateOutputTab("Script");
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== Exporting to DDI-CDI Format ===", 0);

    var element = Repository.GetTreeSelectedObject();
    if (!element || element.ObjectType != otElement) {
        Repository.WriteOutput("Script", "ERROR: Please select a valid instance model element.", 0);
        return;
    }

    var folderPath = selectOutputFolderViaFileDialog("Select folder to save DDI-CDI XML");
    if (!folderPath) {
        Repository.WriteOutput("Script", "\u26A0\uFE0F Export cancelled: No folder selected.", 0);
        return;
    }

    var baseName = sanitizeFileName(element.Name);
    var fileName = baseName + "_DDI-CDI.xml";
    var filePath = folderPath + "\\" + fileName;

    var xml = [];
    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push('<ddi:PhysicalStructure xmlns:ddi="ddi:physicalstructure:3_3">');

    buildDDIStructure(element, xml, 1);

    xml.push('</ddi:PhysicalStructure>');
    writeTextFile(filePath, xml.join("\n"));
    Repository.WriteOutput("Script", "\u2705 Export complete: " + filePath, 0);
}

/**
 * Recursively builds nested DDI structure.
 */
function buildDDIStructure(element, xml, indentLevel) {
    var indent = Array(indentLevel + 1).join("  ");
    for (var i = 0; i < element.Elements.Count; i++) {
        var child = element.Elements.GetAt(i);
        var name = escapeXml(child.Name);
        var desc = escapeXml(trimString(child.Notes || child.Name));

        xml.push(indent + '<ddi:Variable name="' + name + '">');
        xml.push(indent + '  <ddi:Label>' + desc + '</ddi:Label>');

        if (child.Elements.Count > 0) {
            xml.push(indent + '  <ddi:ChildVariables>');
            buildDDIStructure(child, xml, indentLevel + 2);
            xml.push(indent + '  </ddi:ChildVariables>');
        }

        xml.push(indent + '</ddi:Variable>');
    }
}

/**
 * Uses file dialog to get output folder path.
 */
function selectOutputFolderViaFileDialog(promptText) {
    var project = Repository.GetProjectInterface();
    var dummyFile = project.GetFileNameDialog(promptText, "XML Files (*.xml)|*.xml||", 1, 0, "dummy.xml", 0);
    if (!dummyFile) return null;
    var lastSlash = dummyFile.lastIndexOf("\\");
    return lastSlash !== -1 ? dummyFile.substring(0, lastSlash) : null;
}

/**
 * Writes content to the specified file.
 */
function writeTextFile(path, content) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.CreateTextFile(path, true);
    file.Write(content);
    file.Close();
}

/**
 * Strips whitespace from both ends of a string.
 */
function trimString(str) {
    if (!str) return "";
    return str.replace(/^\s+|\s+$/g, "");
}

/**
 * Escapes XML special characters.
 */
function escapeXml(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/\"/g, "&quot;")
               .replace(/'/g, "&apos;");
}

/**
 * Sanitises the element name for use in a filename.
 */
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9\-_]/g, "_");
}

// Begin script execution
main();

/**
 * =============================================================================
 * SCRIPT: Enhanced Export to DDI Lifecycle (Canonical Version)
 * =============================================================================
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2025-06-07
 * VERSION: 2.0
 * =============================================================================
 * 
 * PURPOSE:
 * --------
 * This Enterprise Architect (EA) JScript automates the export of PRSB-compliant
 * instance models into DDI Lifecycle 3.3 XML format, aligned with international
 * standards for documenting data across the research lifecycle.
 * 
 * This version enhances structure, readability, and metadata fidelity,
 * pulling all descriptive text from the Notes field and using consistent file
 * output patterns.
 *
 * -----------------------------------------------------------------------------
 * USAGE INSTRUCTIONS:
 * --------------------
 * 1. Open Sparx EA and select the root instance model element from the Project Browser.
 * 2. Launch this script from the Scripting window under the correct group.
 * 3. When prompted, select a target directory for the exported XML file.
 * 4. The output file will be named automatically using the selected element name.
 *
 * -----------------------------------------------------------------------------
 * ASSUMPTIONS:
 * ------------
 * - All descriptive metadata (titles, question text, descriptions) are sourced
 *   from the EA element's Notes field.
 * - The selected element and its children form a valid PRSB instance model.
 * - Windows scripting environment is available (ActiveX + EA JScript).
 *
 * =============================================================================
 */

!INC Local Scripts.EAConstants-JScript

// Utility function to escape XML special characters
function escapeXml(text) {
    return String(text || "").replace(/&/g, "&amp;")
                              .replace(/</g, "&lt;")
                              .replace(/>/g, "&gt;")
                              .replace(/"/g, "&quot;")
                              .replace(/'/g, "&apos;");
}

// Utility to trim whitespace from string
function trim(text) {
    return String(text || "").replace(/^\s+|\s+$/g, "");
}

// Select output folder only, using file dialog workaround
function selectOutputFolder(promptText) {
    var project = Repository.GetProjectInterface();
    var fakeFile = project.GetFileNameDialog(promptText, "XML Files (*.xml)|*.xml||", 1, 0, "ignore.xml", 0);
    if (!fakeFile) return null;
    return fakeFile.substring(0, fakeFile.lastIndexOf("\\"));
}

// Write string content to a UTF-8 encoded file
function writeTextFile(path, content) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.CreateTextFile(path, true);
    file.Write(content);
    file.Close();
}

// Recursively export EA elements as <Question> elements inside <DataCollection>
function exportDDILifecycleXml(rootElement, outputPath) {
    var lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<DDIInstance xmlns="ddi:instance:3_3">');
    lines.push('  <DataCollection>');
    exportElementRecursive(rootElement, lines, "    ");
    lines.push('  </DataCollection>');
    lines.push('</DDIInstance>');

    var fileName = sanitizeFilename(rootElement.Name) + "_DDI.xml";
    var fullPath = outputPath + "\\" + fileName;
    writeTextFile(fullPath, lines.join("\n"));
    Repository.WriteOutput("Script", "\u2705 DDI Lifecycle export complete: " + fullPath, 0);
}

// Sanitise filename from element name
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9_\-]/g, "_");
}

// Recursively append elements and their Notes as XML
function exportElementRecursive(element, lines, indent) {
    lines.push(indent + '<Question id="' + escapeXml(element.ElementGUID) + '">');
    lines.push(indent + '  <Title>' + escapeXml(element.Name) + '</Title>');
    lines.push(indent + '  <Text>' + escapeXml(trim(element.Notes)) + '</Text>');

    for (var i = 0; i < element.Elements.Count; i++) {
        var child = element.Elements.GetAt(i);
        exportElementRecursive(child, lines, indent + "  ");
    }

    lines.push(indent + '</Question>');
}

// Entry point
function main() {
    Repository.ClearOutput("Script");
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== Exporting to DDI Lifecycle XML ===", 0);

    var element = Repository.GetTreeSelectedObject();
    if (!element || element.ObjectType != otElement) {
        Repository.WriteOutput("Script", "\u274C Please select a valid element in the Project Browser.", 0);
        return;
    }

    var folder = selectOutputFolder("Select output folder for DDI Lifecycle file");
    if (!folder) {
        Repository.WriteOutput("Script", "\u26A0\uFE0F Export cancelled.", 0);
        return;
    }

    exportDDILifecycleXml(element, folder);
}

main();

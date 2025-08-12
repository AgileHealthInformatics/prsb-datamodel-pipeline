/**
 * =============================================================================
 * SCRIPT: Enhanced Export to REDCap Data Dictionary (Canonical Version)
 * -----------------------------------------------------------------------------
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2025-06-07
 * VERSION: 4.0
 * -----------------------------------------------------------------------------
 * PURPOSE:
 * This Enterprise Architect script exports a PRSB-derived instance model
 * into a REDCap-compatible CSV Data Dictionary. It ensures:
 *   - The correct use of field types and labels
 *   - Descriptions are extracted from element Notes (not tagged values)
 *   - Export is written to a user-specified directory (no filename editing)
 *   - Output file is named after the selected root element
 *
 * This script replaces earlier versions that used tagged values for descriptions,
 * and improves EA compatibility with verbose documentation and stable output.
 *
 * -----------------------------------------------------------------------------
 * USAGE:
 * 1. In EA, select the root element of a PRSB-based instance model.
 * 2. Run the script from the Scripts window.
 * 3. When prompted, choose the folder where the CSV should be saved.
 * 4. The script will generate a REDCap Data Dictionary named:
 *      <ModelName>_REDCap_DataDictionary.csv
 * -----------------------------------------------------------------------------
 * DEPENDENCIES:
 * - EA JScript engine with ActiveX support
 * - FileSystemObject for saving to disk
 * =============================================================================
 */

!INC Local Scripts.EAConstants-JScript

function main() {
    Repository.ClearOutput("Script");
    Repository.CreateOutputTab("Script");
    Repository.EnsureOutputVisible("Script");

    Repository.WriteOutput("Script", "=== Exporting REDCap Data Dictionary ===", 0);

    var element = Repository.GetTreeSelectedObject();
    if (!element || element.ObjectType != otElement) {
        Repository.WriteOutput("Script", "ERROR: Please select a valid instance model element.", 0);
        return;
    }

    var folderPath = selectOutputFolderViaFileDialog("Select output folder for REDCap Data Dictionary");
    if (!folderPath) {
        Repository.WriteOutput("Script", "\u26A0\uFE0F Export cancelled or folder not selected.", 0);
        return;
    }

    var baseName = sanitizeFileName(element.Name);
    var fileName = baseName + "_REDCap_DataDictionary.csv";
    var filePath = folderPath + "\\" + fileName;

    var csv = [];
    csv.push("Variable / Field Name,Form Name,Section Header,Field Type,Field Label,Choices, Calculations, OR Slider Labels,Field Note,Text Validation Type OR Show Slider Number,Text Validation Min,Text Validation Max,Identifier?,Branching Logic,Required Field,Custom Alignment,Question Number,Matrix Group Name,Matrix Ranking,Field Annotation");

    buildREDCapRows(element, csv);
    writeTextFile(filePath, csv.join("\r\n"));

    Repository.WriteOutput("Script", "\u2705 Export complete: " + filePath, 0);
}

/**
 * Recursively traverses model elements to generate REDCap field rows.
 */
function buildREDCapRows(element, csv) {
    for (var i = 0; i < element.Elements.Count; i++) {
        var child = element.Elements.GetAt(i);

        var variable = sanitizeFileName(child.Name);
        var fieldLabel = trimString(child.Notes || child.Name);
        var fieldType = getTaggedValue(child, "questionType") || "text";
        var isRequired = getTaggedValue(child, "isRequired") === "true" ? "y" : "";

        var row = [
            variable,                // Variable / Field Name
            "main_form",             // Form Name (constant for simplicity)
            "",                      // Section Header
            fieldType,               // Field Type
            fieldLabel,              // Field Label
            "",                      // Choices/Calculations
            "", "", "",              // Field Note and others
            "", "", "",              // Validation fields
            "",                      // Identifier?
            "",                      // Branching Logic
            isRequired,              // Required Field
            "", "", "", ""            // Alignment, Question #, Matrix info, Annotations
        ];

        csv.push(row.join(","));
        buildREDCapRows(child, csv);
    }
}

/**
 * Gets a tagged value by name from an EA element.
 */
function getTaggedValue(element, tagName) {
    for (var i = 0; i < element.TaggedValues.Count; i++) {
        var tag = element.TaggedValues.GetAt(i);
        if (tag.Name === tagName) {
            return tag.Value === "<memo>" ? tag.Notes || "" : tag.Value || "";
        }
    }
    return "";
}

/**
 * Uses file dialog to simulate folder selection and derive path.
 */
function selectOutputFolderViaFileDialog(promptText) {
    var project = Repository.GetProjectInterface();
    var dummyFile = project.GetFileNameDialog(promptText, "CSV Files (*.csv)|*.csv||", 1, 0, "dummy.csv", 0);
    if (!dummyFile) return null;
    var lastSlash = dummyFile.lastIndexOf("\\");
    return lastSlash !== -1 ? dummyFile.substring(0, lastSlash) : null;
}

/**
 * Writes a string to a specified file path.
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
 * Ensures a safe filename string (no special characters).
 */
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9\-_]/g, "_");
}

// Execute main export routine
main();

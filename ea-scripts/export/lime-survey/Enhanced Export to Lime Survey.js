/**
 * =============================================================================
 * SCRIPT: Enhanced Export to LimeSurvey CSV (Canonical Version)
 * -----------------------------------------------------------------------------
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2025-06-07
 * VERSION: 4.0
 * -----------------------------------------------------------------------------
 * PURPOSE:
 * This Enterprise Architect (EA) script exports a PRSB-derived instance model
 * to a LimeSurvey-compatible CSV file. It transforms each element into a
 * question row, using the Notes field for the question text and a default
 * single-choice format (can be adapted as needed).
 *
 * This version ensures:
 * - All question text comes from the Notes field (fallback to Name)
 * - Output file saved to user-selected folder
 * - File automatically named from root element
 * - CSV formatting compatible with LimeSurvey question import
 *
 * -----------------------------------------------------------------------------
 * USAGE:
 * 1. In EA, select the root instance model element.
 * 2. Run the script from EA's script window.
 * 3. Choose a destination folder when prompted.
 * 4. A CSV file will be created named <ModelName>_LimeSurvey.csv
 * -----------------------------------------------------------------------------
 * DEPENDENCIES:
 * - Windows Scripting FileSystemObject
 * - JScript support in Enterprise Architect
 * =============================================================================
 */

!INC Local Scripts.EAConstants-JScript

function main() {
    Repository.ClearOutput("Script");
    Repository.CreateOutputTab("Script");
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== Exporting PRSB Model to LimeSurvey CSV ===", 0);

    var element = Repository.GetTreeSelectedObject();
    if (!element || element.ObjectType != otElement) {
        Repository.WriteOutput("Script", "ERROR: Please select a valid instance model element.", 0);
        return;
    }

    var folderPath = selectOutputFolderViaFileDialog("Select folder to save LimeSurvey CSV");
    if (!folderPath) {
        Repository.WriteOutput("Script", "\u26A0\uFE0F Export cancelled: No folder selected.", 0);
        return;
    }

    var baseName = sanitizeFileName(element.Name);
    var fileName = baseName + "_LimeSurvey.csv";
    var filePath = folderPath + "\\" + fileName;

    var csv = [];
    csv.push("type/answer;question;code;answers;mandatory;other;language");

    buildLimeSurveyRows(element, csv);

    writeTextFile(filePath, csv.join("\r\n"));
    Repository.WriteOutput("Script", "\u2705 Export complete: " + filePath, 0);
}

/**
 * Recursively converts elements to LimeSurvey question format.
 */
function buildLimeSurveyRows(element, csv) {
    for (var i = 0; i < element.Elements.Count; i++) {
        var child = element.Elements.GetAt(i);
        var code = sanitizeFileName(child.Name);
        var label = escapeCsv(trimString(child.Notes || child.Name));

        // Use "S" for single-choice question; extendable to detect questionType
        var row = [
            "S",                   // type/answer
            label,                 // question
            code,                  // code
            "Yes;No",             // answers (default)
            "Y",                  // mandatory
            "N",                  // other
            "en"                  // language
        ];

        csv.push(row.join(";"));
        buildLimeSurveyRows(child, csv);
    }
}

/**
 * Opens file dialog to select output folder.
 */
function selectOutputFolderViaFileDialog(promptText) {
    var project = Repository.GetProjectInterface();
    var dummyFile = project.GetFileNameDialog(promptText, "CSV Files (*.csv)|*.csv||", 1, 0, "dummy.csv", 0);
    if (!dummyFile) return null;
    var lastSlash = dummyFile.lastIndexOf("\\");
    return lastSlash !== -1 ? dummyFile.substring(0, lastSlash) : null;
}

/**
 * Writes content to disk.
 */
function writeTextFile(path, content) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.CreateTextFile(path, true);
    file.Write(content);
    file.Close();
}

/**
 * Trims whitespace.
 */
function trimString(str) {
    if (!str) return "";
    return str.replace(/^\s+|\s+$/g, "");
}

/**
 * Makes a string filename-safe.
 */
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9\-_]/g, "_");
}

/**
 * Escapes embedded semicolons or quotes for CSV.
 */
function escapeCsv(str) {
    return str.replace(/"/g, '""').replace(/;/g, ',');
}

// Launch export
main();

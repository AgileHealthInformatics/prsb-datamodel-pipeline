/**
 * =============================================================================
 * SCRIPT: Enhanced Export to FHIR Questionnaire (Canonical Final EA-Compatible)
 * -----------------------------------------------------------------------------
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2025-06-06
 * VERSION: 4.5
 * -----------------------------------------------------------------------------
 * PURPOSE:
 * This script is designed for Sparx Enterprise Architect (EA) and exports a
 * curated PRSB instance model into a valid FHIR Questionnaire formatted in JSON.
 *
 * It adheres to NHS standards for health and care records, and ensures the output
 * structure is compatible with FHIR-based systems for questionnaire data capture.
 *
 * This version includes:
 * - Full verbose comments for maintenance and understanding
 * - EA-compatible folder selection using a workaround (file dialog)
 * - Strict filename derivation from the selected element (no user filename input)
 * - Manual JSON string generation due to EA JScript limitations
 *
 * USAGE:
 * 1. In EA, select the root element of an instance model created from PRSB data.
 * 2. Run this script from the Script window.
 * 3. A folder selection dialog will appear (via a dummy file save prompt).
 * 4. The script creates a JSON file in that folder using the element name.
 *
 * DEPENDENCIES:
 * - EA JScript engine (Windows Script Host based)
 * - FileSystemObject for saving to disk
 * =============================================================================
 */

!INC Local Scripts.EAConstants-JScript

/**
 * Main entry point for the export process.
 */
function main() {
    Repository.ClearOutput("Script");
    Repository.CreateOutputTab("Script");
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== Exporting PRSB Instance Model to FHIR Questionnaire ===", 0);

    // Validate user selection
    var element = Repository.GetTreeSelectedObject();
    if (!element || element.ObjectType != otElement) {
        Repository.WriteOutput("Script", "ERROR: Please select a valid instance model element.", 0);
        return;
    }

    // Prompt user to choose a folder by tricking file dialog into returning a path
    var folderPath = selectOutputFolderViaFileDialog("Select folder to save FHIR Questionnaire");
    if (!folderPath) {
        Repository.WriteOutput("Script", "\u26A0\uFE0F Export cancelled: No folder selected.", 0);
        return;
    }

    // Generate the file name from the element
    var baseName = sanitizeFileName(element.Name);
    var fileName = baseName + "_FHIR_Questionnaire.json";
    var filePath = folderPath + "\\" + fileName;

    // Build JSON structure
    var questionnaire = {
        resourceType: "Questionnaire",
        status: "active",
        name: baseName.replace(/\s+/g, ""),
        title: element.Name,
        item: []
    };

    // Recursively populate questionnaire items
    buildItems(element, questionnaire.item);

    // Serialize and write to disk
    var output = serializeJSON(questionnaire, 0);
    writeTextFile(filePath, output);
    Repository.WriteOutput("Script", "\u2705 Export complete: " + filePath, 0);
}

/**
 * Recursively builds the FHIR 'item' array from EA model hierarchy.
 */
function buildItems(element, itemList) {
    for (var i = 0; i < element.Elements.Count; i++) {
        var child = element.Elements.GetAt(i);
        var questionType = getTaggedValue(child, "questionType") || "group";
        var fhirType = mapToFhirType(questionType);
        var isRequired = getTaggedValue(child, "isRequired") === "true";
        var helpText = getTaggedValue(child, "helpText");

        var item = {
            linkId: child.ElementID.toString(),
            text: trimString(child.Notes || child.Name),
            type: fhirType
        };

        if (isRequired) item.required = true;

        if (helpText) {
            item.extension = [{
                url: "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
                valueString: helpText
            }];
        }

        if (fhirType === "group") {
            item.item = [];
            buildItems(child, item.item);
        }

        itemList.push(item);
    }
}

/**
 * Maps PRSB questionType to FHIR-compatible item type.
 */
function mapToFhirType(questionType) {
    switch (questionType.toLowerCase()) {
        case "choice": return "choice";
        case "open-choice":
        case "autocomplete":
        case "dropdown": return "choice";
        case "textarea": return "text";
        case "boolean": return "boolean";
        case "date":
        case "datetime":
        case "integer":
        case "decimal":
        case "url":
        case "text": return "string";
        default: return "group";
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
 * Uses file dialog to extract folder path (EA workaround).
 */
function selectOutputFolderViaFileDialog(promptText) {
    var project = Repository.GetProjectInterface();
    var dummyFile = project.GetFileNameDialog(promptText, "Text Files (*.txt)|*.txt||", 1, 0, "dummy.txt", 0);
    if (!dummyFile) return null;
    var lastSlash = dummyFile.lastIndexOf("\\");
    return lastSlash !== -1 ? dummyFile.substring(0, lastSlash) : null;
}

/**
 * Writes a string to a local file using Windows Scripting Host.
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
 * Ensures filename is safe for filesystem.
 */
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9\-_]/g, "_");
}

/**
 * Recursive JSON serializer compatible with EA JScript.
 */
function serializeJSON(obj, indentLevel) {
    var indent = "  ";
    var pad = Array(indentLevel + 1).join(indent);
    if (obj === null) return "null";
    if (typeof obj === "string") {
        return '"' + obj.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    }
    if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
    if (obj instanceof Array) {
        if (obj.length === 0) return "[]";
        var items = [];
        for (var i = 0; i < obj.length; i++) {
            items.push(pad + indent + serializeJSON(obj[i], indentLevel + 1));
        }
        return "[\n" + items.join(",\n") + "\n" + pad + "]";
    }
    if (typeof obj === "object") {
        var props = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                props.push(pad + indent + '"' + key + '": ' + serializeJSON(obj[key], indentLevel + 1));
            }
        }
        return "{\n" + props.join(",\n") + "\n" + pad + "}";
    }
    return "null";
}

// Initiate script
main();

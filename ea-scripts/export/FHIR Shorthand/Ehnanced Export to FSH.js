/**
 * =============================================================================
 * SCRIPT: Export to FHIR Shorthand (FSH) Format (Corrected for SUSHI Compatibility)
 * =============================================================================
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2025-06-07
 * VERSION: 1.5
 * =============================================================================
 * 
 * PURPOSE:
 * --------
 * Exports a PRSB-based EA instance model to valid FSH for a FHIR Questionnaire
 * instance. This version corrects all syntax issues that previously caused SUSHI
 * parsing errors. The following conventions are enforced:
 *
 *   - Each item includes a `linkId`, `text`, and valid `type` field.
 *   - FHIR `code` values are prefixed with # (e.g. `#group`, `#string`).
 *   - Only group items are permitted to contain sub-items.
 *   - Item scoping follows FSH standards using `item[+]` and `item[=]`.
 *
 * USAGE:
 * ------
 * 1. Select the root EA instance element.
 * 2. Run this script to export the Questionnaire to a `.fsh` file.
 * 3. Output will be written to the selected folder using a derived filename.
 * 4. File can be compiled with SUSHI and added to an IG.
 *
 * =============================================================================
 */

!INC Local Scripts.EAConstants-JScript

function main() {
    Repository.ClearOutput("Script");
    Repository.EnsureOutputVisible("Script");
    Repository.WriteOutput("Script", "=== Exporting EA Model to FHIR Shorthand (FSH) ===", 0);

    var element = Repository.GetTreeSelectedObject();
    if (!element || element.ObjectType != otElement) {
        Repository.WriteOutput("Script", "ERROR: Please select a valid instance model element.", 0);
        return;
    }

    var folderPath = selectOutputFolderViaFileDialog("Select output folder for FSH export");
    if (!folderPath) {
        Repository.WriteOutput("Script", "\u26A0\uFE0F Export cancelled.", 0);
        return;
    }

    var instanceId = sanitizeId(element.Name.toLowerCase());
    var filePath = folderPath + "\\" + instanceId + "_Questionnaire.fsh";

    var fsh = [];
    fsh.push("Instance: " + instanceId + "-instance");
    fsh.push("InstanceOf: Questionnaire");
    fsh.push("Usage: #definition");
    fsh.push("* status = #draft");

    buildFSHItemsRecursive(element, fsh, "item", false);

    writeTextFile(filePath, fsh.join("\n"));
    Repository.WriteOutput("Script", "\u2705 FSH export complete: " + filePath, 0);
}

function buildFSHItemsRecursive(element, fsh, path, isNested) {
    for (var i = 0; i < element.Elements.Count; i++) {
        var child = element.Elements.GetAt(i);
        var linkId = sanitizeId(child.Name);
        var text = escapeFSH(trim(child.Notes || child.Name));

        var base = isNested ? path + "[=].item" : path;

        fsh.push("* " + base + "[+].linkId = \"" + linkId + "\"");
        fsh.push("* " + base + "[=].text = \"" + text + "\"");

        if (child.Elements.Count > 0) {
            fsh.push("* " + base + "[=].type = #group");
            buildFSHItemsRecursive(child, fsh, base, true);
        } else {
            fsh.push("* " + base + "[=].type = #string");
        }
    }
}

function selectOutputFolderViaFileDialog(promptText) {
    var project = Repository.GetProjectInterface();
    var dummyFile = project.GetFileNameDialog(promptText, "FSH Files (*.fsh)|*.fsh||", 1, 0, "dummy.fsh", 0);
    if (!dummyFile) return null;
    var lastSlash = dummyFile.lastIndexOf("\\");
    return lastSlash !== -1 ? dummyFile.substring(0, lastSlash) : null;
}

function writeTextFile(path, content) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.CreateTextFile(path, true);
    file.Write(content);
    file.Close();
}

function trim(str) {
    return str.replace(/^\s+|\s+$/g, "");
}

function escapeFSH(text) {
    return String(text || "").replace(/\\"/g, '\\\\"').replace(/\"/g, '\\"');
}

function sanitizeId(name) {
    return name.replace(/[^a-zA-Z0-9.-]/g, "-");
}

main();

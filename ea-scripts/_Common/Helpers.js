// -------------------------------------------------------
// Helpers.js (JScript ES3) – Common utility helpers
// Purpose: Logging, safety utilities, folder picker, CSV writer
// -------------------------------------------------------

!INC Local Scripts.EAConstants-JScript

// ---- Safety & string helpers (ES3) ----
function isNil(x) { return x === null || x === undefined; }
function trim(s) { return isNil(s) ? "" : String(s).replace(/^\s+|\s+$/g, ""); }
function equalsIgnoreCase(a, b) { return String(a||"").toLowerCase() == String(b||"").toLowerCase(); }
function startsWith(s, p) { return String(s||"").indexOf(p) === 0; }
function contains(s, sub) { return String(s||"").indexOf(sub) !== -1; }

// ---- Output tab management ----
function ensureOutputTab(name) {
    try { Repository.CreateOutputTab(name); } catch(e) {}
    try { Repository.ClearOutput(name); } catch(e) {}
    try { Repository.EnsureOutputVisible(name); } catch(e) {}
}
function log(tab, msg) { Session.Output("[" + tab + "] " + msg); }

// ---- Folder picker (directory only; no file names) ----
function browseForFolder(promptText) {
    // Shell.BrowseForFolder is reliable and does *directory only*
    var shell = new ActiveXObject("Shell.Application");
    var folder = shell.BrowseForFolder(0, promptText, 0, 0);
    if (!folder) return null;
    // Ensure plain path (Self.Path)
    return folder.Self.Path;
}

// ---- CSV writer (append; creates file on first write) ----
function CsvWriter(path) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = null;
    function openAppend() {
        // 8 = ForAppending, 2 = TristateTrue (Unicode); EA often prefers ANSI, so use default (TristateFalse=0)
        // We'll stick with default encoding for broader compatibility.
        file = fso.OpenTextFile(path, 8, true);
    }
    this.writeHeader = function(headerLine) {
        if (!file) openAppend();
        file.WriteLine(headerLine);
    };
    this.writeRow = function(arr) {
        if (!file) openAppend();
        var i, out = "";
        for (i=0; i<arr.length; i++) {
            var cell = String(arr[i]).replace(/"/g, '""');   // escape quotes
            if (contains(cell, ",") || contains(cell, "\"") ) {
                out += "\"" + cell + "\"";
            } else {
                out += cell;
            }
            if (i < arr.length - 1) out += ",";
        }
        file.WriteLine(out);
    };
    this.close = function() { if (file) file.Close(); };
}

// ---- Timing helper ----
function nowMs() { return (new Date()).getTime(); }

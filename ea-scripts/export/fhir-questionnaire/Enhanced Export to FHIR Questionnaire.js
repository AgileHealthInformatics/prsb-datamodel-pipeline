// ==================================================================================================
// FILE:        Enhanced Export to FHIR Questionnaire.js
// PROJECT:     PRISM – Sparx EA → FHIR Questionnaire (R4) Exporter
// AUTHOR:      PRISM Platform Development Team
// CREATED:     2025-09-02
// VERSION:     2.4
//
// PURPOSE
// Export a selected instance model as a **valid FHIR R4 Questionnaire**.
//
// NEW IN 2.4
// - Fix validator error: Questionnaire.url must be a real lower-case UUID URN
//   -> now uses "urn:uuid:" + uuidv4Lower()
// - Add DomainResource narrative (text.status + text.div) per best practice dom-6
//
// CARRIED FORWARD
// - Never emit empty arrays (e.g., no "item": [])
// - Only "group" when a node really has children (fixes que-1b)
// - Heuristic leaf type mapping (string/text/date/url/attachment/display)
//
// QUICK START
// 1) Select the root instance element in EA
// 2) Run this script; choose an output folder
// 3) Validate at validator.fhir.org (optionally against UK Core)
//
// ==================================================================================================

!INC Local Scripts.EAConstants-JScript

var USE_GUID_FOR_LINKID = false;   // true → ElementGUID ; false → ElementID
var DEFAULT_STATUS       = "active";
var WRITE_PRETTY_JSON    = true;

function main() {
  Repository.ClearOutput("Script");
  Repository.CreateOutputTab("Script");
  Repository.EnsureOutputVisible("Script");
  Repository.WriteOutput("Script", "=== Export to FHIR Questionnaire (v2.4) ===", 0);

  var root = Repository.GetTreeSelectedObject();
  if (!root || root.ObjectType != otElement) {
    Repository.WriteOutput("Script", "ERROR: Please select a root element (instance model).", 0);
    return;
  }

  var folderPath = selectOutputFolder("Select output folder for FHIR Questionnaire JSON");
  if (!folderPath) {
    Repository.WriteOutput("Script", "⚠️ Export cancelled (no folder selected).", 0);
    return;
  }

  var fileName = sanitizeFileName(root.Name) + "_FHIR_Questionnaire.json";
  var filePath = folderPath + "\\" + fileName;

  var q = buildQuestionnaireRoot(root);
  var items = buildItemsArray(root);
  if (items && items.length > 0) q.item = items;

  var json = stringifyJson(q, WRITE_PRETTY_JSON);
  writeTextFile(filePath, json);
  Repository.WriteOutput("Script", "✅ Export complete: " + filePath, 0);
}

// ------------------------------ BUILDERS -------------------------------------

function buildQuestionnaireRoot(e) {
	var title = safeString(e.Name, "Questionnaire");
	var desc  = firstNonEmpty(trim(e.Notes), title);

	// Use the *root* element's GUID to create a stable, valid UUID URN
	var canon = "urn:uuid:" + guidToUuidLower(e.ElementGUID);

	return {
	  resourceType: "Questionnaire",
	  id: makeLinkId(e),
	  url: canon,
	  name: sanitizeNameForCode(title),
	  title: title,
	  status: DEFAULT_STATUS,
	  date: nowIsoDate(),
	  description: desc,
	  text: {
		status: "generated",
		div: buildNarrativeDiv(title, desc)
	  }
	};
}

function buildNarrativeDiv(title, desc) {
  // XHTML namespace required; keep it simple and safe
  var t = escapeHtml(title);
  var d = escapeHtml(desc);
  return "<div xmlns=\"http://www.w3.org/1999/xhtml\">" +
         "<h1>" + t + "</h1>" +
         (d ? "<p>" + d + "</p>" : "") +
         "</div>";
}

function buildItemsArray(parent) {
  if (!parent || !parent.Elements || parent.Elements.Count == 0) return null;
  var arr = [];
  for (var i = 0; i < parent.Elements.Count; i++) {
    var child = parent.Elements.GetAt(i);
    var kids  = (child.Elements && child.Elements.Count > 0);
    var qType = mapQuestionnaireType(child, kids);

    var obj = {
      linkId: makeLinkId(child),
      text: safeString(child.Name, "Untitled"),
      type: qType
    };

    if (qType === "group") {
      var childItems = buildItemsArray(child);
      if (childItems && childItems.length > 0) {
        obj.item = childItems;
      } else {
        // degrade to a display if no children present
        obj.type = "display";
      }
    }

    pruneEmptyArrays(obj);
    arr.push(obj);
  }
  return arr.length > 0 ? arr : null;
}

// --------------------------- TYPE MAPPING ------------------------------------

function mapQuestionnaireType(e, hasKids) {
  if (hasKids) return "group";
  var n = String(e.Name || "").toLowerCase();

  if (isHeading(n)) return "display";
  if (n.indexOf("free text") !== -1) return "text";
  if (n.indexOf("date") !== -1) return "date";
  if (n.indexOf("url") !== -1 || n.indexOf("link") !== -1) return "url";
  if (n.indexOf("file") !== -1 || n.indexOf("multimedia") !== -1 || n.indexOf("multi-media") !== -1) return "attachment";
  if (n.indexOf("mime") !== -1 || n.indexOf("filename") !== -1) return "string";
  if (n.indexOf("coded value") !== -1 || n.indexOf("code") !== -1) return "string"; // upgrade later to choice
  return "string";
}

function isHeading(nLower) {
  return (
    nLower === "" ||
    nLower.indexOf("section") !== -1 ||
    nLower.indexOf("about me") !== -1 ||
    nLower.indexOf("response") !== -1 ||
    nLower.indexOf("information") !== -1
  );
}

// --------------------------- JSON UTILITIES ----------------------------------

function pruneEmptyArrays(o) {
  if (!o || typeof o !== "object") return;
  var k;
  for (k in o) {
    if (!o.hasOwnProperty(k)) continue;
    var v = o[k];
    if (isArray(v) && v.length === 0) {
      delete o[k];
    } else if (typeof v === "object") {
      pruneEmptyArrays(v);
    }
  }
}

function stringifyJson(obj, pretty) {
  return pretty ? JSONstringify(obj, 2) : JSONstringify(obj, 0);
}

function JSONstringify(value, indent) {
  var indentStr = indent ? new Array(indent+1).join(" ") : "";
  function str(key, holder, level) {
    var v = holder[key];
    if (v === null) return "null";
    var t = typeof v;
    if (t === "string")  return quote(v);
    if (t === "number")  return isFinite(v) ? String(v) : "null";
    if (t === "boolean") return v ? "true" : "false";
    if (t === "object") {
      if (isArray(v)) {
        if (v.length === 0) return "[]";
        var partial = [], i;
        for (i=0;i<v.length;i++) partial.push(str(i, v, level+1));
        if (!indent) return "[" + partial.join(",") + "]";
        return "[\n" + repeat(indentStr, level+1) + partial.join(",\n" + repeat(indentStr, level+1)) + "\n" + repeat(indentStr, level) + "]";
      } else {
        var keys=[], k;
        for (k in v) if (v.hasOwnProperty(k) && typeof v[k] !== "undefined") keys.push(k);
        if (keys.length === 0) return "{}";
        var parts=[], j;
        for (j=0;j<keys.length;j++){
          var kk = keys[j], vv = str(kk, v, level+1);
          parts.push('"' + escapeJsonString(kk) + (indent? '": ' : '":') + vv);
        }
        if (!indent) return "{" + parts.join(",") + "}";
        return "{\n" + repeat(indentStr, level+1) + parts.join(",\n" + repeat(indentStr, level+1)) + "\n" + repeat(indentStr, level) + "}";
      }
    }
    return "null";
  }
  return str("", {"": value}, 0);
}

function quote(s) { return '"' + escapeJsonString(String(s)) + '"'; }
function escapeJsonString(s) {
  return s.replace(/\\/g,"\\\\").replace(/"/g,"\\\"").replace(/\r/g,"\\r").replace(/\n/g,"\\n").replace(/\t/g,"\\t");
}
function isArray(a){ return a && typeof a.length === "number" && typeof a.splice === "function"; }
function repeat(s,n){ var r=""; for (var i=0;i<n;i++) r+=s; return r; }

// --------------------------- SMALL HELPERS -----------------------------------

function makeLinkId(e) {
  return USE_GUID_FOR_LINKID ? String(e.ElementGUID) : String(e.ElementID);
}

function sanitizeNameForCode(name) {
  return String(name||"").replace(/[^A-Za-z0-9_]/g, "_");
}

function safeString(s, fallback) {
  s = trim(String(s||""));
  return s ? s : (fallback||"");
}

function firstNonEmpty(a, b) {
  var x = trim(String(a||"")); if (x) return x;
  var y = trim(String(b||"")); if (y) return y;
  return "";
}

function nowIsoDate() {
  var d = new Date();
  var y = d.getFullYear();
  var m = d.getMonth()+1; if (m<10) m="0"+m;
  var day = d.getDate();   if (day<10) day="0"+day;
  return y + "-" + m + "-" + day;
}

function trim(s){ return String(s||"").replace(/^\s+|\s+$/g,""); }
function sanitizeFileName(n){ return String(n||"").replace(/[^A-Za-z0-9\-_\.]/g,"_"); }

// XHTML-safe (very small subset)
function escapeHtml(s){
  return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function guidToUuidLower(guid) {
  // EA GUID looks like "{A1B2C3D4-E5F6-...}". Strip braces and lowercase.
  return String(guid||"").replace(/[{}]/g, "").toLowerCase();
}

// ------------------------------- IO HELPERS ----------------------------------

function selectOutputFolder(promptText){
  var prj = Repository.GetProjectInterface();
  var dummy = prj.GetFileNameDialog(promptText, "JSON Files (*.json)|*.json||", 1, 0, "Questionnaire.json", 0);
  if (!dummy) return null;
  var p = dummy.lastIndexOf("\\");
  return p >= 0 ? dummy.substring(0, p) : null;
}

function writeTextFile(path, content){
  var fso  = new ActiveXObject("Scripting.FileSystemObject");
  var file = fso.CreateTextFile(path, true);
  file.Write(content);
  file.Close();
}

// --------------------------------- RUN ---------------------------------------
main();

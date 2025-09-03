// ==================================================================================================
// File:        PRSB Model Dissemination – Export CDISC ODM (Schema-Validated, JScript-safe).js
// Scope:       Enterprise Architect (EA) – JScript (legacy ECMAScript 3 compatible)
// Author:      <Your Name>
// Created:     2025-09-03
// Last Update: 2025-09-03
//
// PURPOSE
// -------
// Generate a standards-conformant CDISC ODM 1.3.x XML document from a collection of EA instance
// objects (Elements with Type="Object") within the currently selected Package. The script creates:
//   • <ODM> with required attributes and namespaces
//   • <Study> with <GlobalVariables>
//   • <MetaDataVersion> with ItemDef (for every observed attribute), ItemGroupDef (per classifier),
//     a FormDef, and a StudyEventDef (plus optional extra forms/events created on demand via tags)
//   • <ClinicalData> mapping each EA instance to a SubjectData record and writing values as ItemData
//
// VALUE SOURCES (MERGED, EARLY WINS)
// ----------------------------------
// 1) RunState string (EA's "Set Run State…"): "name=value;name2=value2;..."
// 2) Instance Attribute Slots (el.Attributes[i].Default on the instance element)
// 3) Tagged Values (excluding control tags that begin with "ODM.")
//
// OPTIONAL ROUTING VIA TAGS
// -------------------------
// Place these on an instance element to steer where it is written:
//   • ODM.SubjectKey  : overrides SubjectData/@SubjectKey (fallback = element.Name or "SUBJ_n")
//   • ODM.Event       : routes to a named StudyEvent (auto-created once if not already present)
//   • ODM.Form        : routes to a named Form (auto-created once if not already present)
//
// EA SCRIPTING CONSTRAINTS RESPECTED
// ----------------------------------
//  • Legacy JScript engine: provides compatibility helpers (no .trim(), .startsWith(), etc.)
//  • Avoids unsupported MSXML properties (e.g., no dom.setProperty("NewParser", ...))
//  • Uses folder picker ONLY; filename auto-derived from selected package + timestamp
//  • Coerces attribute values to strings to avoid VARIANT/Type mismatch errors
//  • MSXML 6 validation is OPTIONAL and safely guarded
//
// OUTPUTS
// -------
//  • <PackageName>_CDISC_ODM_<YYYYMMDD-HHMMSS>.xml   (the export)
//  • <PackageName>_CDISC_ODM_<YYYYMMDD-HHMMSS>.log   (human-readable summary)
//
// CONFIGURE
// ---------
//  • Set SCHEMA_DIR to the folder that contains ODM.xsd and companion XSDs. Leave empty "" to skip
//    validation (the export will still be generated).
//  • Adjust ODM_VERSION if your bundle is 1.3.1 vs 1.3.2.
//
// ==================================================================================================


// ===========================================
// USER CONFIGURATION
// ===========================================
var SCHEMA_DIR = "";        // e.g., "C:\\Schemas\\CDISC\\ODM\\" (leave "" to SKIP validation)
var ODM_VERSION = "1.3.2";  // Adjust if needed: "1.3.1" or "1.3.2"
var FILE_TYPE   = "Snapshot";
var GRANULARITY = "All";
var OUTPUT_TAB  = "ODM Export";


// ============================================================================
// SMALL UTILITIES – JScript-safe helper functions for EA ODM Export
// (Use these instead of ES5+ methods; EA's JScript is legacy ECMAScript 3.)
// ============================================================================
function trimString(str) {
    if (str == null || str == undefined) return "";
    return String(str).replace(/^\s+|\s+$/g, "");
}
function safeCompare(str1, str2) {
    return String(str1 || "").toLowerCase() === String(str2 || "").toLowerCase();
}
function contains(str, substring) {
    return String(str || "").indexOf(String(substring)) !== -1;
}
function startsWith(str, prefix) {
    if (str == null || prefix == null) return false;
    return String(str).indexOf(String(prefix)) === 0;
}
function endsWith(str, suffix) {
    if (str == null || suffix == null) return false;
    var s = String(str); var suff = String(suffix);
    return s.lastIndexOf(suff) === (s.length - suff.length);
}
function sanitizeForOID(s) {
    if (!s || !String(s).length) s = "X";
    var cleaned = String(s).replace(/[^A-Za-z0-9_.-]+/g, "_");
    if (!/^[A-Za-z]/.test(cleaned)) cleaned = "X" + cleaned;
    return cleaned;
}
function escapeXml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/\'/g, "&apos;");
}
function newGuidNoBraces() {
    var g = new ActiveXObject("Scriptlet.TypeLib").GUID;
    return g.replace(/[{}]/g, "");
}
function isoNowUtc() {
    var d = new Date();
    function p(n){ return ("0"+n).slice(-2); }
    return d.getUTCFullYear()+"-"+p(d.getUTCMonth()+1)+"-"+p(d.getUTCDate())+"T"+p(d.getUTCHours())+":"+
           p(d.getUTCMinutes())+":"+p(d.getUTCSeconds())+"Z";
}
function timestampForFilename() {
    var d = new Date();
    function p(n){ return ("0"+n).slice(-2); }
    return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+"-"+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds());
}


// ============================================================================
// EA Output helpers
// ============================================================================
function ensureOutput() {
    try {
        Repository.CreateOutputTab(OUTPUT_TAB);
        Repository.ClearOutput(OUTPUT_TAB);
        Repository.EnsureOutputVisible(OUTPUT_TAB);
    } catch (e) {}
}
function writeOut(msg) {
    try { Repository.WriteOutput(OUTPUT_TAB, String(msg), 0); } catch(e) {}
    try { if (Session && Session.Output) Session.Output(String(msg)); } catch(e2) {}
    try { WScript.Echo(String(msg)); } catch(e3) {}
}


// ============================================================================
// EA model discovery & helpers
// ============================================================================
function getSelectedPackage() {
    try { return Repository.GetTreeSelectedPackage(); } catch(e) { return null; }
}
function getModelName() {
    try {
        var root = Repository.Models.GetAt(0);
        return (root && root.Name && root.Name.length) ? root.Name : "EA_Model";
    } catch(e) { return "EA_Model"; }
}
function gatherInstanceElementsFromPackage(pkg) {
    var results = [];
    (function scan(p){
        for (var i=0; i < p.Elements.Count; i++) {
            var el = p.Elements.GetAt(i);
            if (el.Type == "Object") results.push(el);
        }
        for (var j=0; j < p.Packages.Count; j++) scan(p.Packages.GetAt(j));
    })(pkg);
    return results;
}
function classifierNameOfInstance(el) {
    try {
        if (el.ClassifierID && el.ClassifierID != "0") {
            var cls = Repository.GetElementByID(el.ClassifierID);
            if (cls && cls.Name) return cls.Name;
        }
    } catch(e) {}
    return "Ungrouped";
}
function getTaggedOr(el, tagName, fallback) {
    try {
        for (var i=0; i < el.TaggedValues.Count; i++) {
            var tv = el.TaggedValues.GetAt(i);
            if (safeCompare(tv.Name, tagName)) {
                var v = tv.Value;
                if (v !== null && v !== undefined && String(v).length) return String(v);
            }
        }
    } catch(e) {}
    return fallback;
}


// ============================================================================
// Folder picking & file writing
// ============================================================================
function pickFolder() {
    try {
        var sh = new ActiveXObject("Shell.Application");
        var folder = sh.BrowseForFolder(0, "Select output folder for ODM export", 0x0030, 0);
        if (!folder) return "";
        return String(folder.Self.Path);
    } catch(e) { return ""; }
}
function joinPath(dir, leaf) {
    if (!dir || !leaf) return "";
    var sep = /[\\\/]$/.test(dir) ? "" : "\\";
    return dir + sep + leaf;
}
function writeTextFile(fullPath, text) {
    var stm = new ActiveXObject("ADODB.Stream");
    stm.Type = 2; // text
    stm.Charset = "utf-8";
    stm.Open();
    stm.WriteText(text);
    stm.SaveToFile(fullPath, 2); // adSaveCreateOverWrite
    stm.Close();
}


// ============================================================================
// Unified instance value extraction (RunState + Attribute Slots + Tagged Values)
// (RunState takes precedence, then Attribute Slots, then Tagged Values)
// ============================================================================
function extractInstanceValues(el) {
    var out = {};

    // 1) RunState: "name=value;name2=value2;..."
    var rs = el.RunState;
    if (rs && rs.length) {
        var normalized = String(rs).replace(/\r?\n/g, ";");
        var parts = normalized.split(";");
        for (var i = 0; i < parts.length; i++) {
            var seg = trimString(parts[i]);
            if (!seg) continue;
            var eq = seg.indexOf("=");
            if (eq > 0) {
                var k = trimString(seg.substring(0, eq));
                var v = trimString(seg.substring(eq + 1));
                if (k && out[k] === undefined) out[k] = v;
            }
        }
    }

    // 2) Instance Attribute Slots (Attributes[i].Default on the *instance*)
    try {
        for (var a = 0; a < el.Attributes.Count; a++) {
            var slot = el.Attributes.GetAt(a);
            var name = slot.Name;
            var val  = slot.Default; // instance slot value
            if (name && val !== null && val !== undefined && val !== "" && (out[name] === undefined)) {
                out[name] = String(val);
            }
        }
    } catch (eAttr) {}

    // 3) Tagged Values (exclude control tags that start with "ODM.")
    try {
        for (var t = 0; t < el.TaggedValues.Count; t++) {
            var tv = el.TaggedValues.GetAt(t);
            var tvName = tv.Name;
            var tvVal  = tv.Value;
            if (tvName && tvVal !== null && tvVal !== undefined && tvVal !== "") {
                if (!startsWith(tvName, "ODM.") && (out[tvName] === undefined)) {
                    out[tvName] = String(tvVal);
                }
            }
        }
    } catch (eTV) {}

    return out;
}


// ============================================================================
// MSXML DOM helpers (namespace-safe element creation)
// ============================================================================
function createDom() {
    var dom = new ActiveXObject("Msxml2.DOMDocument.6.0");
    dom.validateOnParse = false;
    dom.async = false;
    dom.preserveWhiteSpace = true;
    return dom;
}
function addEl(dom, parent, localName) {
    // Create element in parent’s namespace (or ODM ns if none)
    var ns = null;
    try { ns = parent.namespaceURI; } catch(e) { ns = null; }
    if (!ns || ns === "") ns = "http://www.cdisc.org/ns/odm/v1.3";
    var el = dom.createNode(1, String(localName), ns);
    parent.appendChild(el);
    return el;
}
function setAttr(el, name, value) {
    if (value === null || value === undefined) return;
    el.setAttribute(name, String(value)); // force string to avoid VARIANT type mismatch
}


// ============================================================================
// ODM builders
// ============================================================================
function inferOdmDatatype(rawValue) {
    if (rawValue == null) return "text";
    var v = trimString(rawValue);

    if (/^(true|false)$/i.test(v)) return "boolean";
    if (/^[+-]?\d+$/.test(v)) return "integer";
    if (/^[+-]?\d*\.\d+$/.test(v)) return "float";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return "date";
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?$/.test(v)) return "datetime";

    return "text";
}

function buildOdmDocument(instances, context) {
    var doc = createDom();

    // Root <ODM> with namespace + required attributes
    var odm = doc.createNode(1, "ODM", "http://www.cdisc.org/ns/odm/v1.3");
    doc.appendChild(odm);
    setAttr(odm, "xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
    setAttr(odm, "xsi:schemaLocation", "http://www.cdisc.org/ns/odm/v1.3 ODM.xsd");
    setAttr(odm, "FileOID", context.fileOID);
    setAttr(odm, "CreationDateTime", context.creationDateTime);
    setAttr(odm, "ODMVersion", ODM_VERSION);
    setAttr(odm, "FileType", FILE_TYPE);
    setAttr(odm, "Granularity", GRANULARITY);

    // ---------------------------------
    // Study
    // ---------------------------------
    var study = addEl(doc, odm, "Study");
    setAttr(study, "OID", context.studyOID);

    var gv = addEl(doc, study, "GlobalVariables");
    addEl(doc, gv, "StudyName").text        = context.studyName;
    addEl(doc, gv, "StudyDescription").text = context.studyDescription;
    addEl(doc, gv, "ProtocolName").text     = context.protocolName;

    // ---------------------------------
    // MetaDataVersion
    // ---------------------------------
    var mdv = addEl(doc, study, "MetaDataVersion");
    setAttr(mdv, "OID", context.mdvOID);
    setAttr(mdv, "Name", context.mdvName);

    // Build the attribute "universe" per classifier and infer data types
    var groupToAttrSet   = {}; // classifierName -> { attrName: true }
    var allAttrTypes     = {}; // attrName -> dataType
    var allAttrToItemOID = {}; // attrName -> ItemDef.OID

    for (var i = 0; i < instances.length; i++) {
        var inst = instances[i];
        var groupName = classifierNameOfInstance(inst);
        if (!groupToAttrSet[groupName]) groupToAttrSet[groupName] = {};

        // Values observed on the instance
        var kv = extractInstanceValues(inst);
        for (var key in kv) {
            groupToAttrSet[groupName][key] = true;
            if (!allAttrTypes[key]) allAttrTypes[key] = inferOdmDatatype(kv[key]);
        }

        // Include classifier attributes as metadata (even if no instance set a value)
        try {
            if (inst.ClassifierID && inst.ClassifierID != "0") {
                var cls = Repository.GetElementByID(inst.ClassifierID);
                if (cls) {
                    for (var ca = 0; ca < cls.Attributes.Count; ca++) {
                        var cattr = cls.Attributes.GetAt(ca);
                        var cname = cattr.Name;
                        if (cname && !groupToAttrSet[groupName][cname]) {
                            groupToAttrSet[groupName][cname] = true;
                            if (!allAttrTypes[cname]) allAttrTypes[cname] = "text";
                        }
                    }
                }
            }
        } catch(eCls) {}
    }

    // Emit ItemDef once per attribute name
    for (var attrName in allAttrTypes) {
        var itemOID = "IT." + sanitizeForOID(attrName);
        allAttrToItemOID[attrName] = itemOID;

        var itemDef = addEl(doc, mdv, "ItemDef");
        setAttr(itemDef, "OID", itemOID);
        setAttr(itemDef, "Name", attrName);
        setAttr(itemDef, "DataType", allAttrTypes[attrName]);

        // Optional enrichment:
        // var desc = addEl(doc, itemDef, "Description");
        // var tt = addEl(doc, desc, "TranslatedText"); setAttr(tt, "xml:lang", "en"); tt.text = attrName;
    }

    // Emit ItemGroupDef per classifier
    var groupNameToOID = {};
    for (var groupName in groupToAttrSet) {
        var igOID = "IG." + sanitizeForOID(groupName);
        groupNameToOID[groupName] = igOID;

        var ig = addEl(doc, mdv, "ItemGroupDef");
        setAttr(ig, "OID", igOID);
        setAttr(ig, "Name", groupName);
        setAttr(ig, "Repeating", "No");

        var attrSet = groupToAttrSet[groupName];
        var ord = 1;
        for (var a in attrSet) {
            var itemRef = addEl(doc, ig, "ItemRef");
            setAttr(itemRef, "ItemOID", allAttrToItemOID[a]);
            setAttr(itemRef, "OrderNumber", String(ord++));
            setAttr(itemRef, "Mandatory", "No");
        }
    }

    // Default FormDef (includes all groups) and StudyEventDef
    var defaultFormOID = context.formOID;
    var form = addEl(doc, mdv, "FormDef");
    setAttr(form, "OID", defaultFormOID);
    setAttr(form, "Name", context.formName);
    setAttr(form, "Repeating", "No");
    var ordG = 1;
    for (var gn in groupNameToOID) {
        var gr = addEl(doc, form, "ItemGroupRef");
        setAttr(gr, "ItemGroupOID", groupNameToOID[gn]);
        setAttr(gr, "OrderNumber", String(ordG++));
        setAttr(gr, "Mandatory", "No");
    }

    var defaultEventOID = context.studyEventOID;
    var sed = addEl(doc, mdv, "StudyEventDef");
    setAttr(sed, "OID", defaultEventOID);
    setAttr(sed, "Name", context.studyEventName);
    setAttr(sed, "Repeating", "No");
    var fr = addEl(doc, sed, "FormRef");
    setAttr(fr, "FormOID", defaultFormOID);
    setAttr(fr, "OrderNumber", "1");
    setAttr(fr, "Mandatory", "No");

    // Optional: dynamic Forms/Events via tags (created on demand)
    var formNameToOID  = {}; formNameToOID[context.formName]       = defaultFormOID;
    var eventNameToOID = {}; eventNameToOID[context.studyEventName] = defaultEventOID;

    function ensureForm(name) {
        name = (name && name.length) ? name : context.formName;
        if (formNameToOID[name]) return formNameToOID[name];

        var fOID = "FM." + sanitizeForOID(name);
        formNameToOID[name] = fOID;

        var f = addEl(doc, mdv, "FormDef");
        setAttr(f, "OID", fOID);
        setAttr(f, "Name", name);
        setAttr(f, "Repeating", "No");

        var ordX = 1;
        for (var gn2 in groupNameToOID) {
            var igr = addEl(doc, f, "ItemGroupRef");
            setAttr(igr, "ItemGroupOID", groupNameToOID[gn2]);
            setAttr(igr, "OrderNumber", String(ordX++));
            setAttr(igr, "Mandatory", "No");
        }
        return fOID;
    }
    function ensureEvent(name, formOIDToRef) {
        name = (name && name.length) ? name : context.studyEventName;
        if (eventNameToOID[name]) return eventNameToOID[name];

        var eOID = "SE." + sanitizeForOID(name);
        eventNameToOID[name] = eOID;

        var se = addEl(doc, mdv, "StudyEventDef");
        setAttr(se, "OID", eOID);
        setAttr(se, "Name", name);
        setAttr(se, "Repeating", "No");

        var fr2 = addEl(doc, se, "FormRef");
        setAttr(fr2, "FormOID", formOIDToRef);
        setAttr(fr2, "OrderNumber", "1");
        setAttr(fr2, "Mandatory", "No");

        return eOID;
    }

    // ---------------------------------
    // ClinicalData
    // ---------------------------------
    var clinical = addEl(doc, odm, "ClinicalData");
    setAttr(clinical, "StudyOID", context.studyOID);
    setAttr(clinical, "MetaDataVersionOID", context.mdvOID);

    for (var k = 0; k < instances.length; k++) {
        var inst2 = instances[k];

        var subjKey = getTaggedOr(inst2, "ODM.SubjectKey",
            (inst2.Name && inst2.Name.length ? inst2.Name : ("SUBJ_" + (k+1))));

        var eventName = getTaggedOr(inst2, "ODM.Event", context.studyEventName);
        var formName  = getTaggedOr(inst2, "ODM.Form",  context.formName);

        var formOIDToUse  = ensureForm(formName);
        var eventOIDToUse = ensureEvent(eventName, formOIDToUse);

        var subject = addEl(doc, clinical, "SubjectData");
        setAttr(subject, "SubjectKey", subjKey);

        var sedata = addEl(doc, subject, "StudyEventData");
        setAttr(sedata, "StudyEventOID", eventOIDToUse);

        var fdata = addEl(doc, sedata, "FormData");
        setAttr(fdata, "FormOID", formOIDToUse);

        var gname = classifierNameOfInstance(inst2);
        var igOID2 = groupNameToOID[gname] || ("IG." + sanitizeForOID(gname));
        var igdata = addEl(doc, fdata, "ItemGroupData");
        setAttr(igdata, "ItemGroupOID", igOID2);

        var values = extractInstanceValues(inst2);
        var keys = [];
        for (var attr in values) {
            var itemOID2 = allAttrToItemOID[attr] || ("IT." + sanitizeForOID(attr));
            var idata = addEl(doc, igdata, "ItemData");
            setAttr(idata, "ItemOID", itemOID2);
            setAttr(idata, "Value", values[attr]);
            keys.push(attr);
        }
        try { writeOut("[TRACE] " + subjKey + " -> " + gname + " keys: " + keys.join(", ")); } catch(eLog) {}
    }

    return doc;
}


// ============================================================================
// MSXML schema validation (optional, guarded)
// ============================================================================
function tryValidateWithMsxml(dom, schemaDir) {
    if (!schemaDir || !schemaDir.length)
        return { ok: true, message: "Validation skipped (no SCHEMA_DIR set)." };

    if (!/[\\\/]$/.test(schemaDir)) schemaDir += "\\";

    try {
        var cache = new ActiveXObject("Msxml2.XMLSchemaCache.6.0");
        cache.add("http://www.cdisc.org/ns/odm/v1.3", schemaDir + "ODM.xsd");

        // Assigning the cache can throw in some EA hosts; guard it.
        try { dom.schemas = cache; }
        catch (eAssign) { return { ok:false, message:"Could not attach schema cache (Type mismatch). " + eAssign.message }; }

        var err = dom.validate(); // IXMLDOMParseError
        if (err && err.errorCode && err.errorCode != 0) {
            return { ok:false, message:"ODM schema validation FAILED: " + err.reason + " (line " + err.line + ", pos " + err.linepos + ")" };
        }
        return { ok:true, message:"ODM schema validation PASSED." };
    } catch(ex) {
        return { ok:false, message:"Validation error: " + ex.message };
    }
}


// ============================================================================
// MAIN
// ============================================================================
function main() {
    ensureOutput();

    var pkg = getSelectedPackage();
    if (!pkg) { writeOut("[ERROR] Please select a Package in the Project Browser and rerun."); return; }

    var instances = gatherInstanceElementsFromPackage(pkg);
    if (instances.length === 0) {
        writeOut("[WARN] No instance objects (Type='Object') found under the selected package.");
        return;
    }

    var outDir = pickFolder();
    if (!outDir || !outDir.length) { writeOut("[INFO] Export cancelled (no folder chosen)."); return; }

    var modelName = getModelName();
    var baseName  = (pkg && pkg.Name && pkg.Name.length) ? pkg.Name : modelName;
    var ts        = timestampForFilename();
    var fileBase  = sanitizeForOID(baseName) + "_CDISC_ODM_" + ts;

    var context = {
        fileOID:          "ODM." + newGuidNoBraces(),
        creationDateTime: isoNowUtc(),
        studyOID:         "ST."  + sanitizeForOID(baseName),
        studyName:        baseName,
        studyDescription: "Study export from EA instances in package '" + baseName + "'.",
        protocolName:     baseName + " Protocol",
        mdvOID:           "MDV." + sanitizeForOID(baseName),
        mdvName:          baseName + " MDV " + ODM_VERSION,
        formOID:          "FM."  + sanitizeForOID(baseName),
        formName:         baseName + " Form",
        studyEventOID:    "SE."  + sanitizeForOID(baseName),
        studyEventName:   baseName + " Event"
    };

    // Build DOM
    var dom = buildOdmDocument(instances, context);

    // Safe serialization (no "NewParser" property!)
    try { dom.setProperty("SelectionLanguage", "XPath"); } catch(e) {}
    dom.preserveWhiteSpace = true;

    var xmlText = dom.xml;
    if (!startsWith(xmlText, "<?xml")) {
        xmlText = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlText;
    }

    // Optional validation
    var validationResult = tryValidateWithMsxml(dom, SCHEMA_DIR);
    if (validationResult.ok) writeOut("[OK] " + validationResult.message);
    else                     writeOut("[ERROR] " + validationResult.message);

    // Write files
    var xmlPath = joinPath(outDir, fileBase + ".xml");
    writeTextFile(xmlPath, xmlText);

    var logLines = [];
    logLines.push("CDISC ODM export log");
    logLines.push("Model/Package: " + baseName);
    logLines.push("Instances exported: " + instances.length);
    logLines.push("StudyOID=" + context.studyOID + "  MDVOID=" + context.mdvOID + "  FileOID=" + context.fileOID);
    logLines.push("Validation: " + validationResult.message);
    logLines.push("");
    logLines.push("Instance summary (SubjectKey -> Classifier / keys):");
    for (var i=0; i<instances.length; i++) {
        var el = instances[i];
        var vals = extractInstanceValues(el);
        var keys = [];
        for (var k in vals) keys.push(k);
        logLines.push(" - " + (el.Name||("<unnamed_"+(i+1)+">")) + " -> " + classifierNameOfInstance(el) + " [" + keys.join(", ") + "]");
    }
    var logPath = joinPath(outDir, fileBase + ".log");
    writeTextFile(logPath, logLines.join("\r\n"));

    writeOut("[DONE] Saved: " + xmlPath);
    writeOut("[INFO]  Log:  " + logPath);
}

main();

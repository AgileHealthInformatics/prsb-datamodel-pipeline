/**
 * SNOMED ValueSet to ECL Converter Script
 * 
 * DESCRIPTION:
 * This script examines all DataElements in a PRSB model and looks for existing
 * SNOMED CT expressions in their valueSets tagged values. If a valid SNOMED
 * expression is found, it converts it to proper ECL format and populates the
 * snomedECL tagged value. If no SNOMED expression exists, no action is taken.
 * 
 * PURPOSE:
 * - Convert existing SNOMED valueSet expressions to standardized ECL format
 * - Preserve existing clinical intent without adding new constraints
 * - Enable ECL-based exports (FHIR, OpenEHR) from existing SNOMED valueSets
 * - Maintain semantic consistency across export formats
 * 
 * APPROACH:
 * 1. Find all DataElements in selected scope
 * 2. Examine valueSets tagged value for SNOMED expressions
 * 3. Extract and convert SNOMED concepts to ECL format
 * 4. Populate snomedECL tagged value with converted expression
 * 5. Skip elements without SNOMED valueSets
 * 
 * USAGE:
 * 1. Select a PRSB Standard, Model, or DataElement in the Project Browser
 * 2. Run this script - it will automatically process all DataElements
 * 3. Review the output log for conversions performed
 * 4. Enhanced elements can then export with proper ECL constraints
 * 
 * EXAMPLES:
 * Input:  valueSets = "SNOMED CT: - <71388002 |Procedure (procedure)|"
 * Output: snomedECL = "< 71388002 |Procedure|"
 * 
 * Input:  valueSets = "Local procedure codes"
 * Output: No action taken
 * 
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2024-12-19
 * VERSION: 2.0 (Simplified ValueSet Converter)
 */

!INC Local Scripts.EAConstants-JScript

// Simple configuration
var conversionConfig = {
    // Skip elements that already have snomedECL (set to false to update existing)
    skipExistingEcl: true,
    
    // Show detailed analysis for each element
    debugMode: true,
    
    // Log elements that don't have SNOMED valueSets
    logNonSnomedElements: false
};

var conversionCounter = {
    elementsProcessed: 0,
    conversionsPerformed: 0,
    existingEclSkipped: 0,
    nonSnomedSkipped: 0,
    errors: 0
};

function main() {
    try {
        Repository.ClearOutput("Script");
        Repository.CreateOutputTab("Script");
        Repository.EnsureOutputVisible("Script");
        Repository.WriteOutput("Script", "=== SNOMED ValueSet to ECL Converter ===", 0);
        Repository.WriteOutput("Script", "Converting existing SNOMED valueSets to ECL format", 0);
        Repository.WriteOutput("Script", "", 0);

        var selectedElement = Repository.GetTreeSelectedObject();
        if (!selectedElement || selectedElement.ObjectType != otElement) {
            Repository.WriteOutput("Script", "ERROR: Please select a PRSB element in the Project Browser.", 0);
            return;
        }

        // Process based on selected element type
        if (hasStereotype(selectedElement, "PRSB DataElement")) {
            Repository.WriteOutput("Script", "Converting single PRSB DataElement: " + selectedElement.Name, 0);
            convertSingleDataElement(selectedElement);
        } else if (hasStereotype(selectedElement, "PRSB Standard")) {
            Repository.WriteOutput("Script", "Converting all DataElements in PRSB Standard: " + selectedElement.Name, 0);
            convertAllDataElementsInStandard(selectedElement);
        } else if (hasStereotype(selectedElement, "PRSB Model")) {
            Repository.WriteOutput("Script", "Converting all DataElements in PRSB Model: " + selectedElement.Name, 0);
            convertAllDataElementsInModel(selectedElement);
        } else {
            Repository.WriteOutput("Script", "INFO: Selected element type does not contain DataElements.", 0);
            Repository.WriteOutput("Script", "Please select a PRSB Standard, Model, or DataElement.", 0);
            return;
        }

        displayConversionSummary();

    } catch (e) {
        Repository.WriteOutput("Script", "CRITICAL ERROR: " + e.description, 0);
        conversionCounter.errors++;
    }
}

function convertAllDataElementsInStandard(standardElement) {
    Repository.WriteOutput("Script", "Scanning entire standard for DataElements...", 0);
    
    var allDataElements = findAllDataElements(standardElement);
    Repository.WriteOutput("Script", "Found " + allDataElements.length + " DataElements to examine", 0);
    
    if (allDataElements.length === 0) {
        Repository.WriteOutput("Script", "No DataElements found in this standard.", 0);
        return;
    }
    
    Repository.WriteOutput("Script", "Processing all " + allDataElements.length + " DataElements...", 0);
    Repository.WriteOutput("Script", "", 0);
    
    for (var i = 0; i < allDataElements.length; i++) {
        var element = allDataElements[i];
        Repository.WriteOutput("Script", "Processing DataElement " + (i+1) + "/" + allDataElements.length + ": " + element.Name, 0);
        convertSingleDataElement(element);
    }
}

function convertAllDataElementsInModel(modelElement) {
    Repository.WriteOutput("Script", "Scanning model for DataElements...", 0);
    
    var dataElements = findDataElementsInModel(modelElement);
    Repository.WriteOutput("Script", "Found " + dataElements.length + " DataElements in this model", 0);
    
    if (dataElements.length === 0) {
        Repository.WriteOutput("Script", "No DataElements found in this model.", 0);
        return;
    }
    
    for (var i = 0; i < dataElements.length; i++) {
        var element = dataElements[i];
        Repository.WriteOutput("Script", "Processing DataElement " + (i+1) + "/" + dataElements.length + ": " + element.Name, 0);
        convertSingleDataElement(element);
    }
}

function convertSingleDataElement(element) {
    try {
        conversionCounter.elementsProcessed++;
        
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "  Examining DataElement: " + element.Name, 0);
        }
        
        // Check if element already has snomedECL
        var existingEcl = getTaggedValue(element, "snomedECL");
        if (existingEcl && trimString(existingEcl) !== "") {
            if (conversionConfig.skipExistingEcl) {
                Repository.WriteOutput("Script", "  Skipping - already has snomedECL: " + existingEcl, 0);
                conversionCounter.existingEclSkipped++;
                return;
            } else {
                Repository.WriteOutput("Script", "  Existing snomedECL will be updated: " + existingEcl, 0);
            }
        }
        
        // Get the valueSets tagged value
        var valueSetString = getTaggedValue(element, "valueSets");
        if (!valueSetString || trimString(valueSetString) === "") {
            if (conversionConfig.logNonSnomedElements) {
                Repository.WriteOutput("Script", "  No valueSets found - skipping", 0);
            }
            conversionCounter.nonSnomedSkipped++;
            return;
        }
        
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "  Found valueSets: " + valueSetString, 0);
        }
        
        // Try to extract SNOMED ECL from the valueSet string
        var extractedEcl = extractSnomedEclFromValueSet(valueSetString);
        
        if (extractedEcl && trimString(extractedEcl) !== "") {
            Repository.WriteOutput("Script", "  ? Extracted ECL: " + extractedEcl, 0);
            
            // Add the ECL tagged value
            addOrUpdateTaggedValue(element, "snomedECL", extractedEcl);
            
            // Add conversion metadata
            addOrUpdateTaggedValue(element, "eclSource", "Converted from valueSets");
            addOrUpdateTaggedValue(element, "eclConversionDate", getCurrentDate());
            
            conversionCounter.conversionsPerformed++;
            Repository.WriteOutput("Script", "  ? Added snomedECL tagged value", 0);
        } else {
            if (conversionConfig.logNonSnomedElements) {
                Repository.WriteOutput("Script", "  No SNOMED expression found in valueSets - skipping", 0);
            }
            conversionCounter.nonSnomedSkipped++;
        }
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR processing DataElement " + element.Name + ": " + e.description, 0);
        conversionCounter.errors++;
    }
}

function extractSnomedEclFromValueSet(valueSetString) {
    if (!valueSetString || trimString(valueSetString) === "") {
        return "";
    }
    
    var valueSet = trimString(valueSetString);
    
    if (conversionConfig.debugMode) {
        Repository.WriteOutput("Script", "    Analyzing valueSet: " + valueSet, 0);
    }
    
    // Pattern 1: Complex ECL expressions with OR logic and multiple operators
    // Example: "SNOMED CT :- < 127785005 |Administration...| or << 1066171000000108 Seasonal influenza... or << 713404003 Vaccination given..."
    var complexEclPattern = /SNOMED[\s\-]*CT\s*(?:\(UK\))?\s*:-?\s*(.+)/i;
    var complexMatch = valueSet.match(complexEclPattern);
    if (complexMatch) {
        var eclExpression = trimString(complexMatch[1]);
        
        // Check if this looks like a valid ECL expression
        if (isValidEclExpression(eclExpression)) {
            if (conversionConfig.debugMode) {
                Repository.WriteOutput("Script", "    Found complex ECL expression: " + eclExpression, 0);
            }
            return cleanAndStandardizeEcl(eclExpression);
        }
    }
    
    // Pattern 2: Alternative SNOMED prefixes (SCT, SNOMEDCT, etc.)
    var altPrefixPattern = /(SCT|SNOMEDCT|SNOMED[\s\-]*CT)[\s\(UK\)]?\s*:?\s*(.+)/i;
    var altMatch = valueSet.match(altPrefixPattern);
    if (altMatch && !complexMatch) { // Don't double-process
        var expression = trimString(altMatch[2]);
        if (isValidEclExpression(expression)) {
            if (conversionConfig.debugMode) {
                Repository.WriteOutput("Script", "    Found alternative SNOMED prefix: " + expression, 0);
            }
            return cleanAndStandardizeEcl(expression);
        }
    }
    
    // Pattern 3: UK dm+d (Dictionary of medicines and devices)
    var dmdPattern = /dm\+d:\s*(\d+)/i;
    var dmdMatch = valueSet.match(dmdPattern);
    if (dmdMatch) {
        var dmdCode = dmdMatch[1];
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found dm+d code: " + dmdCode, 0);
        }
        return "< " + dmdCode + " |dm+d concept|";
    }
    
    // Pattern 4: SNOMED CT Reference Sets "^refsetId |Description|"
    var refsetPattern = /SNOMED[\s\-]*CT[\s\(UK\)]?\s*:?\s*-?\s*\^(\d{6,18})\s*(?:\|([^|]+)\|)?/i;
    var refsetMatch = valueSet.match(refsetPattern);
    if (refsetMatch) {
        var refsetId = refsetMatch[1];
        var refsetName = refsetMatch[2] ? trimString(refsetMatch[2]) : "SNOMED CT reference set";
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found SNOMED reference set: " + refsetId + " |" + refsetName + "|", 0);
        }
        return "^ " + refsetId + " |" + refsetName + "|";
    }
    
    // Pattern 5: Exact concept (no descendants) - self only
    var exactPattern = /SNOMED[\s\-]*CT[\s\(UK\)]?\s*:?\s*(\d{6,18})\s*(?:\|([^|]+)\|)?\s*(?:\(exact\)|only|self)/i;
    var exactMatch = valueSet.match(exactPattern);
    if (exactMatch) {
        var conceptId = exactMatch[1];
        var conceptTerm = exactMatch[2] ? cleanConceptTerm(trimString(exactMatch[2])) : "SNOMED CT concept";
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found exact SNOMED concept (self only): " + conceptId, 0);
        }
        return conceptId + " |" + conceptTerm + "|"; // No < operator for exact match
    }
    
    // Pattern 6: Descendants including self "<<conceptId"
    var descendantsInclusivePattern = /SNOMED[\s\-]*CT[\s\(UK\)]?\s*:?\s*-?\s*<<\s*(\d{6,18})\s*(?:\|([^|]+)\|)?/i;
    var descendantsInclusiveMatch = valueSet.match(descendantsInclusivePattern);
    if (descendantsInclusiveMatch) {
        var conceptId = descendantsInclusiveMatch[1];
        var conceptTerm = descendantsInclusiveMatch[2] ? cleanConceptTerm(trimString(descendantsInclusiveMatch[2])) : "SNOMED CT concept";
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found SNOMED concept with descendants (inclusive): " + conceptId, 0);
        }
        return "<< " + conceptId + " |" + conceptTerm + "|";
    }
    
    // Pattern 7: Descendants excluding self "<conceptId" (default case)
    var descendantsExclusivePattern = /SNOMED[\s\-]*CT[\s\(UK\)]?\s*:?\s*-?\s*<\s*(\d{6,18})\s*(?:\|([^|]+)\|)?/i;
    var descendantsExclusiveMatch = valueSet.match(descendantsExclusivePattern);
    if (descendantsExclusiveMatch) {
        var conceptId = descendantsExclusiveMatch[1];
        var conceptTerm = descendantsExclusiveMatch[2] ? cleanConceptTerm(trimString(descendantsExclusiveMatch[2])) : "SNOMED CT concept";
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found SNOMED concept with descendants (exclusive): " + conceptId, 0);
        }
        return "< " + conceptId + " |" + conceptTerm + "|";
    }
    
    // Pattern 8: Ancestors including self ">>conceptId"
    var ancestorsInclusivePattern = /SNOMED[\s\-]*CT[\s\(UK\)]?\s*:?\s*-?\s*>>\s*(\d{6,18})\s*(?:\|([^|]+)\|)?/i;
    var ancestorsInclusiveMatch = valueSet.match(ancestorsInclusivePattern);
    if (ancestorsInclusiveMatch) {
        var conceptId = ancestorsInclusiveMatch[1];
        var conceptTerm = ancestorsInclusiveMatch[2] ? cleanConceptTerm(trimString(ancestorsInclusiveMatch[2])) : "SNOMED CT concept";
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found SNOMED ancestors (inclusive): " + conceptId, 0);
        }
        return ">> " + conceptId + " |" + conceptTerm + "|";
    }
    
    // Pattern 9: Ancestors excluding self ">conceptId"
    var ancestorsExclusivePattern = /SNOMED[\s\-]*CT[\s\(UK\)]?\s*:?\s*-?\s*>\s*(\d{6,18})\s*(?:\|([^|]+)\|)?/i;
    var ancestorsExclusiveMatch = valueSet.match(ancestorsExclusivePattern);
    if (ancestorsExclusiveMatch) {
        var conceptId = ancestorsExclusiveMatch[1];
        var conceptTerm = ancestorsExclusiveMatch[2] ? cleanConceptTerm(trimString(ancestorsExclusiveMatch[2])) : "SNOMED CT concept";
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found SNOMED ancestors (exclusive): " + conceptId, 0);
        }
        return "> " + conceptId + " |" + conceptTerm + "|";
    }
    
    // Pattern 10: FHIR ValueSet URLs
    var fhirEclPattern = /snomed\.info\/sct\?fhir_vs=ecl\/(.+)/i;
    var fhirEclMatch = valueSet.match(fhirEclPattern);
    if (fhirEclMatch) {
        var eclExpression = decodeURIComponent(fhirEclMatch[1]);
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found FHIR ECL URL: " + eclExpression, 0);
        }
        return cleanAndStandardizeEcl(eclExpression);
    }
    
    var fhirRefsetPattern = /snomed\.info\/sct\?fhir_vs=refset\/(\d{6,18})/i;
    var fhirRefsetMatch = valueSet.match(fhirRefsetPattern);
    if (fhirRefsetMatch) {
        var refsetId = fhirRefsetMatch[1];
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found FHIR reference set URL: " + refsetId, 0);
        }
        return "^ " + refsetId + " |SNOMED CT reference set|";
    }
    
    // Pattern 11: Simple concept ID with SNOMED context (fallback)
    var simpleConceptPattern = /SNOMED[\s\-]*CT[\s\(UK\)]?\s*:?\s*(\d{6,18})/i;
    var simpleConceptMatch = valueSet.match(simpleConceptPattern);
    if (simpleConceptMatch) {
        var conceptId = simpleConceptMatch[1];
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found simple SNOMED concept ID: " + conceptId, 0);
        }
        return "< " + conceptId + " |SNOMED CT concept|"; // Default to descendants
    }
    
    // Pattern 12: Multiple concept IDs in lists
    var multipleConceptPattern = /SNOMED[^:]*:\s*([\d\s,]+)/i;
    var multipleConceptMatch = valueSet.match(multipleConceptPattern);
    if (multipleConceptMatch) {
        var conceptIds = multipleConceptMatch[1].match(/\d{6,18}/g);
        if (conceptIds && conceptIds.length > 0) {
            if (conceptIds.length === 1) {
                if (conversionConfig.debugMode) {
                    Repository.WriteOutput("Script", "    Found single concept in list: " + conceptIds[0], 0);
                }
                return "< " + conceptIds[0] + " |SNOMED CT concept|";
            } else {
                var expressions = [];
                for (var i = 0; i < conceptIds.length; i++) {
                    expressions.push("< " + conceptIds[i] + " |SNOMED CT concept|");
                }
                if (conversionConfig.debugMode) {
                    Repository.WriteOutput("Script", "    Found multiple concepts: " + conceptIds.join(", "), 0);
                }
                return expressions.join(" OR ");
            }
        }
    }
    
    // Pattern 13: Standalone patterns (no explicit SNOMED prefix)
    var standaloneRefsetPattern = /^\^(\d{6,18})/;
    var standaloneRefsetMatch = valueSet.match(standaloneRefsetPattern);
    if (standaloneRefsetMatch) {
        var refsetId = standaloneRefsetMatch[1];
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found standalone reference set: " + refsetId, 0);
        }
        return "^ " + refsetId + " |SNOMED CT reference set|";
    }
    
    var standaloneConceptPattern = /(?:<{1,2}|>{1,2})?\s*(\d{6,18})\s*(?:\|([^|]+)\|)?/;
    var standaloneConceptMatch = valueSet.match(standaloneConceptPattern);
    if (standaloneConceptMatch && !valueSet.match(/^[\d\s,]+$/)) { // Avoid matching pure number lists
        var conceptId = standaloneConceptMatch[1];
        var conceptTerm = standaloneConceptMatch[2] ? cleanConceptTerm(trimString(standaloneConceptMatch[2])) : "SNOMED CT concept";
        if (conversionConfig.debugMode) {
            Repository.WriteOutput("Script", "    Found standalone concept: " + conceptId, 0);
        }
        return "< " + conceptId + " |" + conceptTerm + "|";
    }
    
    if (conversionConfig.debugMode) {
        Repository.WriteOutput("Script", "    No SNOMED pattern matched", 0);
    }
    
    return "";
}

function isValidEclExpression(expression) {
    // Check if the expression contains ECL operators and SNOMED concept IDs
    var hasEclOperators = /[<>^]|AND|OR|MINUS/i.test(expression);
    var hasConceptIds = /\d{6,18}/.test(expression);
    var hasLogicalStructure = /\s+(or|and|minus)\s+/i.test(expression) || 
                             /<{1,2}\s*\d|>{1,2}\s*\d|\^\s*\d/.test(expression);
    
    return hasEclOperators && hasConceptIds && (hasLogicalStructure || expression.length > 20);
}

function cleanAndStandardizeEcl(eclExpression) {
    var cleaned = trimString(eclExpression);
    
    // Standardize logical operators (case insensitive to uppercase)
    cleaned = cleaned.replace(/\s+or\s+/gi, " OR ");
    cleaned = cleaned.replace(/\s+and\s+/gi, " AND ");
    cleaned = cleaned.replace(/\s+minus\s+/gi, " MINUS ");
    
    // Clean up extra whitespace around operators
    cleaned = cleaned.replace(/\s*<{1,2}\s*/g, function(match) {
        return match.replace(/\s/g, "") + " ";
    });
    cleaned = cleaned.replace(/\s*>{1,2}\s*/g, function(match) {
        return match.replace(/\s/g, "") + " ";
    });
    cleaned = cleaned.replace(/\s*\^\s*/g, "^ ");
    
    // Clean up concept terms - remove semantic tag suffixes like "(procedure)"
    cleaned = cleaned.replace(/\|([^|]+)\s*\([^)]+\)\s*\|/g, function(match, term) {
        return "|" + trimString(term) + "|";
    });
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, " ");
    cleaned = trimString(cleaned);
    
    return cleaned;
}

function cleanConceptTerm(term) {
    // Remove semantic tag suffixes like "(procedure)", "(finding)", etc.
    var cleaned = term.replace(/\s*\([^)]+\)\s*$/g, "");
    return trimString(cleaned);
}

function findAllDataElements(rootElement) {
    var dataElements = [];
    collectDataElementsRecursively(rootElement, dataElements);
    return dataElements;
}

function findDataElementsInModel(modelElement) {
    var dataElements = [];
    collectDataElementsRecursively(modelElement, dataElements);
    return dataElements;
}

function collectDataElementsRecursively(element, collection) {
    // Check if current element is a DataElement
    if (hasStereotype(element, "PRSB DataElement")) {
        collection.push(element);
    }
    
    // Recursively check all children regardless of their type
    for (var i = 0; i < element.Elements.Count; i++) {
        var child = element.Elements.GetAt(i);
        collectDataElementsRecursively(child, collection);
    }
    
    // Also check package-level elements that have this element as parent
    var package = Repository.GetPackageByID(element.PackageID);
    for (var j = 0; j < package.Elements.Count; j++) {
        var packageElement = package.Elements.GetAt(j);
        if (packageElement.ParentID == element.ElementID) {
            collectDataElementsRecursively(packageElement, collection);
        }
    }
}

function displayConversionSummary() {
    Repository.WriteOutput("Script", "", 0);
    Repository.WriteOutput("Script", "=== CONVERSION SUMMARY ===", 0);
    Repository.WriteOutput("Script", "Elements processed: " + conversionCounter.elementsProcessed, 0);
    Repository.WriteOutput("Script", "SNOMED valueSets converted to ECL: " + conversionCounter.conversionsPerformed, 0);
    Repository.WriteOutput("Script", "Elements with existing ECL (skipped): " + conversionCounter.existingEclSkipped, 0);
    Repository.WriteOutput("Script", "Elements without SNOMED valueSets (skipped): " + conversionCounter.nonSnomedSkipped, 0);
    Repository.WriteOutput("Script", "Errors encountered: " + conversionCounter.errors, 0);
    Repository.WriteOutput("Script", "", 0);
    
    if (conversionCounter.errors === 0) {
        Repository.WriteOutput("Script", "? Conversion completed successfully!", 0);
        if (conversionCounter.conversionsPerformed > 0) {
            Repository.WriteOutput("Script", "Converted " + conversionCounter.conversionsPerformed + 
                                  " SNOMED valueSets to ECL format", 0);
        } else {
            Repository.WriteOutput("Script", "No SNOMED valueSets found that needed conversion", 0);
        }
    } else {
        Repository.WriteOutput("Script", "? Conversion completed with errors.", 0);
    }
}

// Utility functions
function hasStereotype(element, stereotypeName) {
    var stereotypes = element.StereotypeEx;
    if (!stereotypes) return false;
    
    var stereoArray = stereotypes.split(",");
    for (var i = 0; i < stereoArray.length; i++) {
        if (trimString(stereoArray[i]) == stereotypeName) {
            return true;
        }
    }
    return false;
}

function getTaggedValue(element, tagName) {
    try {
        for (var i = 0; i < element.TaggedValues.Count; i++) {
            var tag = element.TaggedValues.GetAt(i);
            if (tag.Name == tagName) {
                if (tag.Value == "<memo>") {
                    return tag.Notes || "";
                }
                return tag.Value || "";
            }
        }
    } catch (e) {
        Repository.WriteOutput("Script", "WARNING: Error accessing tagged value '" + tagName + "': " + e.description, 0);
    }
    return "";
}

function addOrUpdateTaggedValue(element, tagName, tagValue) {
    try {
        // Check if tagged value already exists
        var existingTag = null;
        for (var i = 0; i < element.TaggedValues.Count; i++) {
            var tag = element.TaggedValues.GetAt(i);
            if (tag.Name == tagName) {
                existingTag = tag;
                break;
            }
        }
        
        if (existingTag) {
            // Update existing tagged value
            if (tagValue.length > 255) {
                existingTag.Value = "<memo>";
                existingTag.Notes = tagValue;
            } else {
                existingTag.Value = tagValue;
                existingTag.Notes = "";
            }
            existingTag.Update();
        } else {
            // Create new tagged value
            var newTag = element.TaggedValues.AddNew(tagName, "");
            if (tagValue.length > 255) {
                newTag.Value = "<memo>";
                newTag.Notes = tagValue;
            } else {
                newTag.Value = tagValue;
            }
            newTag.Update();
        }
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR adding/updating tagged value: " + e.description, 0);
        throw e;
    }
}

function trimString(str) {
    if (!str) return "";
    return str.replace(/^\s+|\s+$/g, "");
}

function getCurrentDate() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    
    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    
    return year + "-" + month + "-" + day;
}

main();
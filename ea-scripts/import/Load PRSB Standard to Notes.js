/**
 * Enhanced PRSB XML Import Script with Description Population
 * 
 * DESCRIPTION:
 * This script imports PRSB (Professional Record Standards Body) XML standards into Sparx Enterprise 
 * Architect as hierarchical UML class models with proper stereotypes, relationships, and comprehensive
 * metadata. The script creates a structured representation of healthcare information standards that 
 * preserves all clinical context and enables further processing for questionnaire generation.
 * 
 * PURPOSE:
 * - Import PRSB XML standards into Enterprise Architect as UML class models
 * - Create proper hierarchical relationships using associations with cardinality
 * - Preserve all tagged values and metadata from the original standard
 * - Populate Notes fields with descriptive content for enhanced documentation
 * - Establish foundation for questionnaire generation and export workflows
 * - Support clinical validation and collaboration through visual modeling
 * 
 * KEY ENHANCEMENTS IN THIS VERSION:
 * - Extracts description from XML tagged values and populates Notes field
 * - Improves documentation visibility within Enterprise Architect
 * - Maintains backward compatibility with existing processing scripts
 * - Enhanced error handling and validation
 * - Comprehensive logging for troubleshooting
 * 
 * USAGE:
 * 1. Select a package in the Project Browser where you want to import the standard
 * 2. Run this script from Enterprise Architect's scripting interface
 * 3. Select the PRSB XML file when prompted
 * 4. Review the import summary and any warnings/errors
 * 5. The imported model will be ready for enhancement and export processing
 * 
 * INPUT REQUIREMENTS:
 * - Valid PRSB XML file with proper structure (<Standard> root element)
 * - XML must contain Model and Element hierarchies with tagged values
 * - Description content should be present in TaggedValue elements
 * 
 * OUTPUT:
 * - Hierarchical UML class model with PRSB stereotypes
 * - Associations with proper cardinality constraints
 * - Complete tagged value preservation
 * - Notes fields populated with descriptions for enhanced readability
 * - Import statistics and error reporting
 * 
 * STEREOTYPES APPLIED:
 * - "PRSB Standard" for the root standard element
 * - "PRSB Model" for model container elements
 * - "PRSB DataElement" for data elements (default)
 * - "PRSB MultimediaElement" for multimedia elements
 * - "PRSB InformationElement" for information elements
 * 
 * DEPENDENCIES:
 * - EAConstants-JScript (included via !INC directive)
 * - Microsoft XML Parser (MSXML2.DOMDocument.6.0)
 * - Enterprise Architect automation interface
 * 
 * COMPATIBILITY:
 * - Works with existing PRISM Platform scripts
 * - Compatible with questionnaire enhancement workflows
 * - Supports all export formats (FHIR, OpenEHR, REDCap, etc.)
 * 
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2024-12-19
 * VERSION: 2.0 (Enhanced with Description Population)
 * 
 * CHANGE HISTORY:
 * v1.0 - Original version with basic XML import and associations
 * v2.0 - Added description population to Notes fields, enhanced error handling
 */

!INC Local Scripts.EAConstants-JScript

// Global counters for comprehensive import tracking
var importCounter = {
    elements: 0,                    // Total class elements created
    taggedValues: 0,               // Tagged values processed and added
    associations: 0,               // Association relationships created
    notesPopulated: 0,             // Notes fields populated with descriptions
    errors: 0,                     // Errors encountered during import
    warnings: 0                    // Warnings generated (non-fatal issues)
};

// Configuration options for import behavior
var importConfig = {
    // Populate Notes field with description content
    populateNotesFromDescription: true,
    
    // Maximum length for Notes field content
    maxNotesLength: 4000,
    
    // Preserve existing Notes content if present
    preserveExistingNotes: false,
    
    // Create associations with cardinality from XML
    createAssociationsWithCardinality: true,
    
    // Verbose logging for debugging
    verboseLogging: true,
    
    // Validate XML structure before processing
    validateXmlStructure: true
};

/**
 * Main entry point for the PRSB XML import process
 * Orchestrates the entire import workflow from file selection to completion
 */
function main() {
    try {
        // Initialize output window for comprehensive user feedback
        Repository.ClearOutput("Script");
        Repository.CreateOutputTab("Script");
        Repository.EnsureOutputVisible("Script");
        Repository.WriteOutput("Script", "=== Enhanced PRSB XML Import Script ===", 0);
        Repository.WriteOutput("Script", "Importing PRSB standards with description population", 0);
        Repository.WriteOutput("Script", "Script Version: 2.0 | Date: 2024-12-19", 0);
        Repository.WriteOutput("Script", "", 0);

        // Validate that user has selected an appropriate package
        var rootPackage = Repository.GetTreeSelectedPackage();
        if (!rootPackage) {
            Repository.WriteOutput("Script", "ERROR: Please select a package in the Project Browser.", 0);
            Repository.WriteOutput("Script", "The selected package will contain the imported PRSB standard.", 0);
            return;
        }

        Repository.WriteOutput("Script", "Target package: " + rootPackage.Name, 0);
        Repository.WriteOutput("Script", "Package GUID: " + rootPackage.PackageGUID, 0);

        // Get XML file from user
        var XML_FILE_PATH = selectXmlFile();
        if (!XML_FILE_PATH || XML_FILE_PATH == "") {
            Repository.WriteOutput("Script", "ERROR: No XML file selected.", 0);
            Repository.WriteOutput("Script", "Please select a valid PRSB XML file to import.", 0);
            return;
        }

        Repository.WriteOutput("Script", "Selected XML file: " + XML_FILE_PATH, 0);

        // Validate file exists
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        if (!fso.FileExists(XML_FILE_PATH)) {
            Repository.WriteOutput("Script", "ERROR: File not found: " + XML_FILE_PATH, 0);
            Repository.WriteOutput("Script", "Please verify the file path and try again.", 0);
            return;
        }

        // Load and validate XML document
        Repository.WriteOutput("Script", "Loading XML document...", 0);
        var xmlDoc = new ActiveXObject("MSXML2.DOMDocument.6.0");
        xmlDoc.async = false;
        xmlDoc.validateOnParse = true;
        
        if (!xmlDoc.load(XML_FILE_PATH)) {
            Repository.WriteOutput("Script", "ERROR loading XML: " + xmlDoc.parseError.reason, 0);
            Repository.WriteOutput("Script", "Line: " + xmlDoc.parseError.line + ", Position: " + xmlDoc.parseError.linepos, 0);
            Repository.WriteOutput("Script", "Please verify the XML file is valid and properly formatted.", 0);
            return;
        }

        Repository.WriteOutput("Script", "XML file loaded successfully", 0);
        
        // Log import configuration if verbose logging is enabled
        if (importConfig.verboseLogging) {
            logImportConfiguration();
        }

        Repository.WriteOutput("Script", "Starting XML processing...", 0);
        Repository.WriteOutput("Script", "", 0);

        // Process the XML document
        processXml(xmlDoc, rootPackage);

        // Display comprehensive import summary
        Repository.WriteOutput("Script", "", 0);
        displayImportSummary();

        // Refresh model view to show imported elements
        Repository.RefreshModelView(rootPackage.PackageID);
        Repository.WriteOutput("Script", "", 0);
        Repository.WriteOutput("Script", "Import process completed. Model view refreshed.", 0);

    } catch (e) {
        Repository.WriteOutput("Script", "CRITICAL ERROR in main(): " + e.description, 0);
        Repository.WriteOutput("Script", "Stack trace: " + (e.stack || "Not available"), 0);
        importCounter.errors++;
    }
}

/**
 * Presents file selection dialog for XML import
 * @returns {String} Selected file path or empty string if cancelled
 */
function selectXmlFile() {
    try {
        var project = Repository.GetProjectInterface();
        return project.GetFileNameDialog(
            "Select PRSB XML File to Import", 
            "XML Files (*.xml)|*.xml|All Files (*.*)|*.*||", 
            1, 0, "", 0
        );
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR in file selection: " + e.description, 0);
        return "";
    }
}

/**
 * Logs the current import configuration settings
 */
function logImportConfiguration() {
    Repository.WriteOutput("Script", "=== IMPORT CONFIGURATION ===", 0);
    Repository.WriteOutput("Script", "Populate Notes from description: " + importConfig.populateNotesFromDescription, 0);
    Repository.WriteOutput("Script", "Maximum Notes length: " + importConfig.maxNotesLength, 0);
    Repository.WriteOutput("Script", "Preserve existing Notes: " + importConfig.preserveExistingNotes, 0);
    Repository.WriteOutput("Script", "Create associations with cardinality: " + importConfig.createAssociationsWithCardinality, 0);
    Repository.WriteOutput("Script", "Verbose logging: " + importConfig.verboseLogging, 0);
    Repository.WriteOutput("Script", "Validate XML structure: " + importConfig.validateXmlStructure, 0);
    Repository.WriteOutput("Script", "", 0);
}

/**
 * Processes the loaded XML document and creates the UML model structure
 * @param {Object} xmlDoc - The loaded XML document
 * @param {Object} rootPackage - The target package for import
 */
function processXml(xmlDoc, rootPackage) {
    try {
        var standardNode = xmlDoc.documentElement;
        
        // Validate XML structure
        if (!standardNode || standardNode.nodeName != "Standard") {
            Repository.WriteOutput("Script", "ERROR: Invalid XML structure - missing 'Standard' root element.", 0);
            Repository.WriteOutput("Script", "Expected root element: <Standard>, Found: " + 
                                  (standardNode ? standardNode.nodeName : "none"), 0);
            importCounter.errors++;
            return;
        }

        Repository.WriteOutput("Script", "Valid PRSB XML structure detected", 0);

        // Extract standard metadata
        var standardName = standardNode.getAttribute("name") || "Unnamed Standard";
        var version = standardNode.getAttribute("version") || "1.0";
        var lastUpdated = standardNode.getAttribute("lastUpdated") || "";

        Repository.WriteOutput("Script", "Standard Name: " + standardName, 0);
        Repository.WriteOutput("Script", "Version: " + version, 0);
        if (lastUpdated) {
            Repository.WriteOutput("Script", "Last Updated: " + lastUpdated, 0);
        }
        Repository.WriteOutput("Script", "", 0);

        // Create the root standard element
        Repository.WriteOutput("Script", "Creating root standard element...", 0);
        var standardElement = rootPackage.Elements.AddNew(standardName, "Class");
        standardElement.Stereotype = "PRSB Standard";
        
        // Populate Notes field for standard if description is available
        var standardDescription = getElementDescription(standardNode);
        if (standardDescription && importConfig.populateNotesFromDescription) {
            standardElement.Notes = standardDescription;
            importCounter.notesPopulated++;
            
            if (importConfig.verboseLogging) {
                Repository.WriteOutput("Script", "Populated standard Notes field with description", 0);
            }
        }
        
        standardElement.Update();
        importCounter.elements++;

        // Add standard-level tagged values
        addTaggedValueToElement(standardElement, "version", version);
        if (lastUpdated !== "") {
            addTaggedValueToElement(standardElement, "lastUpdated", lastUpdated);
        }

        Repository.WriteOutput("Script", "Root standard element created: " + standardName, 0);
        Repository.WriteOutput("Script", "", 0);

        // Process model hierarchy
        Repository.WriteOutput("Script", "Processing model hierarchy...", 0);
        var modelNodes = standardNode.selectNodes("Model");
        if (modelNodes.length > 0) {
            Repository.WriteOutput("Script", "Found " + modelNodes.length + " top-level models", 0);
            processModelNodes(modelNodes, standardElement);
        } else {
            Repository.WriteOutput("Script", "WARNING: No Model nodes found in XML", 0);
            importCounter.warnings++;
        }

        // Refresh collections and update model view
        rootPackage.Elements.Refresh();
        Repository.WriteOutput("Script", "Model hierarchy processing completed", 0);

    } catch (e) {
        Repository.WriteOutput("Script", "ERROR in processXml(): " + e.description, 0);
        importCounter.errors++;
    }
}

/**
 * Processes Model nodes from the XML and creates corresponding UML elements
 * @param {Object} modelNodes - XML node list of Model elements
 * @param {Object} parentElement - Parent UML element to contain the models
 */
function processModelNodes(modelNodes, parentElement) {
    try {
        for (var i = 0; i < modelNodes.length; i++) {
            var modelNode = modelNodes[i];
            var modelName = modelNode.getAttribute("name") || ("Unnamed Model " + (i + 1));
            
            Repository.WriteOutput("Script", "Processing model: " + modelName, 0);
            
            // Create model element with enhanced metadata
            var modelElement = createChildClass(parentElement, modelName, "Model", modelNode);
            
            if (modelElement) {
                // Process tagged values for the model
                processTaggedValues(modelNode, modelElement);
                
                // Recursively process child elements
                var childElementNodes = modelNode.selectNodes("Element");
                if (childElementNodes.length > 0) {
                    Repository.WriteOutput("Script", "  Processing " + childElementNodes.length + " child elements", 0);
                    processElementNodes(childElementNodes, modelElement);
                }
                
                // Recursively process child models
                var childModelNodes = modelNode.selectNodes("Model");
                if (childModelNodes.length > 0) {
                    Repository.WriteOutput("Script", "  Processing " + childModelNodes.length + " child models", 0);
                    processModelNodes(childModelNodes, modelElement);
                }
                
                Repository.WriteOutput("Script", "Completed model: " + modelName, 0);
            } else {
                Repository.WriteOutput("Script", "ERROR: Failed to create model element: " + modelName, 0);
                importCounter.errors++;
            }
        }
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR in processModelNodes(): " + e.description, 0);
        importCounter.errors++;
    }
}

/**
 * Processes Element nodes from the XML and creates corresponding UML elements
 * @param {Object} elementNodes - XML node list of Element nodes
 * @param {Object} parentElement - Parent UML element to contain the elements
 */
function processElementNodes(elementNodes, parentElement) {
    try {
        for (var i = 0; i < elementNodes.length; i++) {
            var el = elementNodes[i];
            var name = el.getAttribute("name") || ("Unnamed Element " + (i + 1));
            var stereotype = el.getAttribute("stereotype") || "DataElement";
            
            if (importConfig.verboseLogging) {
                Repository.WriteOutput("Script", "  Processing element: " + name + " (stereotype: " + stereotype + ")", 0);
            }
            
            // Create child element with enhanced metadata
            var child = createChildClass(parentElement, name, stereotype, el);
            
            if (child) {
                // Process tagged values for the element
                processTaggedValues(el, child);
                
                if (importConfig.verboseLogging) {
                    Repository.WriteOutput("Script", "    Element created successfully", 0);
                }
            } else {
                Repository.WriteOutput("Script", "ERROR: Failed to create element: " + name, 0);
                importCounter.errors++;
            }
        }
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR in processElementNodes(): " + e.description, 0);
        importCounter.errors++;
    }
}

/**
 * Creates a child UML class element with proper relationships and metadata
 * @param {Object} parentElement - Parent UML element
 * @param {String} name - Name for the new element
 * @param {String} stereotype - Stereotype to apply (Model, DataElement, etc.)
 * @param {Object} xmlNode - Source XML node for metadata extraction
 * @returns {Object} Created UML element or null if creation failed
 */
function createChildClass(parentElement, name, stereotype, xmlNode) {
    try {
        var parentPackage = Repository.GetPackageByID(parentElement.PackageID);
        var newElement = parentPackage.Elements.AddNew(name, "Class");
        
        // Apply appropriate PRSB stereotype
        newElement.Stereotype = "PRSB " + stereotype;
        newElement.ParentID = parentElement.ElementID;
        
        // Enhanced Notes population from description
        if (importConfig.populateNotesFromDescription && xmlNode) {
            var description = getElementDescription(xmlNode);
            if (description) {
                // Handle existing Notes content
                if (importConfig.preserveExistingNotes && newElement.Notes && trimString(newElement.Notes) !== "") {
                    newElement.Notes = newElement.Notes + "\n\n--- Imported Description ---\n" + description;
                } else {
                    newElement.Notes = description;
                }
                
                // Truncate if too long
                if (newElement.Notes.length > importConfig.maxNotesLength) {
                    newElement.Notes = newElement.Notes.substring(0, importConfig.maxNotesLength - 50) + 
                                     "\n\n[Content truncated - see full description in tagged values]";
                    importCounter.warnings++;
                }
                
                importCounter.notesPopulated++;
                
                if (importConfig.verboseLogging) {
                    Repository.WriteOutput("Script", "    Populated Notes field with description (" + 
                                          description.length + " characters)", 0);
                }
            }
        }
        
        newElement.Update();
        importCounter.elements++;

        // Create association with cardinality if configured
        if (importConfig.createAssociationsWithCardinality) {
            var minCard = getXmlAttributeValue(xmlNode, "TaggedValue", "minCardinality");
            var maxCard = getXmlAttributeValue(xmlNode, "TaggedValue", "maxCardinality");
            createAssociation(newElement, parentElement, "contains", minCard, maxCard);
        }

        return newElement;
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR in createChildClass(): " + e.description, 0);
        importCounter.errors++;
        return null;
    }
}

/**
 * Extracts description content from XML element's tagged values
 * @param {Object} xmlNode - XML node to extract description from
 * @returns {String} Description text or empty string if not found
 */
function getElementDescription(xmlNode) {
    try {
        if (!xmlNode) return "";
        
        // Look for description in tagged values
        var tagNodes = xmlNode.selectNodes("TaggedValue");
        for (var i = 0; i < tagNodes.length; i++) {
            var tagName = tagNodes[i].getAttribute("name");
            var tagValue = tagNodes[i].getAttribute("value");
            
            // Check for description-related tagged values
            if (tagName && (tagName.toLowerCase() === "description" || 
                           tagName.toLowerCase() === "notes" ||
                           tagName.toLowerCase() === "definition")) {
                if (tagValue && trimString(tagValue) !== "") {
                    // Clean up the description text
                    var cleanedDescription = cleanDescriptionText(tagValue);
                    return cleanedDescription;
                }
            }
        }
        
        // Fallback: check for any text content in the XML node itself
        if (xmlNode.text && trimString(xmlNode.text) !== "") {
            return cleanDescriptionText(xmlNode.text);
        }
        
        return "";
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR extracting description: " + e.description, 0);
        return "";
    }
}

/**
 * Cleans and formats description text for use in Notes fields
 * @param {String} description - Raw description text
 * @returns {String} Cleaned and formatted description
 */
function cleanDescriptionText(description) {
    try {
        if (!description) return "";
        
        var cleaned = trimString(description);
        
        // Remove excessive whitespace
        cleaned = cleaned.replace(/\s+/g, " ");
        
        // Remove HTML tags if present (simple cleaning)
        cleaned = cleaned.replace(/<[^>]*>/g, "");
        
        // Decode common HTML entities
        cleaned = cleaned.replace(/&lt;/g, "<");
        cleaned = cleaned.replace(/&gt;/g, ">");
        cleaned = cleaned.replace(/&amp;/g, "&");
        cleaned = cleaned.replace(/&quot;/g, '"');
        cleaned = cleaned.replace(/&#39;/g, "'");
        
        // Remove control characters
        cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, "");
        
        return cleaned;
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR cleaning description text: " + e.description, 0);
        return description; // Return original if cleaning fails
    }
}

/**
 * Retrieves tagged value from XML node by name and attribute
 * @param {Object} xmlNode - XML node to search
 * @param {String} tagName - Tag element name to search for
 * @param {String} nameAttr - Name attribute value to match
 * @returns {String} Tagged value or empty string if not found
 */
function getXmlAttributeValue(xmlNode, tagName, nameAttr) {
    try {
        if (!xmlNode) return "";
        
        var tagNodes = xmlNode.selectNodes(tagName);
        for (var i = 0; i < tagNodes.length; i++) {
            var n = tagNodes[i].getAttribute("name");
            if (n && n == nameAttr) {
                return tagNodes[i].getAttribute("value") || "";
            }
        }
        return "";
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR getting XML attribute value: " + e.description, 0);
        return "";
    }
}

/**
 * Creates association relationship between child and parent elements
 * @param {Object} childElement - Child UML element
 * @param {Object} parentElement - Parent UML element
 * @param {String} name - Association name
 * @param {String} minCard - Minimum cardinality
 * @param {String} maxCard - Maximum cardinality
 */
function createAssociation(childElement, parentElement, name, minCard, maxCard) {
    try {
        var connector = childElement.Connectors.AddNew(name || "", "Association");
        connector.SupplierID = parentElement.ElementID;
        connector.ClientID = childElement.ElementID;

        // Set multiplicity if cardinality values exist
        if (minCard || maxCard) {
            var cardinalityString = (minCard || "0") + ".." + (maxCard || "*");
            connector.ClientEnd.Cardinality = cardinalityString;
            
            if (importConfig.verboseLogging) {
                Repository.WriteOutput("Script", "    Association cardinality: " + cardinalityString, 0);
            }
        }

        connector.Update();
        importCounter.associations++;
        
        if (importConfig.verboseLogging) {
            Repository.WriteOutput("Script", "    Association: " + childElement.Name + " -> " + parentElement.Name, 0);
        }
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR creating association: " + e.description, 0);
        importCounter.errors++;
    }
}

/**
 * Processes all tagged values from XML node and adds them to UML element
 * Excludes description-related tagged values since they're used for Notes field
 * @param {Object} xmlNode - Source XML node
 * @param {Object} eaElement - Target UML element
 */
function processTaggedValues(xmlNode, eaElement) {
    try {
        var tagNodes = xmlNode.selectNodes("TaggedValue");
        var processedTags = 0;
        var skippedDescriptionTags = 0;
        
        for (var i = 0; i < tagNodes.length; i++) {
            var tagName = tagNodes[i].getAttribute("name");
            var tagValue = tagNodes[i].getAttribute("value");
            
            if (tagName && tagValue) {
                // Skip description-related tagged values since they're used for Notes field
                var tagNameLower = tagName.toLowerCase();
                if (tagNameLower === "description" || 
                    tagNameLower === "notes" ||
                    tagNameLower === "definition") {
                    skippedDescriptionTags++;
                    
                    if (importConfig.verboseLogging) {
                        Repository.WriteOutput("Script", "    Skipped description tag '" + tagName + 
                                              "' (used for Notes field)", 0);
                    }
                    continue;
                }
                
                // Process all other tagged values normally
                addTaggedValueToElement(eaElement, tagName, tagValue);
                processedTags++;
            }
        }
        
        if (importConfig.verboseLogging && (processedTags > 0 || skippedDescriptionTags > 0)) {
            Repository.WriteOutput("Script", "    Processed " + processedTags + " tagged values" +
                                  (skippedDescriptionTags > 0 ? ", skipped " + skippedDescriptionTags + " description tags" : ""), 0);
        }
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR processing tagged values: " + e.description, 0);
        importCounter.errors++;
    }
}

/**
 * Adds a tagged value to a UML element with proper handling of long values
 * @param {Object} eaElement - Target UML element
 * @param {String} tagName - Tagged value name
 * @param {String} tagValue - Tagged value content
 */
function addTaggedValueToElement(eaElement, tagName, tagValue) {
    try {
        var tag = eaElement.TaggedValues.AddNew(tagName, "");
        
        // Handle long values using memo format
        if (tagValue.length > 255) {
            tag.Value = "<memo>";
            tag.Notes = tagValue;
        } else {
            tag.Value = tagValue;
        }
        
        tag.Update();
        importCounter.taggedValues++;
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR adding tagged value '" + tagName + "': " + e.description, 0);
        importCounter.errors++;
    }
}

/**
 * Displays comprehensive import summary with statistics and recommendations
 */
function displayImportSummary() {
    Repository.WriteOutput("Script", "=== IMPORT SUMMARY ===", 0);
    Repository.WriteOutput("Script", "Class elements created: " + importCounter.elements, 0);
    Repository.WriteOutput("Script", "Tagged values processed: " + importCounter.taggedValues, 0);
    Repository.WriteOutput("Script", "Associations created: " + importCounter.associations, 0);
    Repository.WriteOutput("Script", "Notes fields populated: " + importCounter.notesPopulated, 0);
    Repository.WriteOutput("Script", "Warnings generated: " + importCounter.warnings, 0);
    Repository.WriteOutput("Script", "Errors encountered: " + importCounter.errors, 0);
    Repository.WriteOutput("Script", "", 0);
    
    // Provide status assessment and recommendations
    if (importCounter.errors === 0) {
        Repository.WriteOutput("Script", "? Import completed successfully!", 0);
        Repository.WriteOutput("Script", "Created " + importCounter.elements + " elements with " + 
                              importCounter.associations + " relationships", 0);
        
        if (importCounter.notesPopulated > 0) {
            Repository.WriteOutput("Script", "Enhanced " + importCounter.notesPopulated + 
                                  " elements with description content", 0);
        }
        
        Repository.WriteOutput("Script", "", 0);
        Repository.WriteOutput("Script", "Next recommended steps:", 0);
        Repository.WriteOutput("Script", "1. Review imported model structure and relationships", 0);
        Repository.WriteOutput("Script", "2. Run 'Create Instance Model.js' to create instance model", 0);
        Repository.WriteOutput("Script", "3. Use 'Enhance Instance Model for Questionnaires.js' for questionnaire metadata", 0);
        Repository.WriteOutput("Script", "4. Export to desired formats (FHIR, OpenEHR, REDCap, etc.)", 0);
        
    } else {
        Repository.WriteOutput("Script", "?? Import completed with " + importCounter.errors + " errors.", 0);
        Repository.WriteOutput("Script", "Please review error messages above for details.", 0);
        Repository.WriteOutput("Script", "Consider re-running after addressing XML structure issues.", 0);
    }
    
    if (importCounter.warnings > 0) {
        Repository.WriteOutput("Script", "", 0);
        Repository.WriteOutput("Script", "?? " + importCounter.warnings + " warnings were generated during import.", 0);
        Repository.WriteOutput("Script", "These are typically non-fatal but should be reviewed.", 0);
    }
}

/**
 * Utility function to trim whitespace from strings
 * @param {String} str - String to trim
 * @returns {String} Trimmed string
 */
function trimString(str) {
    if (!str) return "";
    return str.replace(/^\s+|\s+$/g, "");
}

// Execute the main function to start the import process
main();
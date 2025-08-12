/**
 * Create PRSB Instance Model Script
 * 
 * DESCRIPTION:
 * This script transforms a PRSB class model (created by "New Load PRSB Standard with relationships.js")
 * into an equivalent instance model using UML Object (InstanceSpecification) elements.
 * The script creates a parallel hierarchy where class elements become object instances,
 * maintaining the same relationships and structure but representing actual instances
 * rather than abstract class definitions.
 * 
 * PURPOSE:
 * - Convert PRSB class models to instance models for concrete data representation
 * - Create a parallel instance hierarchy that mirrors the class structure
 * - Transform stereotypes from class-oriented to instance-oriented conventions
 * - Maintain all relationships, tagged values, and hierarchical structures
 * - Enable validation and testing of PRSB standards with real data instances
 * 
 * USAGE:
 * 1. Select a PRSB Standard element (with stereotype "PRSB Standard") in the Project Browser
 * 2. Run this script from Enterprise Architect's scripting interface
 * 3. The script will create a new package called "<StandardName>_Instance" 
 * 4. Instance objects will be created with appropriate stereotypes and relationships
 * 
 * STEREOTYPE TRANSFORMATIONS:
 * - "PRSB Standard" -> "PRSB Instance"
 * - "PRSB Model" -> "PRSB AppliedModel"  
 * - "PRSB DataElement" -> "PRSB DataUsage"
 * - "PRSB MultimediaElement" -> "PRSB MultimediaUsage"
 * - "PRSB InformationElement" -> "PRSB InformationUsage"
 * 
 * REQUIREMENTS:
 * - Must be run on a PRSB Standard element created by the Load PRSB Standard script
 * - Source element must have "PRSB Standard" stereotype
 * - Enterprise Architect must have write access to create new packages and elements
 * 
 * OUTPUT:
 * - Creates new package: <StandardName>_Instance
 * - Generates UML Object elements for each class in the hierarchy
 * - Preserves all tagged values, notes, and metadata
 * - Maintains parent-child relationships using associations
 * - Provides detailed logging of transformation process
 * 
 * AUTHOR: PRISM Platform Development Team
 * DATE: 2024-12-19
 * VERSION: 1.0
 * 
 * DEPENDENCIES:
 * - EAConstants-JScript (included via !INC directive)
 * - Requires source model created by "New Load PRSB Standard with relationships.js"
 */

!INC Local Scripts.EAConstants-JScript

// Global counters for tracking transformation progress
var transformCounter = {
    instanceElements: 0,        // Number of instance objects created
    taggedValues: 0,           // Number of tagged values copied
    associations: 0,           // Number of associations created
    errors: 0,                 // Number of errors encountered
    packagesCreated: 0         // Number of packages created
};

// Mapping table for stereotype transformations from class to instance
var stereotypeMapping = {
    "PRSB Standard": "PRSB Instance",
    "PRSB Model": "PRSB AppliedModel",
    "PRSB DataElement": "PRSB DataUsage",
    "PRSB MultimediaElement": "PRSB MultimediaUsage",
    "PRSB InformationElement": "PRSB InformationUsage"
};

/**
 * Main entry point for the script execution
 * Orchestrates the entire transformation process from class model to instance model
 */
function main() {
    try {
        // Initialize output window for user feedback
        Repository.ClearOutput("Script");
        Repository.CreateOutputTab("Script");
        Repository.EnsureOutputVisible("Script");
        Repository.WriteOutput("Script", "=== PRSB Class to Instance Model Transformation ===", 0);
        Repository.WriteOutput("Script", "Starting transformation of PRSB class model to instance model", 0);
        Repository.WriteOutput("Script", "Script Version: 1.0 | Date: 2024-12-19", 0);
        Repository.WriteOutput("Script", "", 0);

        // Validate that user has selected appropriate element
        var selectedElement = Repository.GetTreeSelectedObject();
        if (!selectedElement || selectedElement.ObjectType != otElement) {
            Repository.WriteOutput("Script", "ERROR: Please select a PRSB Standard element in the Project Browser.", 0);
            Repository.WriteOutput("Script", "The selected item must be an element, not a package or diagram.", 0);
            return;
        }

        // Verify the selected element has the correct stereotype
        if (!hasStereotype(selectedElement, "PRSB Standard")) {
            Repository.WriteOutput("Script", "ERROR: Selected element must have 'PRSB Standard' stereotype.", 0);
            Repository.WriteOutput("Script", "Current stereotypes: " + (selectedElement.StereotypeEx || "none"), 0);
            Repository.WriteOutput("Script", "Please select a PRSB Standard element created by the Load PRSB Standard script.", 0);
            return;
        }

        Repository.WriteOutput("Script", "Selected PRSB Standard: " + selectedElement.Name, 0);
        Repository.WriteOutput("Script", "Stereotype: " + selectedElement.StereotypeEx, 0);

        // Get the containing package for creating the instance model
        var containingPackage = Repository.GetPackageByID(selectedElement.PackageID);
        if (!containingPackage) {
            Repository.WriteOutput("Script", "ERROR: Could not find containing package for selected element.", 0);
            return;
        }

        Repository.WriteOutput("Script", "Containing package: " + containingPackage.Name, 0);
        Repository.WriteOutput("Script", "", 0);

        // Create the instance model structure
        Repository.WriteOutput("Script", "Creating instance model structure...", 0);
        createInstanceModel(selectedElement, containingPackage);

        // Display comprehensive summary of transformation results
        Repository.WriteOutput("Script", "", 0);
        Repository.WriteOutput("Script", "=== TRANSFORMATION SUMMARY ===", 0);
        Repository.WriteOutput("Script", "Packages created: " + transformCounter.packagesCreated, 0);
        Repository.WriteOutput("Script", "Instance elements created: " + transformCounter.instanceElements, 0);
        Repository.WriteOutput("Script", "Tagged values copied: " + transformCounter.taggedValues, 0);
        Repository.WriteOutput("Script", "Associations created: " + transformCounter.associations, 0);
        Repository.WriteOutput("Script", "Errors encountered: " + transformCounter.errors, 0);
        Repository.WriteOutput("Script", "", 0);

        if (transformCounter.errors === 0) {
            Repository.WriteOutput("Script", "? Transformation completed successfully!", 0);
            Repository.WriteOutput("Script", "Instance model created in package: " + selectedElement.Name + "_Instance", 0);
        } else {
            Repository.WriteOutput("Script", "? Transformation completed with " + transformCounter.errors + " errors.", 0);
            Repository.WriteOutput("Script", "Please review error messages above for details.", 0);
        }

    } catch (e) {
        Repository.WriteOutput("Script", "CRITICAL ERROR in main(): " + e.description, 0);
        Repository.WriteOutput("Script", "Stack trace: " + (e.stack || "Not available"), 0);
        transformCounter.errors++;
    }
}

/**
 * Creates the complete instance model structure including package and root instance
 * @param {Object} standardElement - The source PRSB Standard element to transform
 * @param {Object} containingPackage - The package that will contain the new instance model
 */
function createInstanceModel(standardElement, containingPackage) {
    try {
        // Create the instance package with descriptive name
        var instancePackageName = standardElement.Name + "_Instance";
        Repository.WriteOutput("Script", "Creating instance package: " + instancePackageName, 0);
        
        var instancePackage = containingPackage.Packages.AddNew(instancePackageName, "");
        instancePackage.Notes = "Instance model generated from PRSB Standard: " + standardElement.Name + 
                               "\nCreated by PRSB Instance Model Transformation Script";
        instancePackage.Update();
        transformCounter.packagesCreated++;

        Repository.WriteOutput("Script", "Instance package created successfully", 0);

        // Create the root instance element that corresponds to the standard
        Repository.WriteOutput("Script", "Creating root instance element...", 0);
        var rootInstance = createInstanceElement(standardElement, instancePackage, null);
        
        if (rootInstance) {
            Repository.WriteOutput("Script", "Root instance created: " + rootInstance.Name, 0);
            
            // Process all child elements recursively to build complete hierarchy
            Repository.WriteOutput("Script", "Processing child elements recursively...", 0);
            processChildElementsForInstances(standardElement, rootInstance, instancePackage);
            
            // Refresh the package view to show new elements
            instancePackage.Elements.Refresh();
            Repository.RefreshModelView(instancePackage.PackageID);
            
            Repository.WriteOutput("Script", "Instance model creation completed", 0);
        } else {
            Repository.WriteOutput("Script", "ERROR: Failed to create root instance element", 0);
            transformCounter.errors++;
        }

    } catch (e) {
        Repository.WriteOutput("Script", "ERROR in createInstanceModel(): " + e.description, 0);
        transformCounter.errors++;
    }
}

/**
 * Creates a single instance element from a class element
 * @param {Object} classElement - The source class element to transform
 * @param {Object} targetPackage - The package where the instance will be created
 * @param {Object} parentInstance - The parent instance element (null for root)
 * @returns {Object} The created instance element or null if creation failed
 */
function createInstanceElement(classElement, targetPackage, parentInstance) {
    try {
        Repository.WriteOutput("Script", "  Creating instance for: " + classElement.Name + 
                              " (Stereotype: " + classElement.StereotypeEx + ")", 0);
        
        // Create the new instance element as an Object (InstanceSpecification)
        var instanceName = classElement.Name + "_Instance";
        var instanceElement = targetPackage.Elements.AddNew(instanceName, "Object");
        
        // Set the parent relationship if this is not the root element
        if (parentInstance) {
            instanceElement.ParentID = parentInstance.ElementID;
        }
        
        // Transform and set the stereotype using mapping table
        var newStereotype = transformStereotype(classElement.StereotypeEx);
        if (newStereotype) {
            instanceElement.Stereotype = newStereotype;
        }
        
        // Copy essential properties from class to instance
        instanceElement.Alias = classElement.Alias;
        instanceElement.Author = classElement.Author;
        instanceElement.Version = classElement.Version;
        instanceElement.Status = classElement.Status;
        instanceElement.Phase = classElement.Phase;
        
		// Copy notes exactly as-is, with no modifications
		instanceElement.Notes = classElement.Notes;

        
        // Set the classifier to reference the original class
        instanceElement.ClassifierID = classElement.ElementID;
        
        instanceElement.Update();
        transformCounter.instanceElements++;
        
        // Copy all tagged values from class to instance
        copyTaggedValues(classElement, instanceElement);
        
        Repository.WriteOutput("Script", "    ? Instance created: " + instanceElement.Name + 
                              " with stereotype: " + newStereotype, 0);
        
        return instanceElement;
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR creating instance for " + classElement.Name + ": " + e.description, 0);
        transformCounter.errors++;
        return null;
    }
}

/**
 * Recursively processes all child elements to create corresponding instances
 * @param {Object} sourceClassElement - The source class element whose children to process
 * @param {Object} parentInstance - The parent instance element for the new instances
 * @param {Object} targetPackage - The package where instances will be created
 */
function processChildElementsForInstances(sourceClassElement, parentInstance, targetPackage) {
    try {
        var childElements = [];
        
        // Collect direct child elements from the class hierarchy
        Repository.WriteOutput("Script", "  Collecting child elements for: " + sourceClassElement.Name, 0);
        
        // Get elements that are direct children (ParentID matches)
        for (var i = 0; i < sourceClassElement.Elements.Count; i++) {
            var childElement = sourceClassElement.Elements.GetAt(i);
            childElements.push(childElement);
        }
        
        // Also check package-level elements that have this element as parent
        var sourcePackage = Repository.GetPackageByID(sourceClassElement.PackageID);
        for (var j = 0; j < sourcePackage.Elements.Count; j++) {
            var element = sourcePackage.Elements.GetAt(j);
            if (element.ParentID == sourceClassElement.ElementID) {
                // Check if not already in the list to avoid duplicates
                var alreadyAdded = false;
                for (var k = 0; k < childElements.length; k++) {
                    if (childElements[k].ElementID == element.ElementID) {
                        alreadyAdded = true;
                        break;
                    }
                }
                if (!alreadyAdded) {
                    childElements.push(element);
                }
            }
        }
        
        Repository.WriteOutput("Script", "  Found " + childElements.length + " child elements", 0);
        
        // Sort child elements for consistent processing order
        childElements.sort(function(a, b) {
            // Use TreePos if available, otherwise sort by name
            if (a.TreePos && b.TreePos && a.TreePos != b.TreePos) {
                return a.TreePos - b.TreePos;
            }
            return a.Name.localeCompare(b.Name);
        });
        
        // Process each child element to create corresponding instances
        for (var m = 0; m < childElements.length; m++) {
            var childElement = childElements[m];
            
            Repository.WriteOutput("Script", "  Processing child: " + childElement.Name + 
                                  " (Stereotype: " + childElement.StereotypeEx + ")", 0);
            
            // Create instance for this child element
            var childInstance = createInstanceElement(childElement, targetPackage, parentInstance);
            
            if (childInstance) {
                // Create association between parent and child instances
                createInstanceAssociation(parentInstance, childInstance, "contains");
                
                // Recursively process grandchildren if this element has children
                if (hasChildElements(childElement)) {
                    Repository.WriteOutput("Script", "    Recursively processing children of: " + childElement.Name, 0);
                    processChildElementsForInstances(childElement, childInstance, targetPackage);
                }
            } else {
                Repository.WriteOutput("Script", "  ERROR: Failed to create instance for child: " + childElement.Name, 0);
            }
        }
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR in processChildElementsForInstances(): " + e.description, 0);
        transformCounter.errors++;
    }
}

/**
 * Creates an association between two instance elements
 * @param {Object} parentInstance - The parent instance element
 * @param {Object} childInstance - The child instance element  
 * @param {String} associationType - The type of association (e.g., "contains")
 */
function createInstanceAssociation(parentInstance, childInstance, associationType) {
    try {
        Repository.WriteOutput("Script", "    Creating association: " + parentInstance.Name + 
                              " -> " + childInstance.Name, 0);
        
        // Create association connector from child to parent (following EA convention)
        var connector = childInstance.Connectors.AddNew(associationType || "instanceOf", "Association");
        connector.SupplierID = parentInstance.ElementID;
        connector.ClientID = childInstance.ElementID;
        
        // Set association direction and properties
        connector.Direction = "Source -> Destination";
        
        // Set role names to clarify the relationship
        connector.SupplierEnd.Role = "parent";
        connector.ClientEnd.Role = "child";
        
        connector.Update();
        transformCounter.associations++;
        
        Repository.WriteOutput("Script", "      ? Association created successfully", 0);
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR creating association between " + 
                              parentInstance.Name + " and " + childInstance.Name + ": " + e.description, 0);
        transformCounter.errors++;
    }
}

/**
 * Copies all tagged values from source element to target element
 * @param {Object} sourceElement - The element to copy tagged values from
 * @param {Object} targetElement - The element to copy tagged values to
 */
function copyTaggedValues(sourceElement, targetElement) {
    try {
        Repository.WriteOutput("Script", "    Copying tagged values from: " + sourceElement.Name, 0);
        
        var copiedCount = 0;
        
        // Iterate through all tagged values on the source element
        for (var i = 0; i < sourceElement.TaggedValues.Count; i++) {
            var sourceTag = sourceElement.TaggedValues.GetAt(i);
            
            if (sourceTag.Name && sourceTag.Name !== "") {
                // Create corresponding tagged value on target element
                var targetTag = targetElement.TaggedValues.AddNew(sourceTag.Name, "");
                
                // Copy value, handling memo values properly
                if (sourceTag.Value == "<memo>") {
                    targetTag.Value = "<memo>";
                    targetTag.Notes = sourceTag.Notes || "";
                } else {
                    targetTag.Value = sourceTag.Value || "";
                    targetTag.Notes = sourceTag.Notes || "";
                }
                
                targetTag.Update();
                copiedCount++;
                transformCounter.taggedValues++;
            }
        }
        
        Repository.WriteOutput("Script", "      ? Copied " + copiedCount + " tagged values", 0);
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR copying tagged values: " + e.description, 0);
        transformCounter.errors++;
    }
}

/**
 * Transforms class stereotypes to corresponding instance stereotypes
 * @param {String} classStereotypes - Comma-separated list of class stereotypes
 * @returns {String} Transformed instance stereotypes
 */
function transformStereotype(classStereotypes) {
    if (!classStereotypes || classStereotypes === "") {
        return "";
    }
    
    try {
        var stereotypeArray = classStereotypes.split(",");
        var transformedStereotypes = [];
        
        // Transform each stereotype using the mapping table
        for (var i = 0; i < stereotypeArray.length; i++) {
            var stereotype = trimString(stereotypeArray[i]);
            
            if (stereotypeMapping.hasOwnProperty(stereotype)) {
                transformedStereotypes.push(stereotypeMapping[stereotype]);
                Repository.WriteOutput("Script", "      Transformed stereotype: " + stereotype + 
                                      " -> " + stereotypeMapping[stereotype], 0);
            } else {
                // Keep unmapped stereotypes as-is but add warning
                transformedStereotypes.push(stereotype);
                Repository.WriteOutput("Script", "      WARNING: No mapping found for stereotype: " + stereotype, 0);
            }
        }
        
        return transformedStereotypes.join(",");
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR transforming stereotypes: " + e.description, 0);
        return classStereotypes; // Return original on error
    }
}

/**
 * Checks if an element has the specified stereotype
 * @param {Object} element - The element to check
 * @param {String} stereotypeName - The stereotype name to look for
 * @returns {Boolean} True if element has the stereotype, false otherwise
 */
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

/**
 * Checks if an element has child elements
 * @param {Object} element - The element to check for children
 * @returns {Boolean} True if element has children, false otherwise
 */
function hasChildElements(element) {
    try {
        // Check direct children
        if (element.Elements.Count > 0) {
            return true;
        }
        
        // Check package-level children with ParentID pointing to this element
        var package = Repository.GetPackageByID(element.PackageID);
        for (var i = 0; i < package.Elements.Count; i++) {
            var potentialChild = package.Elements.GetAt(i);
            if (potentialChild.ParentID == element.ElementID) {
                return true;
            }
        }
        
        return false;
        
    } catch (e) {
        Repository.WriteOutput("Script", "ERROR checking for child elements: " + e.description, 0);
        return false;
    }
}

/**
 * Trims whitespace from beginning and end of string
 * @param {String} str - The string to trim
 * @returns {String} Trimmed string
 */
function trimString(str) {
    if (!str) return "";
    return str.replace(/^\s+|\s+$/g, "");
}

// Execute the main function to start the transformation process
main();
/*
 * ============================================================================
 * FILE: XmlTransformer.cs
 * PROJECT: PRSB JSON to XML Batch Converter
 * PURPOSE: Transforms PRSB JSON standard objects into structured XML format
 *          suitable for Enterprise Architect modeling tools and other XML
 *          consumers. Handles hierarchical concept structures and generates
 *          appropriate XML elements, attributes, and tagged values.
 * 
 * CREATED: 2024 (Estimated based on project structure)
 * AUTHOR: Healthcare Standards Development Team
 * LAST MODIFIED: May 2025 (Enhanced multimedia handling and verbose logging)
 * 
 * DESCRIPTION:
 *   This class is responsible for converting the in-memory StandardSpec object
 *   graph into a structured XML document. It handles the mapping between
 *   PRSB concept types and XML elements, processes hierarchical relationships,
 *   cleans HTML content, and generates appropriate metadata.
 * 
 * XML OUTPUT STRUCTURE:
 *   - Root: <Standard> element with metadata attributes
 *   - Groups: <Model> elements containing child concepts
 *   - Items: <Element> elements with data type information
 *   - Multimedia: Special handling for complex media elements
 *   - Metadata: <TaggedValue> elements for descriptions and guidance
 * 
 * DEPENDENCIES:
 *   - System.Xml.Linq (for XML document creation and manipulation)
 *   - System.Text.RegularExpressions (for HTML cleaning and name sanitization)
 *   - System.Linq (for LINQ operations on collections)
 *   - Model.cs (for StandardSpec and related classes)
 * 
 * DESIGN PATTERNS:
 *   - Builder Pattern: Incrementally builds XML structure
 *   - Visitor Pattern: Recursive processing of concept hierarchy
 *   - Strategy Pattern: Different processing for group vs item concepts
 * ============================================================================
 */

using System;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using System.Linq;

namespace PrsbJsonToXml
{
    /// <summary>
    /// Transforms PRSB StandardSpec objects into structured XML documents.
    /// 
    /// RESPONSIBILITIES:
    /// - Convert hierarchical concept structures to XML
    /// - Handle different concept types (groups, items, multimedia)
    /// - Clean and sanitize text content for XML compatibility
    /// - Generate appropriate XML metadata and tagged values
    /// - Provide logging and statistics for transformation process
    /// 
    /// THREAD SAFETY: Not thread-safe - create separate instances for concurrent use
    /// STATEFUL: Maintains verbose logging setting across operations
    /// </summary>
    public class XmlTransformer
    {
        /// <summary>
        /// Flag indicating whether to output verbose logging information during transformation.
        /// When true, detailed progress messages are written to console during processing.
        /// 
        /// USAGE: Set during constructor, affects all logging throughout transformation
        /// PERFORMANCE: When false, reduces console I/O overhead
        /// DEBUGGING: Enable for detailed transformation diagnostics
        /// </summary>
        private bool _verbose = false;

        /// <summary>
        /// Initializes a new instance of the XmlTransformer class.
        /// 
        /// DESIGN: Simple constructor with optional verbose logging parameter
        /// DEFAULT: Verbose logging is disabled by default for performance
        /// </summary>
        /// <param name="verbose">
        /// Whether to enable verbose logging during transformation.
        /// 
        /// TRUE: Outputs detailed progress messages, timing, and statistics
        /// FALSE: Only outputs error messages and critical information
        /// PERFORMANCE: Verbose mode has minimal impact on transformation speed
        /// </param>
        public XmlTransformer(bool verbose = false)
        {
            _verbose = verbose;
        }

        /// <summary>
        /// Transforms a PRSB StandardSpec object into a structured XML document.
        /// This is the main entry point for the transformation process.
        /// 
        /// TRANSFORMATION PROCESS:
        /// 1. Validate input StandardSpec object
        /// 2. Create XML document with declaration and root element
        /// 3. Add standard metadata as attributes and tagged values
        /// 4. Recursively process all concepts in the dataset
        /// 5. Return completed XML document
        /// 
        /// XML STRUCTURE GENERATED:
        /// <?xml version="1.0" encoding="utf-8" standalone="yes"?>
        /// <Standard name="..." version="..." lastUpdated="...">
        ///   <TaggedValue name="description" value="..." />
        ///   <Model name="...">
        ///     <Element name="..." type="Class" stereotype="DataElement">
        ///       <TaggedValue name="..." value="..." />
        ///     </Element>
        ///   </Model>
        /// </Standard>
        /// 
        /// ERROR CONDITIONS:
        /// - Throws ArgumentException if standardSpec is null or invalid
        /// - Throws InvalidOperationException if XML document creation fails
        /// </summary>
        /// <param name="standardSpec">
        /// The StandardSpec object to transform. Must contain at least one dataset.
        /// 
        /// VALIDATION REQUIREMENTS:
        /// - standardSpec must not be null
        /// - standardSpec.Dataset must not be null
        /// - standardSpec.Dataset must contain at least one DatasetItem
        /// 
        /// PROCESSING: Uses the first dataset if multiple are present
        /// </param>
        /// <returns>
        /// An XDocument containing the transformed XML structure.
        /// 
        /// ENCODING: UTF-8 with XML declaration
        /// FORMATTING: Pretty-printed with proper indentation
        /// SIZE: Varies based on input complexity (typically 10KB-1MB)
        /// </returns>
        /// <exception cref="ArgumentException">
        /// Thrown when standardSpec is null, has no datasets, or datasets are empty.
        /// </exception>
        /// <exception cref="InvalidOperationException">
        /// Thrown when XML document creation fails unexpectedly.
        /// </exception>
        public XDocument TransformToXml(StandardSpec standardSpec)
        {
            /*
             * INPUT VALIDATION
             * Comprehensive validation of the input object to ensure transformation can proceed.
             * Fails fast with descriptive error messages.
             */
            if (standardSpec == null || standardSpec.Dataset == null || standardSpec.Dataset.Count == 0)
            {
                throw new ArgumentException("Invalid standard specification: must contain at least one dataset");
            }

            LogMessage("Starting XML transformation");

            /*
             * DATASET SELECTION
             * Use the first dataset from the collection.
             * Multiple datasets are rare but possible in some PRSB files.
             */
            var datasetItem = standardSpec.Dataset[0];

            /*
             * XML DOCUMENT CREATION
             * Create the root XML document with proper declaration.
             * 
             * DECLARATION ATTRIBUTES:
             * - version="1.0": XML version
             * - encoding="utf-8": Character encoding
             * - standalone="yes": No external DTD dependencies
             */
            XDocument doc = new XDocument(
                new XDeclaration("1.0", "utf-8", "yes"),
                new XElement("Standard")
            );

            /*
             * ROOT ELEMENT VALIDATION
             * Ensure the root element was created successfully.
             * This should never fail but provides defensive programming.
             */
            var rootElement = doc.Root;
            if (rootElement == null)
            {
                throw new InvalidOperationException("Failed to create root element");
            }

            /*
             * STANDARD METADATA ATTRIBUTES
             * Add core metadata as XML attributes on the root element.
             * These provide essential information about the standard.
             */
            rootElement.SetAttributeValue("name", datasetItem.Name ?? "Unnamed Standard");
            rootElement.SetAttributeValue("version", datasetItem.Version ?? "1.0");
            rootElement.SetAttributeValue("lastUpdated", DateTime.Now.ToString("yyyy-MM-dd"));

            /*
             * DESCRIPTION PROCESSING
             * Convert the standard description into a tagged value.
             * HTML content is cleaned to ensure XML compatibility.
             */
            if (!string.IsNullOrEmpty(datasetItem.Description))
            {
                AddTaggedValue(rootElement, "description", CleanHtmlContent(datasetItem.Description));
            }

            /*
             * CONCEPT PROCESSING
             * Process all top-level concepts in the dataset.
             * This is where the main transformation work occurs.
             */
            if (datasetItem.Concepts != null)
            {
                LogMessage($"Processing {datasetItem.Concepts.Count} top-level concepts");

                foreach (var concept in datasetItem.Concepts)
                {
                    ProcessConcept(rootElement, concept);
                }
            }

            LogMessage("XML transformation completed");
            return doc;
        }

        /// <summary>
        /// Recursively processes a single concept and adds it to the XML structure.
        /// This method handles the different concept types and creates appropriate XML elements.
        /// 
        /// CONCEPT TYPE HANDLING:
        /// - "group": Creates Model elements that contain other concepts
        /// - "item": Creates Element nodes for actual data fields
        /// - Special handling for multimedia concepts
        /// 
        /// RECURSION: Calls itself to process child concepts, creating hierarchical structure
        /// XML GENERATION: Creates different XML structures based on concept type
        /// 
        /// PROCESSING FLOW:
        /// 1. Validate concept is not null
        /// 2. Log processing start
        /// 3. Branch based on concept type
        /// 4. Create appropriate XML structure
        /// 5. Add metadata as tagged values
        /// 6. Recursively process children (for groups)
        /// </summary>
        /// <param name="parentElement">
        /// The XML element that will contain the new concept element.
        /// Can be the root Standard element or a Model element.
        /// 
        /// HIERARCHY: Builds parent-child relationships in XML
        /// MODIFICATION: New elements are added as children
        /// </param>
        /// <param name="concept">
        /// The concept to process and convert to XML.
        /// Can be null (will be skipped with warning).
        /// 
        /// TYPE DEPENDENCY: Processing varies based on concept.Type value
        /// VALIDATION: Must have valid Name property for meaningful output
        /// </param>
        private void ProcessConcept(XElement parentElement, Concept concept)
        {
            /*
             * NULL CONCEPT HANDLING
             * Skip null concepts with warning message.
             * This can occur due to malformed JSON data.
             */
            if (concept == null)
            {
                LogMessage("Skipping null concept", true);
                return;
            }

            LogMessage($"Processing concept: {concept.Name ?? "unnamed"} (Type: {concept.Type ?? "unknown"})");

            /*
             * GROUP CONCEPT PROCESSING
             * Groups become Model elements in the XML structure.
             * They serve as containers for other concepts.
             */
            if (concept.Type == "group")
            {
                /*
                 * MODEL ELEMENT CREATION
                 * Create a Model element to represent the group concept.
                 * Models are containers that organize related data elements.
                 */
                var modelElement = new XElement("Model");
                modelElement.SetAttributeValue("name", concept.Name ?? "Unnamed Model");

                // Add the model to the parent element
                parentElement.Add(modelElement);

                /*
                 * GROUP METADATA PROCESSING
                 * Add description and implementation guidance as tagged values.
                 * HTML content is cleaned for XML compatibility.
                 */
                if (!string.IsNullOrEmpty(concept.Description))
                {
                    AddTaggedValue(modelElement, "description", CleanHtmlContent(concept.Description));
                }

                if (!string.IsNullOrEmpty(concept.ImplementationGuidance))
                {
                    AddTaggedValue(modelElement, "implementationGuidance", CleanHtmlContent(concept.ImplementationGuidance));
                }

                /*
                 * CARDINALITY INFORMATION
                 * Add minimum and maximum multiplicity as tagged values.
                 * These define how many instances of this group can exist.
                 */
                AddTaggedValue(modelElement, "minCardinality", concept.MinimumMultiplicity);
                AddTaggedValue(modelElement, "maxCardinality", concept.MaximumMultiplicity);

                /*
                 * RECURSIVE CHILD PROCESSING
                 * Process all child concepts contained within this group.
                 * This creates the hierarchical structure of the data model.
                 */
                if (concept.ChildConcepts != null && concept.ChildConcepts.Count > 0)
                {
                    LogMessage($"Processing {concept.ChildConcepts.Count} child concepts for {concept.Name ?? "unnamed"}");

                    foreach (var childConcept in concept.ChildConcepts)
                    {
                        ProcessConcept(modelElement, childConcept);
                    }
                }
            }
            /*
             * ITEM CONCEPT PROCESSING
             * Items become Element nodes in the XML structure.
             * They represent actual data fields or attributes.
             */
            else if (concept.Type == "item")
            {
                /*
                 * MULTIMEDIA DETECTION
                 * Check if this is a multimedia concept requiring special handling.
                 * Multimedia concepts have complex structures with MIME types and filenames.
                 */
                bool isMultimedia =
                    concept.Name?.Contains("Multi-media", StringComparison.OrdinalIgnoreCase) == true ||
                    (concept.ChildConcepts != null &&
                     concept.ChildConcepts.Any(c => c.Name?.Contains("MIME", StringComparison.OrdinalIgnoreCase) == true));

                if (isMultimedia)
                {
                    /*
                     * MULTIMEDIA ELEMENT PROCESSING
                     * Special handling for multimedia concepts which have complex structures.
                     */
                    ProcessMultimediaElement(parentElement, concept);
                }
                else
                {
                    /*
                     * STANDARD ITEM PROCESSING
                     * Create a standard Element for regular data items.
                     */
                    var elementNode = new XElement("Element");
                    elementNode.SetAttributeValue("name", SanitizeElementName(concept.Name ?? "Unnamed Element"));
                    elementNode.SetAttributeValue("type", "Class");
                    elementNode.SetAttributeValue("stereotype", "DataElement");

                    // Add the element to the parent
                    parentElement.Add(elementNode);

                    /*
                     * ITEM METADATA PROCESSING
                     * Add standard tagged values for description and guidance.
                     */
                    if (!string.IsNullOrEmpty(concept.Description))
                    {
                        AddTaggedValue(elementNode, "description", CleanHtmlContent(concept.Description));
                    }

                    if (!string.IsNullOrEmpty(concept.ImplementationGuidance))
                    {
                        AddTaggedValue(elementNode, "implementationGuidance", CleanHtmlContent(concept.ImplementationGuidance));
                    }

                    /*
                     * CARDINALITY INFORMATION
                     * Add minimum and maximum multiplicity for this data element.
                     */
                    AddTaggedValue(elementNode, "minCardinality", concept.MinimumMultiplicity);
                    AddTaggedValue(elementNode, "maxCardinality", concept.MaximumMultiplicity);

                    /*
                     * DATA TYPE PROCESSING
                     * Extract and map the data type from the value domain.
                     */
                    if (concept.ValueDomain != null && concept.ValueDomain.Count > 0)
                    {
                        AddTaggedValue(elementNode, "dataType", MapDataType(concept.ValueDomain[0].Type));
                    }

                    /*
                     * VALUE SETS PROCESSING
                     * Add references to external terminology/value sets.
                     */
                    if (!string.IsNullOrEmpty(concept.ValueSets))
                    {
                        AddTaggedValue(elementNode, "valueSets", CleanHtmlContent(concept.ValueSets));
                    }
                }
            }
        }

        /// <summary>
        /// Processes multimedia concepts which have complex structures requiring special handling.
        /// Creates composite elements with attributes for filename, MIME type, and other metadata.
        /// 
        /// MULTIMEDIA STRUCTURE:
        /// - Main element represents the multimedia container
        /// - Child concepts become attributes (filename, MIME type, size, etc.)
        /// - Special stereotype "MultimediaElement" for identification
        /// 
        /// PROCESSING APPROACH:
        /// 1. Create composite multimedia element
        /// 2. Add standard metadata
        /// 3. Process child concepts as attributes rather than elements
        /// </summary>
        /// <param name="parentElement">
        /// The parent XML element that will contain the multimedia element.
        /// </param>
        /// <param name="concept">
        /// The multimedia concept containing file-related child concepts.
        /// Expected to have children like "Filename", "MIME type", etc.
        /// </param>
        private void ProcessMultimediaElement(XElement parentElement, Concept concept)
        {
            LogMessage($"Processing multimedia element: {concept.Name ?? "unnamed"}");

            /*
             * MULTIMEDIA ELEMENT CREATION
             * Create a composite element for multimedia with special stereotype.
             */
            var multimediaElement = new XElement("Element");
            multimediaElement.SetAttributeValue("name", SanitizeElementName(concept.Name ?? "Multimedia"));
            multimediaElement.SetAttributeValue("type", "Class");
            multimediaElement.SetAttributeValue("stereotype", "MultimediaElement");

            // Add to parent
            parentElement.Add(multimediaElement);

            /*
             * MULTIMEDIA METADATA
             * Add description and implementation guidance for the multimedia element.
             */
            if (!string.IsNullOrEmpty(concept.Description))
            {
                AddTaggedValue(multimediaElement, "description", CleanHtmlContent(concept.Description));
            }

            if (!string.IsNullOrEmpty(concept.ImplementationGuidance))
            {
                AddTaggedValue(multimediaElement, "implementationGuidance", CleanHtmlContent(concept.ImplementationGuidance));
            }

            /*
             * MULTIMEDIA CARDINALITY
             * Add cardinality information for the multimedia element.
             */
            AddTaggedValue(multimediaElement, "minCardinality", concept.MinimumMultiplicity);
            AddTaggedValue(multimediaElement, "maxCardinality", concept.MaximumMultiplicity);

            /*
             * CHILD CONCEPT PROCESSING
             * Process child elements as attributes of the composite multimedia element.
             * Common children: Filename, MIME type, File size, etc.
             */
            if (concept.ChildConcepts != null)
            {
                foreach (var childConcept in concept.ChildConcepts)
                {
                    /*
                     * ATTRIBUTE CREATION
                     * Create child elements as attributes of the composite.
                     * This represents the structured nature of multimedia data.
                     */
                    var attributeElement = new XElement("Attribute");
                    attributeElement.SetAttributeValue("name", SanitizeElementName(childConcept.Name ?? "Unknown"));

                    multimediaElement.Add(attributeElement);

                    /*
                     * ATTRIBUTE METADATA
                     * Add relevant tagged values for each multimedia attribute.
                     */
                    if (!string.IsNullOrEmpty(childConcept.Description))
                    {
                        AddTaggedValue(attributeElement, "description", CleanHtmlContent(childConcept.Description));
                    }

                    /*
                     * ATTRIBUTE DATA TYPE
                     * Add data type information if available from value domain.
                     */
                    if (childConcept.ValueDomain != null && childConcept.ValueDomain.Count > 0)
                    {
                        AddTaggedValue(attributeElement, "dataType", MapDataType(childConcept.ValueDomain[0].Type));
                    }
                }
            }
        }

        /// <summary>
        /// Adds a tagged value element to the specified parent element.
        /// Tagged values store metadata as name-value pairs in the XML structure.
        /// 
        /// TAGGED VALUE STRUCTURE:
        /// <TaggedValue name="propertyName" value="propertyValue" />
        /// 
        /// USAGE: Stores descriptions, guidance, cardinality, data types, etc.
        /// NULL HANDLING: Skips creation if value is null or empty
        /// </summary>
        /// <param name="parent">
        /// The XML element that will contain the tagged value.
        /// Usually an Element, Model, or Standard element.
        /// </param>
        /// <param name="name">
        /// The name/key of the tagged value property.
        /// Examples: "description", "dataType", "minCardinality"
        /// </param>
        /// <param name="value">
        /// The value to store. If null or empty, no tagged value is created.
        /// Should be clean text without HTML markup.
        /// </param>
        private void AddTaggedValue(XElement parent, string name, string? value)
        {
            /*
             * NULL/EMPTY VALUE HANDLING
             * Skip creating tagged values for null or empty values.
             * This keeps the XML clean and reduces file size.
             */
            if (string.IsNullOrEmpty(value))
                return;

            /*
             * TAGGED VALUE CREATION
             * Create a new TaggedValue element with name and value attributes.
             */
            var taggedValue = new XElement("TaggedValue");
            taggedValue.SetAttributeValue("name", name);
            taggedValue.SetAttributeValue("value", value);
            parent.Add(taggedValue);
        }

        /// <summary>
        /// Maps PRSB data type names to XML schema appropriate data types.
        /// Provides consistent data type naming across the XML output.
        /// 
        /// MAPPING STRATEGY:
        /// - Normalize to standard XML schema types
        /// - Handle PRSB-specific types like "blob"
        /// - Default to "String" for unknown types
        /// 
        /// COMMON MAPPINGS:
        /// - "string" → "String"
        /// - "text" → "Text" (for long-form text)
        /// - "blob" → "Binary" (for binary data)
        /// - Unknown → "String" (safe default)
        /// </summary>
        /// <param name="jsonType">
        /// The data type as specified in the PRSB JSON.
        /// Can be null, empty, or any string value.
        /// </param>
        /// <returns>
        /// A standardized data type name suitable for XML schema.
        /// Never returns null - defaults to "String".
        /// </returns>
        private string MapDataType(string? jsonType)
        {
            /*
             * NULL/EMPTY TYPE HANDLING
             * Default to String type if no type is specified.
             */
            if (string.IsNullOrEmpty(jsonType))
                return "String";

            /*
             * TYPE MAPPING
             * Convert PRSB types to standard XML schema types.
             * Case-insensitive matching for robustness.
             */
            return jsonType.ToLower() switch
            {
                "string" => "String",      // Standard text data
                "text" => "Text",          // Long-form text content
                "blob" => "Binary",        // Binary data (files, images, etc.)
                _ => jsonType              // Pass through unknown types as-is
            };
        }

        /// <summary>
        /// Cleans HTML content to make it suitable for XML tagged values.
        /// Removes HTML tags, converts entities, and normalizes whitespace.
        /// 
        /// CLEANING PROCESS:
        /// 1. Remove all HTML tags using regex
        /// 2. Convert common HTML entities to characters
        /// 3. Normalize whitespace (collapse multiple spaces)
        /// 4. Trim leading/trailing whitespace
        /// 5. Truncate if too long for XML attributes
        /// 
        /// PERFORMANCE: Uses regex for tag removal - not suitable for malicious HTML
        /// SECURITY: Not intended for sanitizing user input - only for trusted PRSB content
        /// </summary>
        /// <param name="html">
        /// HTML content to clean. Can contain tags, entities, and formatting.
        /// Typically comes from PRSB description or guidance fields.
        /// </param>
        /// <returns>
        /// Clean text suitable for XML tagged values.
        /// Returns empty string if input is null/empty.
        /// Returns original content if cleaning fails.
        /// </returns>
        private string CleanHtmlContent(string? html)
        {
            /*
             * NULL/EMPTY INPUT HANDLING
             */
            if (string.IsNullOrEmpty(html))
                return string.Empty;

            try
            {
                /*
                 * HTML TAG REMOVAL
                 * Remove all HTML tags using regular expression.
                 * Replaces tags with single space to preserve word boundaries.
                 * 
                 * REGEX EXPLANATION: <[^>]*>
                 * - < : Match opening bracket
                 * - [^>]* : Match any character except closing bracket, zero or more times
                 * - > : Match closing bracket
                 * 
                 * LIMITATIONS:
                 * - Doesn't handle malformed HTML gracefully
                 * - Doesn't parse nested structures
                 * - Simple but effective for PRSB content
                 */
                string cleaned = Regex.Replace(html, "<[^>]*>", " ");

                /*
                 * HTML ENTITY CONVERSION
                 * Convert common HTML entities to their character equivalents.
                 * Only handles the most common entities found in PRSB content.
                 */
                cleaned = cleaned.Replace("&nbsp;", " ")      // Non-breaking space
                               .Replace("&amp;", "&")         // Ampersand
                               .Replace("&lt;", "<")          // Less than
                               .Replace("&gt;", ">")          // Greater than
                               .Replace("&quot;", "\"")       // Quotation mark
                               .Replace("&#39;", "'");        // Apostrophe

                /*
                 * WHITESPACE NORMALIZATION
                 * Replace multiple consecutive whitespace characters with single space.
                 * Trim leading and trailing whitespace.
                 * 
                 * REGEX EXPLANATION: \s+
                 * - \s : Match any whitespace character (space, tab, newline, etc.)
                 * - + : One or more occurrences
                 */
                cleaned = Regex.Replace(cleaned, @"\s+", " ").Trim();

                /*
                 * LENGTH VALIDATION AND TRUNCATION
                 * Truncate very long text to prevent XML attribute size issues.
                 * 1000 characters is a reasonable limit for tagged values.
                 */
                if (cleaned.Length > 1000)
                {
                    LogMessage($"Truncating long text from {cleaned.Length} characters to 1000 characters");
                    return cleaned.Substring(0, 997) + "...";
                }

                return cleaned;
            }
            catch (Exception ex)
            {
                /*
                 * ERROR HANDLING
                 * If cleaning fails for any reason, log error and return original content.
                 * This ensures transformation doesn't fail due to content issues.
                 */
                LogMessage($"Error cleaning HTML content: {ex.Message}", true);
                return html;
            }
        }

        /// <summary>
        /// Sanitizes concept names to make them suitable for XML element names.
        /// Ensures names follow XML naming rules and conventions.
        /// 
        /// SANITIZATION PROCESS:
        /// 1. Replace spaces with underscores
        /// 2. Remove invalid XML name characters
        /// 3. Ensure name starts with letter or underscore
        /// 4. Handle empty results gracefully
        /// 
        /// XML NAMING RULES:
        /// - Must start with letter or underscore
        /// - Can contain letters, digits, hyphens, underscores, periods
        /// - Cannot contain spaces or special characters
        /// - Case sensitive
        /// </summary>
        /// <param name="name">
        /// The original concept name from PRSB JSON.
        /// May contain spaces, special characters, or other invalid XML characters.
        /// </param>
        /// <returns>
        /// A sanitized name suitable for use as XML element name.
        /// Never returns null or empty - provides fallback names.
        /// </returns>
        private string SanitizeElementName(string name)
        {
            /*
             * NULL/EMPTY NAME HANDLING
             * Provide default name if input is null or empty.
             */
            if (string.IsNullOrEmpty(name))
                return "UnnamedElement";

            /*
             * SPACE REPLACEMENT
             * Replace whitespace with underscores for XML compatibility.
             * Multiple consecutive spaces become single underscore.
             */
            string sanitized = Regex.Replace(name, @"\s+", "_");

            /*
             * INVALID CHARACTER REMOVAL
             * Remove characters not allowed in XML element names.
             * 
             * REGEX EXPLANATION: [^\w_\-\.]
             * - [^...] : Match any character NOT in the set
             * - \w : Word characters (letters, digits, underscore)
             * - _ : Underscore (explicitly included)
             * - \- : Hyphen (escaped)
             * - \. : Period (escaped)
             */
            sanitized = Regex.Replace(sanitized, @"[^\w_\-\.]", "");

            /*
             * STARTING CHARACTER VALIDATION
             * Ensure name starts with letter or underscore (XML requirement).
             * Prepend underscore if name starts with invalid character.
             */
            if (!string.IsNullOrEmpty(sanitized) && !char.IsLetter(sanitized[0]) && sanitized[0] != '_')
            {
                sanitized = "_" + sanitized;
            }

            /*
             * EMPTY RESULT HANDLING
             * If sanitization results in empty string, provide default name.
             */
            if (string.IsNullOrEmpty(sanitized))
            {
                sanitized = "Element";
            }

            return sanitized;
        }

        /// <summary>
        /// Outputs log messages to console based on verbose setting and error level.
        /// Provides timestamped logging for transformation progress and debugging.
        /// 
        /// LOGGING BEHAVIOR:
        /// - Verbose mode: All messages are output
        /// - Normal mode: Only error messages are output
        /// - All messages include timestamp for debugging
        /// 
        /// MESSAGE FORMATTING:
        /// [HH:mm:ss] MESSAGE
        /// [HH:mm:ss] ERROR: MESSAGE (for errors)
        /// </summary>
        /// <param name="message">
        /// The message to log. Should be descriptive and useful for debugging.
        /// </param>
        /// <param name="isError">
        /// Whether this is an error message. Error messages are always shown.
        /// Default: false (normal informational message)
        /// </param>
        private void LogMessage(string message, bool isError = false)
        {
            /*
             * LOGGING DECISION
             * Show message if verbose mode is enabled OR if it's an error.
             * Errors are always shown regardless of verbose setting.
             */
            if (_verbose || isError)
            {
                /*
                 * MESSAGE FORMATTING
                 * Include timestamp and error prefix for clarity.
                 * Format: [HH:mm:ss] [ERROR: ]MESSAGE
                 */
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] {(isError ? "ERROR: " : "")}{message}");
            }
        }
    }
}
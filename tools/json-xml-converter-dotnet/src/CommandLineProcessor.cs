/*
 * ============================================================================
 * FILE: CommandLineProcessor.cs
 * PROJECT: PRSB JSON to XML Batch Converter
 * PURPOSE: Handles batch processing of PRSB JSON files in command-line mode.
 *          Provides file discovery, conversion orchestration, progress reporting,
 *          and comprehensive error handling for automated processing scenarios.
 * 
 * CREATED: 2024 (Estimated based on project structure)
 * AUTHOR: Healthcare Standards Development Team
 * LAST MODIFIED: May 2025 (Enhanced error handling and statistics)
 * 
 * DESCRIPTION:
 *   This class encapsulates the business logic for batch processing multiple
 *   PRSB JSON files. It coordinates between file system operations, JSON loading,
 *   XML transformation, and optional schema validation. Designed for automation
 *   scenarios where human interaction is not available.
 * 
 * RESPONSIBILITIES:
 *   - Discover JSON files in input directory
 *   - Create output directory structure
 *   - Process each file individually with error isolation
 *   - Generate comprehensive processing reports
 *   - Handle schema validation when requested
 *   - Provide detailed logging and statistics
 * 
 * DEPENDENCIES:
 *   - System.IO (file system operations)
 *   - System.Xml.Linq (XML manipulation and validation)
 *   - System.Xml.Schema (XSD schema validation)
 *   - JsonLoader.cs (JSON file processing)
 *   - XmlTransformer.cs (XML generation)
 *   - Model.cs (data structures)
 * 
 * ERROR STRATEGY:
 *   - Fail-fast for critical errors (missing directories)
 *   - Fail-safe for individual file errors (continue processing other files)
 *   - Comprehensive logging for troubleshooting
 * ============================================================================
 */

using System;
using System.IO;
using System.Linq;
using System.Xml.Linq;
using System.Xml.Schema;

namespace PrsbJsonToXml
{
    /// <summary>
    /// Handles batch processing of PRSB JSON files for command-line automation scenarios.
    /// 
    /// DESIGN PRINCIPLES:
    /// - Single Responsibility: Only handles command-line batch processing
    /// - Error Isolation: Individual file failures don't stop batch processing
    /// - Progress Transparency: Detailed logging and statistics
    /// - Configuration: Supports verbose logging and schema validation
    /// 
    /// USAGE PATTERN:
    /// 1. Create instance with logging preferences
    /// 2. Call ProcessBatchFiles with directories and optional schema
    /// 3. Monitor console output for progress and results
    /// 
    /// THREAD SAFETY: Not thread-safe - create separate instances for concurrent processing
    /// STATEFUL: Maintains verbose logging setting across operations
    /// </summary>
    public class CommandLineProcessor
    {
        /// <summary>
        /// Controls whether verbose logging is enabled for this processor instance.
        /// When true, detailed progress information is output to console during processing.
        /// 
        /// IMPACT:
        /// - Progress messages for each processing step
        /// - File statistics and timing information
        /// - Stack traces for errors (debugging)
        /// - XML validation details
        /// 
        /// PERFORMANCE: Minimal impact - console I/O is fast relative to file processing
        /// DEBUGGING: Essential for troubleshooting conversion issues
        /// </summary>
        private readonly bool _verboseLogging;

        /// <summary>
        /// Initializes a new instance of the CommandLineProcessor.
        /// 
        /// DESIGN: Simple constructor focusing on configuration
        /// IMMUTABLE: Verbose setting cannot be changed after construction
        /// </summary>
        /// <param name="verboseLogging">
        /// Whether to enable verbose logging output.
        /// 
        /// TRUE: Detailed progress messages, statistics, and debug information
        /// FALSE: Only essential messages (file counts, errors, summary)
        /// DEFAULT: false (quiet mode for production automation)
        /// </param>
        public CommandLineProcessor(bool verboseLogging = false)
        {
            _verboseLogging = verboseLogging;
        }

        /// <summary>
        /// Processes all JSON files in the specified input directory and converts them to XML.
        /// This is the main orchestration method for batch processing operations.
        /// 
        /// PROCESSING WORKFLOW:
        /// 1. Validate and create output directory
        /// 2. Discover all JSON files in input directory
        /// 3. Process each file individually with error isolation
        /// 4. Generate comprehensive statistics and summary
        /// 5. Report overall success/failure status
        /// 
        /// ERROR HANDLING STRATEGY:
        /// - Critical errors (missing directories): Immediate failure
        /// - Individual file errors: Log and continue with other files
        /// - Schema validation errors: Log but still save XML output
        /// 
        /// PERFORMANCE CHARACTERISTICS:
        /// - Sequential processing (not parallelized)
        /// - Memory usage scales with largest individual file
        /// - I/O bound operation (disk reads/writes dominate)
        /// </summary>
        /// <param name="inputDirectory">
        /// Path to directory containing JSON files to convert.
        /// 
        /// REQUIREMENTS:
        /// - Must exist and be accessible
        /// - Should contain .json files
        /// - Searched recursively (TopDirectoryOnly)
        /// 
        /// VALIDATION: Existence checked before processing begins
        /// </param>
        /// <param name="outputDirectory">
        /// Path to directory where XML files will be saved.
        /// 
        /// BEHAVIOR:
        /// - Created automatically if doesn't exist
        /// - Existing files may be overwritten
        /// - Output files have same name as input with .xml extension
        /// 
        /// PERMISSIONS: Must have write access
        /// </param>
        /// <param name="schemaPath">
        /// Optional path to XSD schema file for XML validation.
        /// 
        /// VALIDATION BEHAVIOR:
        /// - null: No validation performed
        /// - Valid path: XML validated against schema
        /// - Invalid path: Warning logged, no validation
        /// 
        /// ERROR HANDLING: Validation failures logged but don't prevent output
        /// </param>
        public void ProcessBatchFiles(string inputDirectory, string outputDirectory, string? schemaPath)
        {
            /*
             * OUTPUT DIRECTORY CREATION
             * Ensure the destination directory exists before processing begins.
             * Create directory structure if needed.
             * 
             * RATIONALE: Fail early if we can't write outputs
             * PERMISSIONS: Requires write access to parent directory
             */
            if (!Directory.Exists(outputDirectory))
            {
                Console.WriteLine($"Creating output directory: {outputDirectory}");
                try
                {
                    Directory.CreateDirectory(outputDirectory);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error creating output directory: {ex.Message}");
                    return;  // Critical failure - cannot continue
                }
            }

            /*
             * INPUT FILE DISCOVERY
             * Find all JSON files in the input directory for processing.
             * Uses TopDirectoryOnly to avoid recursive subdirectory scanning.
             * 
             * SEARCH PATTERN: "*.json" (case-insensitive on Windows)
             * SCOPE: Current directory only (not subdirectories)
             * PERFORMANCE: Fast for directories with reasonable file counts
             */
            string[] jsonFiles;
            try
            {
                jsonFiles = Directory.GetFiles(inputDirectory, "*.json", SearchOption.TopDirectoryOnly);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error accessing input directory '{inputDirectory}': {ex.Message}");
                return;  // Critical failure - cannot continue
            }

            /*
             * EMPTY DIRECTORY HANDLING
             * Check if any JSON files were found and handle empty directory case.
             * This is not an error condition, just nothing to do.
             */
            if (jsonFiles.Length == 0)
            {
                Console.WriteLine($"No JSON files found in directory: {inputDirectory}");
                return;  // Normal completion - nothing to process
            }

            /*
             * PROCESSING INITIALIZATION
             * Display processing start information and initialize counters.
             */
            Console.WriteLine($"Found {jsonFiles.Length} JSON file(s) to process");
            Console.WriteLine();

            /*
             * STATISTICS TRACKING
             * Initialize counters for processing summary.
             * These track success/failure rates for final reporting.
             */
            int successCount = 0;  // Successfully converted files
            int errorCount = 0;    // Files that failed to convert

            /*
             * MAIN PROCESSING LOOP
             * Process each JSON file individually with error isolation.
             * Individual file failures don't stop processing of remaining files.
             */
            foreach (string jsonFile in jsonFiles)
            {
                try
                {
                    /*
                     * OUTPUT FILE PATH GENERATION
                     * Generate corresponding XML filename in output directory.
                     * Preserves original filename but changes extension.
                     */
                    string fileName = Path.GetFileNameWithoutExtension(jsonFile);
                    string outputFile = Path.Combine(outputDirectory, fileName + ".xml");

                    /*
                     * PROGRESS INDICATION
                     * Show which file is currently being processed.
                     */
                    Console.WriteLine($"Processing: {Path.GetFileName(jsonFile)}");

                    /*
                     * INDIVIDUAL FILE PROCESSING
                     * Attempt to convert this specific file.
                     * Returns success/failure status.
                     */
                    if (ProcessSingleFile(jsonFile, outputFile, schemaPath))
                    {
                        successCount++;
                        Console.WriteLine($"  ✓ Successfully converted to: {Path.GetFileName(outputFile)}");
                    }
                    else
                    {
                        errorCount++;
                        Console.WriteLine($"  ✗ Failed to convert: {Path.GetFileName(jsonFile)}");
                    }
                }
                catch (Exception ex)
                {
                    /*
                     * UNEXPECTED ERROR HANDLING
                     * Catch any errors not handled by ProcessSingleFile.
                     * Log error and continue with next file.
                     */
                    errorCount++;
                    Console.WriteLine($"  ✗ Error processing {Path.GetFileName(jsonFile)}: {ex.Message}");

                    /*
                     * VERBOSE ERROR DETAILS
                     * In verbose mode, show stack trace for debugging.
                     */
                    if (_verboseLogging)
                    {
                        Console.WriteLine($"    Stack trace: {ex.StackTrace}");
                    }
                }

                /*
                 * PROGRESS SPACING
                 * Add blank line between files for readability.
                 */
                Console.WriteLine();
            }

            /*
             * FINAL SUMMARY GENERATION
             * Display comprehensive statistics about the batch processing run.
             * Helps users understand overall success rate and identify issues.
             */
            Console.WriteLine("Batch Processing Summary:");
            Console.WriteLine($"  Total files: {jsonFiles.Length}");
            Console.WriteLine($"  Successful: {successCount}");
            Console.WriteLine($"  Errors: {errorCount}");

            /*
             * SUCCESS RATE ANALYSIS AND MESSAGING
             * Provide appropriate summary message based on results.
             * Different messages for complete success, partial success, and complete failure.
             */
            if (errorCount == 0)
            {
                /*
                 * COMPLETE SUCCESS
                 * All files processed without errors.
                 */
                Console.WriteLine("All files processed successfully!");
            }
            else if (successCount > 0)
            {
                /*
                 * PARTIAL SUCCESS
                 * Some files succeeded, some failed.
                 * Common scenario with mixed file quality.
                 */
                Console.WriteLine("Batch processing completed with some errors.");
            }
            else
            {
                /*
                 * COMPLETE FAILURE
                 * No files were successfully processed.
                 * Indicates systematic problem (bad input format, permissions, etc.).
                 */
                Console.WriteLine("Batch processing failed - no files were converted successfully.");
            }
        }

        /// <summary>
        /// Processes a single JSON file and converts it to XML format.
        /// Handles the complete conversion pipeline for one file with comprehensive error handling.
        /// 
        /// CONVERSION PIPELINE:
        /// 1. Load and parse JSON file
        /// 2. Validate JSON structure and content
        /// 3. Transform to XML using XmlTransformer
        /// 4. Optionally validate XML against schema
        /// 5. Save XML to output file
        /// 6. Generate statistics (in verbose mode)
        /// 
        /// ERROR ISOLATION:
        /// - Errors in this method don't affect other files
        /// - Returns false on any failure
        /// - Logs detailed error information
        /// 
        /// PERFORMANCE:
        /// - Memory usage scales with file size
        /// - CPU intensive during JSON parsing and XML generation
        /// - I/O intensive during file operations
        /// </summary>
        /// <param name="inputPath">
        /// Full path to the JSON file to process.
        /// Must exist and be readable.
        /// </param>
        /// <param name="outputPath">
        /// Full path where the XML file should be saved.
        /// Directory must exist and be writable.
        /// </param>
        /// <param name="schemaPath">
        /// Optional path to XSD schema for validation.
        /// If provided and valid, XML will be validated.
        /// </param>
        /// <returns>
        /// True if the file was successfully converted and saved.
        /// False if any step in the pipeline failed.
        /// </returns>
        private bool ProcessSingleFile(string inputPath, string outputPath, string? schemaPath)
        {
            try
            {
                /*
                 * VERBOSE PROGRESS LOGGING
                 * Show detailed steps in verbose mode for debugging.
                 */
                if (_verboseLogging)
                {
                    Console.WriteLine($"    Loading JSON from: {inputPath}");
                }

                /*
                 * JSON LOADING AND PARSING
                 * Load the JSON file and deserialize into StandardSpec object.
                 * JsonLoader handles file I/O and JSON parsing errors.
                 */
                StandardSpec? standard = JsonLoader.LoadFromFile(inputPath);

                /*
                 * JSON VALIDATION
                 * Ensure the loaded data is valid and contains required content.
                 * Check for null results, empty datasets, or missing required data.
                 */
                if (standard == null || standard.Dataset == null || standard.Dataset.Count == 0)
                {
                    Console.WriteLine($"    Failed to parse JSON input or dataset is empty in file: {Path.GetFileName(inputPath)}");
                    return false;
                }

                /*
                 * DATASET EXTRACTION
                 * Get the first (and typically only) dataset from the standard.
                 * Multiple datasets are rare but the structure supports them.
                 */
                var dataset = standard.Dataset[0];

                /*
                 * VERBOSE DATASET INFORMATION
                 * Show details about what was loaded.
                 */
                if (_verboseLogging)
                {
                    Console.WriteLine($"    Loaded standard: {dataset.Name ?? "Unnamed"} v{dataset.Version ?? "Unknown"}");
                    Console.WriteLine($"    Transforming to XML...");
                }

                /*
                 * XML TRANSFORMATION
                 * Convert the StandardSpec object to XML format.
                 * XmlTransformer handles concept processing and XML generation.
                 */
                XmlTransformer transformer = new XmlTransformer(_verboseLogging);
                var xmlDoc = transformer.TransformToXml(standard);

                /*
                 * OPTIONAL SCHEMA VALIDATION
                 * If schema path is provided and valid, validate the generated XML.
                 * Validation errors are logged but don't prevent saving the XML.
                 */
                if (!string.IsNullOrEmpty(schemaPath) && File.Exists(schemaPath))
                {
                    if (_verboseLogging)
                    {
                        Console.WriteLine($"    Validating XML against schema: {schemaPath}");
                    }

                    if (ValidateXmlAgainstSchema(xmlDoc, schemaPath))
                    {
                        if (_verboseLogging)
                        {
                            Console.WriteLine("    XML validation successful!");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"    XML validation failed for {Path.GetFileName(inputPath)}. Output will still be saved.");
                    }
                }

                /*
                 * XML FILE SAVING
                 * Write the generated XML to the output file.
                 * This is the final step in the conversion process.
                 */
                if (_verboseLogging)
                {
                    Console.WriteLine($"    Saving XML to: {outputPath}");
                }

                xmlDoc.Save(outputPath);

                /*
                 * VERBOSE STATISTICS
                 * In verbose mode, show detailed statistics about the generated XML.
                 * Helps assess the complexity and content of the conversion.
                 */
                if (_verboseLogging)
                {
                    PrintStatistics(xmlDoc);
                }

                return true;  // Successful completion
            }
            catch (Exception ex)
            {
                /*
                 * COMPREHENSIVE ERROR HANDLING
                 * Catch any errors that occur during the conversion process.
                 * Log error details and return failure status.
                 */
                Console.WriteLine($"    Error processing file: {ex.Message}");

                /*
                 * VERBOSE ERROR DIAGNOSTICS
                 * In verbose mode, show stack trace for debugging.
                 */
                if (_verboseLogging)
                {
                    Console.WriteLine($"    Stack trace: {ex.StackTrace}");
                }

                return false;  // Conversion failed
            }
        }

        /// <summary>
        /// Validates an XML document against an XSD schema file.
        /// Provides detailed validation error reporting in verbose mode.
        /// 
        /// VALIDATION PROCESS:
        /// 1. Load XSD schema from file
        /// 2. Create XML schema set
        /// 3. Validate document and collect errors
        /// 4. Report validation results
        /// 
        /// ERROR HANDLING:
        /// - Schema file errors: Logged and validation skipped
        /// - Validation errors: Collected and reported
        /// - System errors: Logged and false returned
        /// 
        /// PERFORMANCE: CPU intensive for large XML documents
        /// </summary>
        /// <param name="document">
        /// The XML document to validate.
        /// Must be a complete, well-formed XML document.
        /// </param>
        /// <param name="schemaPath">
        /// Path to the XSD schema file.
        /// Must exist and be a valid XSD schema.
        /// </param>
        /// <returns>
        /// True if the document is valid according to the schema.
        /// False if validation fails or errors occur.
        /// </returns>
        private bool ValidateXmlAgainstSchema(XDocument document, string schemaPath)
        {
            try
            {
                /*
                 * SCHEMA LOADING
                 * Load the XSD schema file into a schema set.
                 * Empty namespace indicates the default schema namespace.
                 */
                XmlSchemaSet schemas = new XmlSchemaSet();
                schemas.Add("", schemaPath);

                /*
                 * VALIDATION STATE TRACKING
                 * Track whether any validation errors occurred.
                 */
                bool isValid = true;

                /*
                 * DOCUMENT VALIDATION
                 * Validate the document against the loaded schema.
                 * Use callback to collect validation errors.
                 */
                document.Validate(schemas, (sender, args) => {
                    /*
                     * VALIDATION ERROR HANDLING
                     * Called for each validation error found.
                     * In verbose mode, show detailed error information.
                     */
                    if (_verboseLogging)
                    {
                        Console.WriteLine($"    Validation Error: {args.Message}");
                    }
                    isValid = false;  // Mark validation as failed
                });

                return isValid;
            }
            catch (Exception ex)
            {
                /*
                 * SCHEMA VALIDATION ERROR HANDLING
                 * Handle errors in the validation process itself.
                 * Common causes: invalid schema file, file access errors.
                 */
                if (_verboseLogging)
                {
                    Console.WriteLine($"    Schema validation error: {ex.Message}");
                }
                return false;
            }
        }

        /// <summary>
        /// Prints detailed statistics about the generated XML document.
        /// Provides insights into the complexity and content of the conversion.
        /// Only called in verbose mode to avoid cluttering normal output.
        /// 
        /// STATISTICS GENERATED:
        /// - Model count (groups converted)
        /// - Element count (items converted)
        /// - Attribute count (multimedia attributes)
        /// - Tagged value count (metadata items)
        /// - Total character count (file size indicator)
        /// 
        /// PURPOSE: Helps assess conversion quality and debug issues
        /// PERFORMANCE: Lightweight - uses LINQ queries on in-memory XML
        /// </summary>
        /// <param name="document">
        /// The XML document to analyze.
        /// Must have a valid root element.
        /// </param>
        private void PrintStatistics(XDocument document)
        {
            /*
             * ROOT ELEMENT VALIDATION
             * Ensure document has a root element before analyzing.
             */
            if (document.Root == null)
                return;

            /*
             * STATISTICS CALCULATION
             * Use LINQ queries to count different types of XML elements.
             * These counts reflect the structure and complexity of the converted standard.
             */
            int modelCount = document.Root.Elements("Model").Count();                    // Group concepts
            int elementCount = document.Descendants("Element").Count();                 // Item concepts
            int attributeCount = document.Descendants("Attribute").Count();             // Multimedia attributes
            int taggedValueCount = document.Descendants("TaggedValue").Count();         // Metadata items

            /*
             * STATISTICS DISPLAY
             * Format and display the collected statistics.
             * Provides insight into the content and complexity.
             */
            Console.WriteLine($"    XML Statistics:");
            Console.WriteLine($"      Models: {modelCount}");
            Console.WriteLine($"      Elements: {elementCount}");
            Console.WriteLine($"      Attributes: {attributeCount}");
            Console.WriteLine($"      Tagged Values: {taggedValueCount}");
            Console.WriteLine($"      Total Size: {document.ToString().Length:N0} characters");
        }
    }
}
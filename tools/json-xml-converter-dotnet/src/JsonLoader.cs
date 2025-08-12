/*
 * ============================================================================
 * FILE: JsonLoader.cs
 * PROJECT: PRSB JSON to XML Batch Converter
 * PURPOSE: Provides functionality to load and deserialize PRSB JSON standard 
 *          files into strongly-typed C# objects. Handles file I/O and JSON 
 *          parsing with error handling and validation.
 * 
 * CREATED: 2024 (Estimated based on project structure)
 * AUTHOR: Healthcare Standards Development Team
 * LAST MODIFIED: May 2025 (Error fixes for nullable types)
 * 
 * DESCRIPTION:
 *   This utility class encapsulates the logic for reading JSON files from disk
 *   and converting them into StandardSpec objects using Newtonsoft.Json.
 *   It provides a simple, static interface for the conversion process while
 *   handling common errors like file not found, invalid JSON, and parsing failures.
 * 
 * DEPENDENCIES:
 *   - System.IO (for file operations)
 *   - Newtonsoft.Json (for JSON deserialization)
 *   - Model.cs (for StandardSpec class definition)
 * 
 * ERROR HANDLING:
 *   - Returns null on any error condition
 *   - Writes error messages to console
 *   - Catches and handles file I/O exceptions
 *   - Catches and handles JSON parsing exceptions
 * 
 * THREAD SAFETY: 
 *   Static methods are thread-safe as they don't maintain state
 * ============================================================================
 */

using System;
using System.IO;
using Newtonsoft.Json;

namespace PrsbJsonToXml
{
    /// <summary>
    /// Static utility class responsible for loading PRSB JSON standard files
    /// and converting them into strongly-typed C# objects.
    /// 
    /// DESIGN PATTERN: Static utility class (no instantiation required)
    /// RESPONSIBILITY: Single responsibility - JSON file loading only
    /// ERROR STRATEGY: Fail-safe - returns null on any error with console logging
    /// </summary>
    public class JsonLoader
    {
        /// <summary>
        /// Loads a PRSB JSON standard file from disk and deserializes it into a StandardSpec object.
        /// This is the main entry point for converting JSON files into usable C# objects.
        /// 
        /// PROCESS FLOW:
        /// 1. Read the entire JSON file content into memory as a string
        /// 2. Use Newtonsoft.Json to deserialize the string into StandardSpec
        /// 3. Return the resulting object or null if any step fails
        /// 
        /// ERROR HANDLING:
        /// - File not found: Returns null, logs error
        /// - Permission denied: Returns null, logs error  
        /// - Invalid JSON syntax: Returns null, logs error
        /// - JSON structure doesn't match model: Returns null, logs error
        /// 
        /// PERFORMANCE CONSIDERATIONS:
        /// - Entire file is loaded into memory (not suitable for very large files)
        /// - JSON parsing is CPU-intensive for large documents
        /// - No streaming or incremental parsing
        /// 
        /// MEMORY USAGE:
        /// - Temporarily holds entire file content in memory as string
        /// - Creates full object graph in memory
        /// - No lazy loading of properties
        /// </summary>
        /// <param name="filePath">
        /// Full or relative path to the JSON file to be loaded.
        /// 
        /// REQUIREMENTS:
        /// - Must be a valid file system path
        /// - File must exist and be readable
        /// - File must contain valid JSON
        /// - JSON must conform to PRSB standard structure
        /// 
        /// EXAMPLES:
        /// - "C:\\Standards\\patient-summary.json"
        /// - "./data/urgent-care.json"
        /// - "standards/discharge-summary-v2.json"
        /// </param>
        /// <returns>
        /// A StandardSpec object containing the parsed JSON data, or null if loading/parsing failed.
        /// 
        /// SUCCESS: Returns populated StandardSpec with Dataset property containing parsed concepts
        /// FAILURE: Returns null (check console for error messages)
        /// 
        /// VALIDATION: Caller should check for null return and validate Dataset property
        /// </returns>
        public static StandardSpec? LoadFromFile(string filePath)
        {
            try
            {
                /* 
                 * STEP 1: FILE READING
                 * Read the entire JSON file content into a string.
                 * This approach is simple but loads the entire file into memory.
                 * 
                 * ALTERNATIVES CONSIDERED:
                 * - StreamReader: Same memory usage, more complex code
                 * - JsonTextReader: Streaming, but complex for this use case
                 * 
                 * ENCODING: File.ReadAllText uses UTF-8 with BOM detection by default
                 * EXCEPTIONS: Throws IOException, UnauthorizedAccessException, etc.
                 */
                string jsonContent = File.ReadAllText(filePath);

                /* 
                 * STEP 2: JSON DESERIALIZATION
                 * Convert the JSON string into a StandardSpec object using Newtonsoft.Json.
                 * 
                 * SERIALIZATION SETTINGS: Uses default settings
                 * - NullValueHandling: Include (preserves null properties)
                 * - MissingMemberHandling: Ignore (unknown JSON properties ignored)
                 * - Case sensitivity: Case-insensitive property matching
                 * 
                 * CUSTOM ATTRIBUTES: Uses JsonProperty attributes defined in model classes
                 * TYPE MAPPING: Automatic based on property types and JsonProperty names
                 * 
                 * PERFORMANCE: Single-pass parsing, builds complete object graph
                 */
                return JsonConvert.DeserializeObject<StandardSpec>(jsonContent);
            }
            catch (FileNotFoundException ex)
            {
                /*
                 * FILE NOT FOUND ERROR HANDLING
                 * Occurs when the specified file path doesn't exist.
                 * 
                 * COMMON CAUSES:
                 * - Incorrect file path
                 * - File was moved or deleted
                 * - Typo in filename
                 * - Relative path resolved incorrectly
                 */
                Console.WriteLine($"Error: JSON file not found at path '{filePath}': {ex.Message}");
                return null;
            }
            catch (UnauthorizedAccessException ex)
            {
                /*
                 * PERMISSION ERROR HANDLING
                 * Occurs when the application doesn't have permission to read the file.
                 * 
                 * COMMON CAUSES:
                 * - File is locked by another process
                 * - Insufficient user permissions
                 * - File is on a network drive with access restrictions
                 * - Antivirus software blocking access
                 */
                Console.WriteLine($"Error: Access denied when reading JSON file '{filePath}': {ex.Message}");
                return null;
            }
            catch (JsonException ex)
            {
                /*
                 * JSON PARSING ERROR HANDLING
                 * Occurs when the file contains invalid JSON syntax or structure.
                 * 
                 * COMMON CAUSES:
                 * - Missing quotes around property names
                 * - Trailing commas
                 * - Unclosed brackets or braces
                 * - Invalid escape sequences
                 * - Non-UTF8 encoding issues
                 * 
                 * DEBUGGING TIPS:
                 * - JsonException message usually contains line/position information
                 * - Check for common JSON syntax errors
                 * - Validate file encoding (should be UTF-8)
                 */
                Console.WriteLine($"Error: Invalid JSON format in file '{filePath}': {ex.Message}");

                /*
                 * ADDITIONAL JSON ERROR CONTEXT
                 * Include inner exception details if available for more context.
                 */
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"  Inner exception: {ex.InnerException.Message}");
                }

                return null;
            }
            catch (Exception ex)
            {
                /*
                 * GENERAL ERROR HANDLING
                 * Catches any other unexpected errors during the loading process.
                 * 
                 * POSSIBLE CAUSES:
                 * - Out of memory (very large files)
                 * - Disk I/O errors
                 * - Network issues (for network paths)
                 * - Corrupted file system
                 * - .NET runtime issues
                 * 
                 * LOGGING: Provides full exception details for debugging
                 */
                Console.WriteLine($"Error loading JSON file '{filePath}': {ex.Message}");

                // Include inner exception details if available
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"  Inner exception: {ex.InnerException.Message}");
                }

                return null;
            }
        }

        /*
         * ADDITIONAL METHODS THAT COULD BE ADDED:
         * 
         * public static async Task<StandardSpec?> LoadFromFileAsync(string filePath)
         * - Asynchronous version for better UI responsiveness
         * 
         * public static StandardSpec? LoadFromStream(Stream stream)
         * - Load from any stream source (network, memory, etc.)
         * 
         * public static bool ValidateJsonStructure(string filePath)
         * - Validate JSON structure without full deserialization
         * 
         * public static StandardSpec? LoadWithCustomSettings(string filePath, JsonSerializerSettings settings)
         * - Allow custom JSON serialization settings
         */
    }
}
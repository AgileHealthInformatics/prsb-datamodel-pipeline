/*
 * ============================================================================
 * FILE: Program.cs
 * PROJECT: PRSB JSON to XML Batch Converter
 * PURPOSE: Main application entry point providing both GUI and command-line
 *          interfaces for converting PRSB JSON standards to XML format.
 *          Supports automation scenarios and interactive user workflows.
 * 
 * CREATED: 2024 (Estimated based on project structure)
 * AUTHOR: Healthcare Standards Development Team
 * LAST MODIFIED: May 2025 (Enhanced command line argument parsing)
 * 
 * DESCRIPTION:
 *   This is the main entry point for the PRSB JSON to XML converter application.
 *   It provides a dual-mode interface:
 *   1. GUI Mode (default): Windows Forms interface for interactive use
 *   2. Command Line Mode: Automated processing for batch operations
 * 
 *   The application automatically detects whether command line arguments are
 *   provided and switches between modes accordingly.
 * 
 * EXECUTION MODES:
 *   GUI Mode: Double-click executable or run without arguments
 *   CLI Mode: Run with command line arguments for automation
 * 
 * DEPENDENCIES:
 *   - System.Windows.Forms (for GUI mode)
 *   - CommandLineProcessor.cs (for CLI processing)
 *   - MainForm.cs (for GUI interface)
 * 
 * THREAD MODEL:
 *   - GUI Mode: STA (Single Threaded Apartment) for Windows Forms
 *   - CLI Mode: Console application threading
 * ============================================================================
 */

using System;
using System.Windows.Forms;

namespace PrsbJsonToXml
{
    /// <summary>
    /// Main program class containing the application entry point.
    /// Provides routing between GUI and command-line modes based on startup arguments.
    /// 
    /// DESIGN PATTERN: Facade pattern - provides simple interface to complex subsystems
    /// RESPONSIBILITY: Application bootstrapping and mode selection
    /// THREAD SAFETY: Not applicable - single-threaded entry point
    /// </summary>
    class Program
    {
        /// <summary>
        /// Main application entry point. Determines execution mode based on command line arguments.
        /// 
        /// EXECUTION FLOW:
        /// 1. Set up Windows Forms environment (required even for CLI mode detection)
        /// 2. Check for command line arguments
        /// 3. Route to appropriate mode (GUI or CLI)
        /// 4. Handle any startup errors gracefully
        /// 
        /// THREAD ATTRIBUTES:
        /// [STAThread] - Required for Windows Forms GUI mode
        /// Enables Single Threaded Apartment model for COM interop
        /// 
        /// ARGUMENT PROCESSING:
        /// - No arguments: Launch GUI mode
        /// - Any arguments: Launch CLI mode with argument parsing
        /// 
        /// ERROR HANDLING:
        /// - GUI errors: Handled by Windows Forms framework
        /// - CLI errors: Handled by CommandLineProcessor
        /// - Startup errors: Console output with exit codes
        /// </summary>
        /// <param name="args">
        /// Command line arguments passed to the application.
        /// 
        /// ARGUMENT STRUCTURE:
        /// args[0]: Input directory path (required for CLI mode)
        /// args[1]: Output directory path (required for CLI mode)
        /// args[2+]: Optional flags and parameters
        /// 
        /// SUPPORTED FLAGS:
        /// -v, --verbose: Enable detailed logging
        /// -s, --schema: Specify XML schema file for validation
        /// 
        /// EXAMPLES:
        /// No args: GUI mode
        /// "C:\Input" "C:\Output": Basic CLI conversion
        /// "C:\Input" "C:\Output" -v: CLI with verbose logging
        /// "C:\Input" "C:\Output" -s "schema.xsd": CLI with validation
        /// </param>
        [STAThread]  // Single Threaded Apartment - required for Windows Forms
        static void Main(string[] args)
        {
            /*
             * WINDOWS FORMS INITIALIZATION
             * Set up the Windows Forms environment for GUI mode.
             * These settings improve visual appearance and compatibility.
             * 
             * EnableVisualStyles(): Enables Windows XP/Vista/7+ visual themes
             * SetCompatibleTextRenderingDefault(): Uses GDI+ for text rendering (better quality)
             * 
             * NOTE: These are called even in CLI mode because the mode detection
             * happens after Forms initialization, and they have no effect in CLI mode.
             */
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            /*
             * MODE DETECTION AND ROUTING
             * Determine whether to run in GUI or CLI mode based on command line arguments.
             * 
             * LOGIC:
             * - If any arguments provided: CLI mode (automation/scripting)
             * - If no arguments provided: GUI mode (interactive use)
             * 
             * RATIONALE:
             * This approach allows the same executable to serve both purposes:
             * - Users can double-click for GUI
             * - Scripts can call with arguments for automation
             */
            if (args.Length > 0)
            {
                /*
                 * COMMAND LINE MODE
                 * Process files using command line arguments for automation scenarios.
                 * Suitable for batch processing, scheduled tasks, and integration scripts.
                 */
                RunCommandLineMode(args);
            }
            else
            {
                /*
                 * GUI MODE
                 * Launch the Windows Forms interface for interactive use.
                 * Provides user-friendly file selection, progress display, and error handling.
                 * 
                 * Application.Run() starts the Windows message loop and blocks until
                 * the main form is closed by the user.
                 */
                Application.Run(new MainForm());
            }
        }

        /// <summary>
        /// Executes the application in command line mode for automated batch processing.
        /// Parses command line arguments and delegates to CommandLineProcessor for actual work.
        /// 
        /// USAGE SCENARIOS:
        /// - Automated build processes
        /// - Scheduled batch conversions
        /// - Integration with other healthcare systems
        /// - Continuous integration pipelines
        /// 
        /// ARGUMENT PARSING:
        /// Uses simple linear parsing with flag detection
        /// Supports both short (-v) and long (--verbose) flag formats
        /// Positional arguments must come before flags
        /// 
        /// ERROR HANDLING:
        /// - Missing required arguments: Shows usage and exits
        /// - Invalid file paths: Handled by CommandLineProcessor
        /// - Processing errors: Handled by CommandLineProcessor
        /// </summary>
        /// <param name="args">
        /// Command line arguments to parse and process.
        /// Expected format: [input_dir] [output_dir] [flags...]
        /// </param>
        static void RunCommandLineMode(string[] args)
        {
            /*
             * COMMAND LINE INTERFACE HEADER
             * Display application identification and mode indicator.
             * Helps users confirm they're running the correct version and mode.
             */
            Console.WriteLine("PRSB JSON to XML Batch Converter (Command Line Mode)");
            Console.WriteLine("=====================================================");

            /*
             * ARGUMENT VARIABLES INITIALIZATION
             * Set up variables to store parsed command line arguments.
             * Use defaults that indicate "not set" state.
             */
            string inputDirectory = "";      // Required: Source directory containing JSON files
            string outputDirectory = "";     // Required: Destination directory for XML files
            string? schemaPath = null;       // Optional: XSD schema file for validation
            bool verboseLogging = false;     // Optional: Enable detailed progress logging

            /*
             * COMMAND LINE ARGUMENT PARSING
             * Process arguments in order, handling both positional and flag arguments.
             * 
             * PARSING STRATEGY:
             * 1. Iterate through all arguments in order
             * 2. Check for flags first (they can appear anywhere)
             * 3. Assign positional arguments in order
             * 4. Handle flag parameters (arguments that follow flags)
             * 
             * SUPPORTED PATTERNS:
             * - Flags: -v, --verbose, -s, --schema
             * - Flag with parameter: -s schema.xsd, --schema schema.xsd
             * - Positional: input_dir output_dir
             */
            for (int i = 0; i < args.Length; i++)
            {
                /*
                 * VERBOSE FLAG DETECTION
                 * Enable detailed logging output during processing.
                 * Supports both short and long flag formats.
                 */
                if (args[i] == "-v" || args[i] == "--verbose")
                {
                    verboseLogging = true;
                }
                /*
                 * SCHEMA FLAG DETECTION
                 * Specify XML schema file for validation.
                 * Requires a parameter (the schema file path).
                 * 
                 * PARAMETER HANDLING:
                 * - Check if next argument exists
                 * - Consume next argument as schema path
                 * - Increment counter to skip parameter in next iteration
                 */
                else if (args[i] == "-s" || args[i] == "--schema")
                {
                    if (i + 1 < args.Length)
                    {
                        schemaPath = args[++i];  // Pre-increment to consume parameter
                    }
                    else
                    {
                        /*
                         * MISSING PARAMETER ERROR
                         * Schema flag provided without file path parameter.
                         */
                        Console.WriteLine("Error: Schema flag requires a file path parameter.");
                        ShowUsageAndExit();
                        return;
                    }
                }
                /*
                 * POSITIONAL ARGUMENT HANDLING
                 * Process arguments that aren't flags in order.
                 * First non-flag argument: input directory
                 * Second non-flag argument: output directory
                 */
                else if (string.IsNullOrEmpty(inputDirectory))
                {
                    inputDirectory = args[i];
                }
                else if (string.IsNullOrEmpty(outputDirectory))
                {
                    outputDirectory = args[i];
                }
                else
                {
                    /*
                     * UNEXPECTED ARGUMENT WARNING
                     * More arguments provided than expected.
                     * Could indicate user error or unsupported usage.
                     */
                    Console.WriteLine($"Warning: Unexpected argument '{args[i]}' ignored.");
                }
            }

            /*
             * REQUIRED ARGUMENT VALIDATION
             * Ensure both input and output directories were provided.
             * These are mandatory for command line operation.
             */
            if (string.IsNullOrEmpty(inputDirectory) || string.IsNullOrEmpty(outputDirectory))
            {
                Console.WriteLine("Error: Both input and output directories are required.");
                ShowUsageAndExit();
                return;
            }

            /*
             * ARGUMENT SUMMARY DISPLAY
             * Show parsed arguments for verification (in verbose mode).
             */
            if (verboseLogging)
            {
                Console.WriteLine();
                Console.WriteLine("Parsed Arguments:");
                Console.WriteLine($"  Input Directory: {inputDirectory}");
                Console.WriteLine($"  Output Directory: {outputDirectory}");
                Console.WriteLine($"  Schema File: {schemaPath ?? "None"}");
                Console.WriteLine($"  Verbose Logging: {verboseLogging}");
                Console.WriteLine();
            }

            /*
             * BATCH PROCESSING EXECUTION
             * Create CommandLineProcessor and execute the conversion.
             * 
             * ERROR HANDLING:
             * - CommandLineProcessor handles file system errors
             * - JSON parsing errors are handled by JsonLoader
             * - XML generation errors are handled by XmlTransformer
             * - This level only catches unexpected system errors
             */
            try
            {
                /*
                 * PROCESSOR CREATION
                 * Create CommandLineProcessor with verbose logging setting.
                 * The processor handles all the actual conversion work.
                 */
                var processor = new CommandLineProcessor(verboseLogging);

                /*
                 * BATCH PROCESSING INVOCATION
                 * Execute the main conversion process.
                 * This may take significant time for large batches.
                 */
                processor.ProcessBatchFiles(inputDirectory, outputDirectory, schemaPath);

                /*
                 * SUCCESS COMPLETION
                 * If we reach here, processing completed without exceptions.
                 * Individual file errors are handled within ProcessBatchFiles.
                 */
                if (verboseLogging)
                {
                    Console.WriteLine();
                    Console.WriteLine("Command line processing completed.");
                }
            }
            catch (Exception ex)
            {
                /*
                 * UNEXPECTED ERROR HANDLING
                 * Catch any system-level errors not handled by lower levels.
                 * These could include out-of-memory, disk full, etc.
                 */
                Console.WriteLine($"Critical Error: {ex.Message}");

                /*
                 * DETAILED ERROR INFORMATION
                 * In verbose mode, show full exception details for debugging.
                 */
                if (verboseLogging)
                {
                    Console.WriteLine($"Exception Type: {ex.GetType().Name}");
                    Console.WriteLine($"Stack Trace: {ex.StackTrace}");

                    /*
                     * INNER EXCEPTION DETAILS
                     * Some exceptions wrap other exceptions - show the full chain.
                     */
                    if (ex.InnerException != null)
                    {
                        Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                    }
                }

                /*
                 * EXIT CODE HANDLING
                 * Set non-zero exit code to indicate failure to calling scripts.
                 */
                Environment.Exit(1);
            }
        }

        /// <summary>
        /// Displays command line usage information and exits the application.
        /// Called when invalid or insufficient arguments are provided.
        /// 
        /// DOCUMENTATION STRATEGY:
        /// - Clear, concise usage syntax
        /// - Explanation of each argument and flag
        /// - Practical examples for common scenarios
        /// - Exit with error code for script compatibility
        /// 
        /// OUTPUT FORMAT:
        /// - Usage line showing syntax
        /// - Argument descriptions
        /// - Flag explanations
        /// - Examples section
        /// </summary>
        private static void ShowUsageAndExit()
        {
            /*
             * USAGE SYNTAX
             * Show the basic command structure with required and optional parameters.
             * Uses standard conventions: <required> [optional]
             */
            Console.WriteLine();
            Console.WriteLine("Usage: PrsbJsonToXml.exe <input_directory> <output_directory> [options]");
            Console.WriteLine();

            /*
             * ARGUMENT DESCRIPTIONS
             * Detailed explanation of each parameter's purpose and requirements.
             */
            Console.WriteLine("Arguments:");
            Console.WriteLine("  input_directory   Directory containing JSON files to convert");
            Console.WriteLine("                    Must exist and contain .json files");
            Console.WriteLine("  output_directory  Directory where XML files will be saved");
            Console.WriteLine("                    Will be created if it doesn't exist");
            Console.WriteLine();

            /*
             * OPTIONS DOCUMENTATION
             * Explanation of optional flags and their effects.
             */
            Console.WriteLine("Options:");
            Console.WriteLine("  -v, --verbose     Enable verbose logging");
            Console.WriteLine("                    Shows detailed progress information");
            Console.WriteLine("  -s, --schema      Path to XSD schema file for validation");
            Console.WriteLine("                    Validates generated XML against schema");
            Console.WriteLine();

            /*
             * PRACTICAL EXAMPLES
             * Real-world usage examples for common scenarios.
             */
            Console.WriteLine("Examples:");
            Console.WriteLine("  Basic conversion:");
            Console.WriteLine("    PrsbJsonToXml.exe \"C:\\JsonFiles\" \"C:\\XmlOutput\"");
            Console.WriteLine();
            Console.WriteLine("  With verbose logging:");
            Console.WriteLine("    PrsbJsonToXml.exe \"C:\\JsonFiles\" \"C:\\XmlOutput\" --verbose");
            Console.WriteLine();
            Console.WriteLine("  With schema validation:");
            Console.WriteLine("    PrsbJsonToXml.exe \"C:\\JsonFiles\" \"C:\\XmlOutput\" -s \"schema.xsd\"");
            Console.WriteLine();
            Console.WriteLine("  Full options:");
            Console.WriteLine("    PrsbJsonToXml.exe \"C:\\JsonFiles\" \"C:\\XmlOutput\" -v -s \"schema.xsd\"");
            Console.WriteLine();

            /*
             * ADDITIONAL INFORMATION
             * Point users to GUI mode and other resources.
             */
            Console.WriteLine("Notes:");
            Console.WriteLine("  - Run without arguments to launch GUI mode");
            Console.WriteLine("  - Use quotes around paths containing spaces");
            Console.WriteLine("  - Schema validation is optional but recommended");
            Console.WriteLine("  - Verbose mode helps with troubleshooting");

            /*
             * ERROR EXIT
             * Exit with non-zero code to indicate failure to calling scripts.
             * Standard convention: 0 = success, non-zero = error
             */
            Environment.Exit(1);
        }
    }
}
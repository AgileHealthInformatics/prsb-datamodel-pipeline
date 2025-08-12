using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml.Linq;
using System.Xml.Schema;

namespace PrsbJsonToXml
{
    // Remove 'partial' keyword since we don't have a Designer.cs file
    public class MainForm : Form
    {
        private TextBox outputTextBox = null!;
        private Button selectInputButton = null!;
        private Button selectOutputButton = null!;
        private Button selectSchemaButton = null!;
        private Button processButton = null!;
        private CheckBox verboseCheckBox = null!;
        private CheckBox schemaValidationCheckBox = null!;
        private Label inputLabel = null!;
        private Label outputLabel = null!;
        private Label schemaLabel = null!;
        private ProgressBar progressBar = null!;

        private string inputDirectory = "";
        private string outputDirectory = "";
        private string? schemaPath = null;

        public MainForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "PRSB JSON to XML Batch Converter";
            this.Size = new System.Drawing.Size(800, 600);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.MinimumSize = new System.Drawing.Size(600, 400);

            // Input Directory Section
            var inputGroupLabel = new Label
            {
                Text = "Input Directory (JSON files):",
                Location = new System.Drawing.Point(12, 15),
                Size = new System.Drawing.Size(200, 20),
                Font = new System.Drawing.Font("Microsoft Sans Serif", 9F, System.Drawing.FontStyle.Bold)
            };

            inputLabel = new Label
            {
                Text = "No directory selected",
                Location = new System.Drawing.Point(12, 40),
                Size = new System.Drawing.Size(500, 20),
                ForeColor = System.Drawing.Color.Gray
            };

            selectInputButton = new Button
            {
                Text = "Browse...",
                Location = new System.Drawing.Point(520, 37),
                Size = new System.Drawing.Size(80, 25)
            };
            selectInputButton.Click += SelectInputButton_Click;

            // Output Directory Section
            var outputGroupLabel = new Label
            {
                Text = "Output Directory (XML files):",
                Location = new System.Drawing.Point(12, 75),
                Size = new System.Drawing.Size(200, 20),
                Font = new System.Drawing.Font("Microsoft Sans Serif", 9F, System.Drawing.FontStyle.Bold)
            };

            outputLabel = new Label
            {
                Text = "No directory selected",
                Location = new System.Drawing.Point(12, 100),
                Size = new System.Drawing.Size(500, 20),
                ForeColor = System.Drawing.Color.Gray
            };

            selectOutputButton = new Button
            {
                Text = "Browse...",
                Location = new System.Drawing.Point(520, 97),
                Size = new System.Drawing.Size(80, 25)
            };
            selectOutputButton.Click += SelectOutputButton_Click;

            // Schema Section
            schemaValidationCheckBox = new CheckBox
            {
                Text = "Validate XML against schema file (optional)",
                Location = new System.Drawing.Point(12, 135),
                Size = new System.Drawing.Size(300, 20)
            };
            schemaValidationCheckBox.CheckedChanged += SchemaValidationCheckBox_CheckedChanged;

            schemaLabel = new Label
            {
                Text = "No schema file selected",
                Location = new System.Drawing.Point(12, 160),
                Size = new System.Drawing.Size(500, 20),
                ForeColor = System.Drawing.Color.Gray,
                Enabled = false
            };

            selectSchemaButton = new Button
            {
                Text = "Browse...",
                Location = new System.Drawing.Point(520, 157),
                Size = new System.Drawing.Size(80, 25),
                Enabled = false
            };
            selectSchemaButton.Click += SelectSchemaButton_Click;

            // Options
            verboseCheckBox = new CheckBox
            {
                Text = "Verbose logging (show detailed processing information)",
                Location = new System.Drawing.Point(12, 195),
                Size = new System.Drawing.Size(350, 20)
            };

            // Process Button
            processButton = new Button
            {
                Text = "Start Processing",
                Location = new System.Drawing.Point(12, 225),
                Size = new System.Drawing.Size(120, 35),
                Font = new System.Drawing.Font("Microsoft Sans Serif", 9F, System.Drawing.FontStyle.Bold),
                BackColor = System.Drawing.Color.LightGreen
            };
            processButton.Click += ProcessButton_Click;

            // Progress Bar
            progressBar = new ProgressBar
            {
                Location = new System.Drawing.Point(150, 235),
                Size = new System.Drawing.Size(450, 15),
                Visible = false
            };

            // Output Text Box
            var outputWindowLabel = new Label
            {
                Text = "Processing Output:",
                Location = new System.Drawing.Point(12, 275),
                Size = new System.Drawing.Size(200, 20),
                Font = new System.Drawing.Font("Microsoft Sans Serif", 9F, System.Drawing.FontStyle.Bold)
            };

            outputTextBox = new TextBox
            {
                Location = new System.Drawing.Point(12, 300),
                Size = new System.Drawing.Size(760, 250),
                Multiline = true,
                ScrollBars = ScrollBars.Vertical,
                ReadOnly = true,
                Font = new System.Drawing.Font("Consolas", 9F),
                BackColor = System.Drawing.Color.Black,
                ForeColor = System.Drawing.Color.LightGreen,
                Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right
            };

            // Add all controls to form
            this.Controls.AddRange(new Control[] {
                inputGroupLabel, inputLabel, selectInputButton,
                outputGroupLabel, outputLabel, selectOutputButton,
                schemaValidationCheckBox, schemaLabel, selectSchemaButton,
                verboseCheckBox, processButton, progressBar,
                outputWindowLabel, outputTextBox
            });

            // Resize handling
            this.Resize += MainForm_Resize;
        }

        private void MainForm_Resize(object? sender, EventArgs e)
        {
            // Adjust controls when form is resized
            int formWidth = this.ClientSize.Width;
            int formHeight = this.ClientSize.Height;

            // Adjust label widths
            inputLabel.Size = new System.Drawing.Size(formWidth - 120, 20);
            outputLabel.Size = new System.Drawing.Size(formWidth - 120, 20);
            schemaLabel.Size = new System.Drawing.Size(formWidth - 120, 20);

            // Adjust button positions
            selectInputButton.Location = new System.Drawing.Point(formWidth - 92, 37);
            selectOutputButton.Location = new System.Drawing.Point(formWidth - 92, 97);
            selectSchemaButton.Location = new System.Drawing.Point(formWidth - 92, 157);

            // Adjust progress bar
            progressBar.Size = new System.Drawing.Size(formWidth - 162, 15);

            // Adjust output text box
            outputTextBox.Size = new System.Drawing.Size(formWidth - 24, formHeight - 320);
        }

        private void SelectInputButton_Click(object? sender, EventArgs e)
        {
            using (var dialog = new FolderBrowserDialog())
            {
                dialog.Description = "Select the folder containing JSON files to convert";
                dialog.ShowNewFolderButton = false;

                if (dialog.ShowDialog() == DialogResult.OK)
                {
                    inputDirectory = dialog.SelectedPath;
                    inputLabel.Text = inputDirectory;
                    inputLabel.ForeColor = System.Drawing.Color.Black;

                    // Count JSON files
                    var jsonFiles = Directory.GetFiles(inputDirectory, "*.json", SearchOption.TopDirectoryOnly);
                    LogOutput($"Selected input directory: {inputDirectory}");
                    LogOutput($"Found {jsonFiles.Length} JSON file(s)");
                }
            }
        }

        private void SelectOutputButton_Click(object? sender, EventArgs e)
        {
            using (var dialog = new FolderBrowserDialog())
            {
                dialog.Description = "Select the folder where XML files should be saved";
                dialog.ShowNewFolderButton = true;

                if (dialog.ShowDialog() == DialogResult.OK)
                {
                    outputDirectory = dialog.SelectedPath;
                    outputLabel.Text = outputDirectory;
                    outputLabel.ForeColor = System.Drawing.Color.Black;
                    LogOutput($"Selected output directory: {outputDirectory}");
                }
            }
        }

        private void SchemaValidationCheckBox_CheckedChanged(object? sender, EventArgs e)
        {
            bool enabled = schemaValidationCheckBox.Checked;
            schemaLabel.Enabled = enabled;
            selectSchemaButton.Enabled = enabled;

            if (!enabled)
            {
                schemaPath = null;
                schemaLabel.Text = "No schema file selected";
                schemaLabel.ForeColor = System.Drawing.Color.Gray;
            }
        }

        private void SelectSchemaButton_Click(object? sender, EventArgs e)
        {
            using (var dialog = new OpenFileDialog())
            {
                dialog.Title = "Select XML Schema File";
                dialog.Filter = "XML Schema files (*.xsd)|*.xsd|All files (*.*)|*.*";
                dialog.CheckFileExists = true;

                if (dialog.ShowDialog() == DialogResult.OK)
                {
                    schemaPath = dialog.FileName;
                    schemaLabel.Text = schemaPath;
                    schemaLabel.ForeColor = System.Drawing.Color.Black;
                    LogOutput($"Selected schema file: {schemaPath}");
                }
            }
        }

        private async void ProcessButton_Click(object? sender, EventArgs e)
        {
            if (string.IsNullOrEmpty(inputDirectory) || string.IsNullOrEmpty(outputDirectory))
            {
                MessageBox.Show("Please select both input and output directories.", "Missing Directories",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (!Directory.Exists(inputDirectory))
            {
                MessageBox.Show($"Input directory not found: {inputDirectory}", "Directory Not Found",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // Disable controls during processing
            SetControlsEnabled(false);
            outputTextBox.Clear();
            progressBar.Visible = true;

            try
            {
                await ProcessBatchFilesAsync();
            }
            finally
            {
                // Re-enable controls
                SetControlsEnabled(true);
                progressBar.Visible = false;
            }
        }

        private void SetControlsEnabled(bool enabled)
        {
            selectInputButton.Enabled = enabled;
            selectOutputButton.Enabled = enabled;
            selectSchemaButton.Enabled = enabled && schemaValidationCheckBox.Checked;
            schemaValidationCheckBox.Enabled = enabled;
            verboseCheckBox.Enabled = enabled;
            processButton.Enabled = enabled;
        }

        private async Task ProcessBatchFilesAsync()
        {
            await Task.Run(() => ProcessBatchFiles());
        }

        private void ProcessBatchFiles()
        {
            LogOutput("PRSB JSON to XML Batch Converter");
            LogOutput("=================================");
            LogOutput("");

            // Create output directory if it doesn't exist
            if (!Directory.Exists(outputDirectory))
            {
                LogOutput($"Creating output directory: {outputDirectory}");
                Directory.CreateDirectory(outputDirectory);
            }

            // Find all JSON files in the input directory
            string[] jsonFiles = Directory.GetFiles(inputDirectory, "*.json", SearchOption.TopDirectoryOnly);

            if (jsonFiles.Length == 0)
            {
                LogOutput($"No JSON files found in directory: {inputDirectory}");
                this.Invoke(new Action(() => {
                    MessageBox.Show($"No JSON files found in directory: {inputDirectory}",
                        "No Files Found", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }));
                return;
            }

            LogOutput($"Found {jsonFiles.Length} JSON file(s) to process");
            LogOutput("");

            // Update progress bar
            this.Invoke(new Action(() => {
                progressBar.Maximum = jsonFiles.Length;
                progressBar.Value = 0;
            }));

            int successCount = 0;
            int errorCount = 0;

            // Process each JSON file
            for (int i = 0; i < jsonFiles.Length; i++)
            {
                string jsonFile = jsonFiles[i];
                try
                {
                    string fileName = Path.GetFileNameWithoutExtension(jsonFile);
                    string outputFile = Path.Combine(outputDirectory, fileName + ".xml");

                    LogOutput($"Processing: {Path.GetFileName(jsonFile)}");

                    if (ProcessSingleFile(jsonFile, outputFile))
                    {
                        successCount++;
                        LogOutput($"  ✓ Successfully converted to: {Path.GetFileName(outputFile)}");
                    }
                    else
                    {
                        errorCount++;
                        LogOutput($"  ✗ Failed to convert: {Path.GetFileName(jsonFile)}");
                    }
                }
                catch (Exception ex)
                {
                    errorCount++;
                    LogOutput($"  ✗ Error processing {Path.GetFileName(jsonFile)}: {ex.Message}");
                    if (verboseCheckBox.Checked)
                    {
                        LogOutput($"    Stack trace: {ex.StackTrace}");
                    }
                }

                // Update progress bar
                this.Invoke(new Action(() => {
                    progressBar.Value = i + 1;
                }));

                LogOutput("");
            }

            // Print summary
            LogOutput("Batch Processing Summary:");
            LogOutput($"  Total files: {jsonFiles.Length}");
            LogOutput($"  Successful: {successCount}");
            LogOutput($"  Errors: {errorCount}");

            // Show completion dialog
            string summaryMessage;
            MessageBoxIcon icon;

            if (errorCount == 0)
            {
                summaryMessage = $"All {successCount} files processed successfully!\n\nXML files saved to:\n{outputDirectory}";
                icon = MessageBoxIcon.Information;
                LogOutput("All files processed successfully!");
            }
            else if (successCount > 0)
            {
                summaryMessage = $"Batch processing completed:\n\n" +
                    $"✓ Successful: {successCount}\n" +
                    $"✗ Errors: {errorCount}\n\n" +
                    $"XML files saved to:\n{outputDirectory}\n\n" +
                    $"Check the output window for detailed error information.";
                icon = MessageBoxIcon.Warning;
                LogOutput("Batch processing completed with some errors.");
            }
            else
            {
                summaryMessage = $"Batch processing failed!\n\n" +
                    $"No files were converted successfully.\n" +
                    $"Please check the output window for error details.";
                icon = MessageBoxIcon.Error;
                LogOutput("Batch processing failed - no files were converted successfully.");
            }

            this.Invoke(new Action(() => {
                MessageBox.Show(summaryMessage, "Processing Complete", MessageBoxButtons.OK, icon);
            }));
        }

        private bool ProcessSingleFile(string inputPath, string outputPath)
        {
            try
            {
                if (verboseCheckBox.Checked)
                {
                    LogOutput($"    Loading JSON from: {inputPath}");
                }

                StandardSpec? standard = JsonLoader.LoadFromFile(inputPath);

                if (standard == null || standard.Dataset == null || standard.Dataset.Count == 0)
                {
                    LogOutput($"    Failed to parse JSON input or dataset is empty in file: {Path.GetFileName(inputPath)}");
                    return false;
                }

                var dataset = standard.Dataset[0];
                if (verboseCheckBox.Checked)
                {
                    LogOutput($"    Loaded standard: {dataset.Name ?? "Unnamed"} v{dataset.Version ?? "Unknown"}");
                    LogOutput($"    Transforming to XML...");
                }

                XmlTransformer transformer = new XmlTransformer(verboseCheckBox.Checked);
                var xmlDoc = transformer.TransformToXml(standard);

                // Validate against schema if provided
                if (!string.IsNullOrEmpty(schemaPath) && File.Exists(schemaPath))
                {
                    if (verboseCheckBox.Checked)
                    {
                        LogOutput($"    Validating XML against schema: {schemaPath}");
                    }

                    if (ValidateXmlAgainstSchema(xmlDoc))
                    {
                        if (verboseCheckBox.Checked)
                        {
                            LogOutput("    XML validation successful!");
                        }
                    }
                    else
                    {
                        LogOutput($"    XML validation failed for {Path.GetFileName(inputPath)}. Output will still be saved.");
                    }
                }

                if (verboseCheckBox.Checked)
                {
                    LogOutput($"    Saving XML to: {outputPath}");
                }

                xmlDoc.Save(outputPath);

                // Print statistics for verbose mode
                if (verboseCheckBox.Checked)
                {
                    PrintStatistics(xmlDoc);
                }

                return true;
            }
            catch (Exception ex)
            {
                LogOutput($"    Error processing file: {ex.Message}");
                if (verboseCheckBox.Checked)
                {
                    LogOutput($"    Stack trace: {ex.StackTrace}");
                }
                return false;
            }
        }

        private bool ValidateXmlAgainstSchema(XDocument document)
        {
            try
            {
                XmlSchemaSet schemas = new XmlSchemaSet();
                schemas.Add("", schemaPath!);

                bool isValid = true;
                document.Validate(schemas, (sender, args) => {
                    if (verboseCheckBox.Checked)
                    {
                        LogOutput($"    Validation Error: {args.Message}");
                    }
                    isValid = false;
                });

                return isValid;
            }
            catch (Exception ex)
            {
                if (verboseCheckBox.Checked)
                {
                    LogOutput($"    Schema validation error: {ex.Message}");
                }
                return false;
            }
        }

        private void PrintStatistics(XDocument document)
        {
            if (document.Root == null)
                return;

            int modelCount = document.Root.Elements("Model").Count();
            int elementCount = document.Descendants("Element").Count();
            int attributeCount = document.Descendants("Attribute").Count();
            int taggedValueCount = document.Descendants("TaggedValue").Count();

            LogOutput($"    XML Statistics:");
            LogOutput($"      Models: {modelCount}");
            LogOutput($"      Elements: {elementCount}");
            LogOutput($"      Attributes: {attributeCount}");
            LogOutput($"      Tagged Values: {taggedValueCount}");
            LogOutput($"      Total Size: {document.ToString().Length:N0} characters");
        }

        private void LogOutput(string message)
        {
            if (outputTextBox.InvokeRequired)
            {
                this.Invoke(new Action(() => LogOutput(message)));
                return;
            }

            outputTextBox.AppendText(message + Environment.NewLine);
            outputTextBox.SelectionStart = outputTextBox.Text.Length;
            outputTextBox.ScrollToCaret();
        }
    }
}
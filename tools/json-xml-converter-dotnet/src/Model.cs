/*
 * ============================================================================
 * PRSB JSON to XML Batch Converter - Data Model Classes
 * ============================================================================
 * 
 * File: Model.cs
 * Purpose: Defines strongly-typed data model classes for PRSB JSON standards
 * Created: May 29, 2025
 * Author: Generated for PRSB standard data structure representation
 * 
 * Description:
 * This file contains the complete data model for PRSB (Professional Record 
 * Standards Body) JSON files. These classes provide a strongly-typed 
 * representation of the hierarchical structure found in PRSB standard 
 * specifications, enabling type-safe deserialization and manipulation.
 * 
 * Key Features:
 * - Complete mapping of PRSB JSON structure to C# classes
 * - JsonProperty attributes for precise JSON-to-object mapping
 * - Nullable reference types for better null safety
 * - Hierarchical structure supporting nested concepts
 * - Support for metadata, value domains, and implementation guidance
 * - Extensible design for future PRSB standard enhancements
 * 
 * Class Hierarchy:
 * StandardSpec (Root)
 * └── DatasetItem (Standard definition)
 *     └── Concept (Groups and items)
 *         ├── Concept (Nested child concepts)
 *         └── ValueDomain (Data type specifications)
 * 
 * JSON Structure Mapping:
 * The classes map to this typical PRSB JSON structure:
 * {
 *   "dataset": [
 *     {
 *       "version": "1.0",
 *       "name": "Standard Name",
 *       "description": "Description",
 *       "concept": [
 *         {
 *           "type": "group|item",
 *           "name": "Concept Name",
 *           "concept": [...nested concepts...]
 *         }
 *       ]
 *     }
 *   ]
 * }
 * 
 * Usage Examples:
 * - JSON deserialization: JsonConvert.DeserializeObject<StandardSpec>(json)
 * - Safe property access: standard?.Dataset?[0]?.Name
 * - Concept traversal: foreach(var concept in dataset.Concepts ?? [])
 * 
 * Dependencies:
 * - Newtonsoft.Json for JsonProperty attributes
 * - System.Collections.Generic for List<T> collections
 * 
 * ============================================================================
 */

using System.Collections.Generic;
using Newtonsoft.Json;

namespace PrsbJsonToXml
{
    // Root class representing the entire standard specification
    public class StandardSpec
    {
        [JsonProperty("dataset")]
        public List<DatasetItem>? Dataset { get; set; }
    }

    // Represents a dataset item in the PRSB structure
    public class DatasetItem
    {
        [JsonProperty("version")]
        public string? Version { get; set; }

        [JsonProperty("name")]
        public string? Name { get; set; }

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("informationType")]
        public string? InformationType { get; set; }

        [JsonProperty("concept")]
        public List<Concept>? Concepts { get; set; }
    }

    // Represents a concept (group or item) in the PRSB structure
    public class Concept
    {
        [JsonProperty("type")]
        public string? Type { get; set; }

        [JsonProperty("name")]
        public string? Name { get; set; }

        [JsonProperty("minimumMultiplicity")]
        public string? MinimumMultiplicity { get; set; }

        [JsonProperty("maximumMultiplicity")]
        public string? MaximumMultiplicity { get; set; }

        [JsonProperty("mro")]
        public string? Mro { get; set; }

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("implementationGuidance")]
        public string? ImplementationGuidance { get; set; }

        [JsonProperty("concept")]
        public List<Concept>? ChildConcepts { get; set; }

        [JsonProperty("valueSets")]
        public string? ValueSets { get; set; }

        [JsonProperty("valueDomain")]
        public List<ValueDomain>? ValueDomain { get; set; }
    }

    // Represents the value domain of a concept
    public class ValueDomain
    {
        [JsonProperty("type")]
        public string? Type { get; set; }
    }
}
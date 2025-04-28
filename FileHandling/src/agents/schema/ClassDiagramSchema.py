# Define the JSON schema for validation
VALIDATE_SCHEMA_CLASS_DIAGRAM = {
    "type": "object",
    "required": ["diagramName", "classes"],
    "properties": {
        "diagramType": {
            "type": "string",
            "enum": ["UML Class Diagram"]
        },
        "diagramName": {"type": "string"},
        "classes": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name"],
                "properties": {
                    "name": {"type": "string"},
                    "type": {"type": "string", "default": "class"},
                    "attributes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["name", "type"],
                            "properties": {
                                "name": {"type": "string"},
                                "type": {"type": "string"},
                                "visibility": {"type": "string", "default": "- private"}
                            }
                        }
                    },
                    "methods": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["name", "returnType"],
                            "properties": {
                                "name": {"type": "string"},
                                "parameters": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "required": ["name", "type"],
                                        "properties": {
                                            "name": {"type": "string"},
                                            "type": {"type": "string"}
                                        }
                                    }
                                },
                                "returnType": {"type": "string"},
                                "visibility": {"type": "string", "default": "+ public"},
                                "isAbstract": {"type": "boolean", "default": False}
                            }
                        }
                    }
                }
            }
        },
        "relationships": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["type", "fromClass", "toClass"],
                "properties": {
                    "type": {"type": "string", "enum": ["Association", "Aggregation", "Composition", "Generalization", "Realization", "Dependency"]},
                    "fromClass": {"type": "string"},
                    "toClass": {"type": "string"},
                    "label": {"type": "string"},
                    "fromMultiplicity": {"type": "string"},
                    "toMultiplicity": {"type": "string"}
                }
            }
        }
    }
}
JSON_CLASS_DIAGRAM_SCHEMA_STRING = '''
{
  "diagramType": "UML Class Diagram",
  "diagramName": "string", // A descriptive name for the diagram (e.g., "Online Shopping System")
  "classes": [
    {
      "name": "string", // Name of the class (e.g., "User", "Order")
      "type": "string", // Type: "class", "abstract class", "interface" (default: "class")
      "attributes": [
        {
          "name": "string", // Attribute name (e.g., "userName", "orderId")
          "type": "string", // Data type (e.g., "String", "int", "Date", "List<OrderItem>")
          "visibility": "string" // "+ public", "- private", "# protected", "~ package" (default: "- private")
        }
        // ... more attributes
      ],
      "methods": [
        {
          "name": "string", // Method name (e.g., "login", "calculateTotal")
          "parameters": [
            {
              "name": "string", // Parameter name (e.g., "username", "quantity")
              "type": "string" // Parameter data type (e.g., "String", "int")
            }
            // ... more parameters
          ],
          "returnType": "string", // Return type (e.g., "boolean", "double", "void")
          "visibility": "string", // "+ public", "- private", "# protected", "~ package" (default: "+ public")
          "isAbstract": "boolean" // true if the method is abstract (optional, default: false)
        }
        // ... more methods
      ]
    }
    // ... more classes
  ],
  "relationships": [
    {
      "type": "string", // "Association", "Aggregation", "Composition", "Generalization", "Realization", "Dependency"
      "fromClass": "string", // Name of the source class
      "toClass": "string", // Name of the target class
      // --- Optional fields for specific relationship types ---
      "label": "string", // Optional: Name or description of the relationship (esp. for Association)
      "fromMultiplicity": "string", // Optional: Multiplicity at the source end (e.g., "1", "0..1", "*", "1..*")
      "toMultiplicity": "string" // Optional: Multiplicity at the target end (e.g., "1", "0..1", "*", "1..*")
      // --- Interpretation Guide ---
      // Generalization: fromClass=Subclass, toClass=Superclass
      // Realization: fromClass=Implementing Class, toClass=Interface
      // Dependency: fromClass=Client, toClass=Supplier
      // Association/Aggregation/Composition: Define ends based on context or label.
    }
    // ... more relationships
  ]
}'''
# Define the JSON schema for database diagram validation
VALIDATE_SCHEMA_DATABASE_DIAGRAM = {
    "type": "object",
    "required": ["diagramName", "tables"],
    "properties": {
        "diagramType": {
            "type": "string",
            "enum": ["ER Diagram"]
        },
        "diagramName": {"type": "string"},
        "tables": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "columns"],
                "properties": {
                    "name": {"type": "string"},
                    "columns": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["name", "dataType"],
                            "properties": {
                                "name": {"type": "string"},
                                "dataType": {"type": "string"},
                                "constraints": {
                                    "type": "array",
                                    "items": {
                                        "type": "string",
                                        "enum": [
                                            "PRIMARY KEY", 
                                            "FOREIGN KEY",
                                            "UNIQUE",
                                            "NOT NULL",
                                            "CHECK",
                                            "DEFAULT",
                                            "AUTO_INCREMENT",
                                            "INDEX"
                                        ]
                                    }
                                },
                                "defaultValue": {"type": "string"},
                                "description": {"type": "string"}
                            }
                        }
                    },
                    "primaryKey": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "indexes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["name", "columns"],
                            "properties": {
                                "name": {"type": "string"},
                                "columns": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                },
                                "isUnique": {"type": "boolean", "default": False}
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
                "required": ["fromTable", "toTable", "fromColumns", "toColumns"],
                "properties": {
                    "name": {"type": "string"},
                    "fromTable": {"type": "string"},
                    "toTable": {"type": "string"},
                    "fromColumns": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "toColumns": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "cardinality": {
                        "type": "string",
                        "enum": ["one-to-one", "one-to-many", "many-to-one", "many-to-many"]
                    },
                    "onUpdate": {
                        "type": "string",
                        "enum": ["CASCADE", "RESTRICT", "SET NULL", "SET DEFAULT", "NO ACTION"]
                    },
                    "onDelete": {
                        "type": "string",
                        "enum": ["CASCADE", "RESTRICT", "SET NULL", "SET DEFAULT", "NO ACTION"]
                    }
                }
            }
        }
    }
}

JSON_DATABASE_DIAGRAM_SCHEMA_STRING = '''
{
  "diagramType":  "ER Diagram"
  "diagramName": "string", // A descriptive name for the diagram (e.g., "E-Commerce Database")
  "tables": [
    {
      "name": "string", // Name of the table (e.g., "users", "orders")
      "columns": [
        {
          "name": "string", // Column name (e.g., "user_id", "order_date")
          "dataType": "string", // Data type (e.g., "INTEGER", "VARCHAR(255)", "TIMESTAMP")
          "constraints": [ // Optional array of constraints
            "string" // "PRIMARY KEY", "FOREIGN KEY", "UNIQUE", "NOT NULL", "CHECK", "DEFAULT", "AUTO_INCREMENT", "INDEX"
          ],
          "defaultValue": "string", // Optional default value for the column
          "description": "string" // Optional description or comment for the column
        }
        // ... more columns
      ],
      "primaryKey": [ // Optional explicit primary key definition
        "string" // Column name(s) that form the primary key
      ],
      "indexes": [ // Optional array of indexes
        {
          "name": "string", // Name of the index
          "columns": [ // Columns included in the index
            "string" // Column name
          ],
          "isUnique": "boolean" // Whether the index enforces uniqueness (default: false)
        }
        // ... more indexes
      ]
    }
    // ... more tables
  ],
  "relationships": [
    {
      "name": "string", // Optional name for the relationship (e.g., "fk_orders_users")
      "fromTable": "string", // Source table name
      "toTable": "string", // Target table name
      "fromColumns": [ // Foreign key column(s) in the source table
        "string" // Column name
      ],
      "toColumns": [ // Referenced column(s) in the target table
        "string" // Column name
      ],
      "cardinality": "string", // "one-to-one", "one-to-many", "many-to-one", "many-to-many"
      "onUpdate": "string", // Optional: "CASCADE", "RESTRICT", "SET NULL", "SET DEFAULT", "NO ACTION"
      "onDelete": "string" // Optional: "CASCADE", "RESTRICT", "SET NULL", "SET DEFAULT", "NO ACTION"
    }
    // ... more relationships
  ]
}'''
# Define the JSON schema for sequence diagram validation
VALIDATE_SCHEMA_SEQUENCE_DIAGRAM = {
    "type": "object",
    "required": ["diagramName", "participants", "messages"],
    "properties": {
        "diagramType": {
            "type": "string",
            "enum": ["UML Sequence Diagram"]
        },
        "diagramName": {"type": "string"},
        "participants": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name"],
                "properties": {
                    "name": {"type": "string"},
                    "type": {
                        "type": "string",
                        "enum": ["actor", "object", "component", "database", "boundary", "control", "entity"],
                        "default": "object"
                    },
                    "description": {"type": "string"}
                }
            }
        },
        "messages": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["from", "to", "name"],
                "properties": {
                    "from": {"type": "string"},
                    "to": {"type": "string"},
                    "name": {"type": "string"},
                    "type": {
                        "type": "string",
                        "enum": ["synchronous", "asynchronous", "reply", "create", "destroy", "self"],
                        "default": "synchronous"
                    },
                    "order": {"type": "integer"},
                    "condition": {"type": "string"},
                    "arguments": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "returnValue": {"type": "string"}
                }
            }
        },
        "lifelines": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["participant"],
                "properties": {
                    "participant": {"type": "string"},
                    "activations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["start", "end"],
                            "properties": {
                                "start": {"type": "integer"},
                                "end": {"type": "integer"},
                                "color": {"type": "string"},
                                "level": {"type": "integer", "default": 1}
                            }
                        }
                    },
                    "destruction": {"type": "integer"}
                }
            }
        },
        "fragments": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["type", "name", "contents"],
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["alt", "opt", "loop", "par", "critical", "neg", "ref", "break", "region"]
                    },
                    "name": {"type": "string"},
                    "condition": {"type": "string"},
                    "contents": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "condition": {"type": "string"},
                                "messages": {
                                    "type": "array",
                                    "items": {"type": "integer"}
                                },
                                "nestedFragments": {
                                    "type": "array",
                                    "items": {"type": "integer"}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

JSON_SEQUENCE_DIAGRAM_SCHEMA_STRING = '''
{
  "diagramType": "UML Sequence Diagram",
  "diagramName": "string", // A descriptive name for the diagram (e.g., "User Authentication Flow")
  "participants": [
    {
      "name": "string", // Name of the participant (e.g., "User", "AuthenticationService")
      "type": "string", // Type: "actor", "object", "component", "database", "boundary", "control", "entity" (default: "object")
      "description": "string" // Optional description of the participant's role
    }
    // ... more participants
  ],
  "messages": [
    {
      "from": "string", // Source participant name
      "to": "string", // Target participant name
      "name": "string", // Message name or description (e.g., "login()", "validate credentials")
      "type": "string", // "synchronous", "asynchronous", "reply", "create", "destroy", "self" (default: "synchronous")
      "order": "integer", // Optional sequence number to ensure correct ordering
      "condition": "string", // Optional guard condition (e.g., "if authenticated")
      "arguments": [ // Optional array of argument values
        "string" // Argument value (e.g., "username", "password")
      ],
      "returnValue": "string" // Optional return value for reply messages
    }
    // ... more messages
  ],
  "lifelines": [
    {
      "participant": "string", // Name of the participant this lifeline represents
      "activations": [ // Optional array of activation bars
        {
          "start": "integer", // Message index that starts this activation
          "end": "integer", // Message index that ends this activation
          "color": "string", // Optional color for the activation bar
          "level": "integer" // Optional nesting level for nested activations (default: 1)
        }
        // ... more activations
      ],
      "destruction": "integer" // Optional message index that causes destruction of this lifeline
    }
    // ... more lifelines
  ],
  "fragments": [
    {
      "type": "string", // "alt", "opt", "loop", "par", "critical", "neg", "ref", "break", "region"
      "name": "string", // Fragment name or description
      "condition": "string", // Optional overall condition for the fragment (e.g., "x > 0" for a loop)
      "contents": [ // Sections within this fragment (e.g., "if" and "else" sections in an "alt")
        {
          "condition": "string", // Optional condition for this section (e.g., "isValid" for one branch of an "alt")
          "messages": [ // Array of message indices contained in this section
            "integer" // Index of a message in the messages array
          ],
          "nestedFragments": [ // Optional array of nested fragment indices
            "integer" // Index of a fragment in the fragments array
          ]
        }
        // ... more sections
      ]
    }
    // ... more fragments
  ]
}'''
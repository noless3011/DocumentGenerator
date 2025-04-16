import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import {
    Node, Edge, OnNodesChange, OnEdgesChange, OnConnect,
    applyNodeChanges, applyEdgeChanges, addEdge
} from '@xyflow/react';
import { Class, Relationship, RelationshipType, ClassDiagram } from '../../models/ClassDiagram';

interface DiagramContextType {
    nodes: Node<{ class: Class, id: string }>[];
    edges: Edge<{ relationship: Relationship }>[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    updateClass: (nodeId: string, classData: Class) => void;
    updateRelationship: (edgeId: string, relationship: Partial<Relationship>) => void;
    flipEdgeDirection: (edgeId: string) => void;
    deleteEdge: (edgeId: string) => void;
    addClassNode: () => void;
    deleteClassNode: (nodeId: string) => void;
    saveDiagram: (fileDir: string) => Promise<void>;
    getDiagramData: () => ClassDiagram;
}

const DiagramContext = createContext<DiagramContextType | undefined>(undefined);

export function useDiagramContext() {
    const context = useContext(DiagramContext);
    if (!context) {
        throw new Error('useDiagramContext must be used within a DiagramProvider');
    }
    return context;
}

interface ClassDiagramProviderProps {
    children: ReactNode;
    initialDiagram: ClassDiagram;
}

export function ClassDiagramProvider({ children, initialDiagram }: ClassDiagramProviderProps) {
    // Convert initial diagram to nodes and edges
    const { nodes: initialNodes, edges: initialEdges } = convertDiagramToNodesAndEdges(initialDiagram);

    const [nodes, setNodes] = useState<Node<{ class: Class, id: string }>[]>(initialNodes);
    const [edges, setEdges] = useState<Edge<{ relationship: Relationship }>[]>(initialEdges);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds) as Node<{ class: Class, id: string }>[]),
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds) as Edge<{ relationship: Relationship }>[]),
        []
    );

    const onConnect: OnConnect = useCallback(
        (params) => {
            setEdges((eds) => {
                const sourceNode = nodes.find(node => node.id === params.source);
                const targetNode = nodes.find(node => node.id === params.target);

                if (!sourceNode || !targetNode) return eds;

                const sourceClass = sourceNode.data.class.name;
                const targetClass = targetNode.data.class.name;

                // Create a proper relationship object
                const relationship: Relationship = {
                    type: RelationshipType.Association,
                    fromClass: sourceClass,
                    toClass: targetClass,
                    fromMultiplicity: '1',
                    toMultiplicity: '1',
                };

                // Add edge with the relationship data
                return addEdge({
                    ...params,
                    type: 'default',
                    data: { relationship }
                }, eds) as Edge<{ relationship: Relationship }>[];
            });
        },
        [nodes]
    );

    const updateClass = useCallback((nodeId: string, classData: Class) => {
        setNodes(nodes =>
            nodes.map(node =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, class: classData } }
                    : node
            )
        );
    }, []);

    const updateRelationship = useCallback((edgeId: string, relationshipUpdate: Partial<Relationship>) => {
        setEdges(edges =>
            edges.map(edge => {
                if (edge.id === edgeId) {
                    return {
                        ...edge,
                        data: {
                            relationship: {
                                ...edge.data.relationship,
                                ...relationshipUpdate
                            }
                        }
                    };
                }
                return edge;
            })
        );
    }, []);

    const flipEdgeDirection = useCallback((edgeId: string) => {
        setEdges(edges =>
            edges.map(edge => {
                if (edge.id === edgeId) {
                    return {
                        ...edge,
                        source: edge.target,
                        target: edge.source,
                        data: {
                            relationship: {
                                ...edge.data.relationship,
                                fromClass: edge.data.relationship.toClass,
                                toClass: edge.data.relationship.fromClass
                            }
                        }
                    };
                }
                return edge;
            })
        );
    }
        , []);

    const deleteEdge = useCallback((edgeId: string) => {
        setEdges(edges => edges.filter(edge => edge.id !== edgeId));
    }, []);

    const addClassNode = useCallback(() => {
        const newClassData: Class = {
            name: `Class ${nodes.length + 1}`,
            type: 'class',
            attributes: [],
            methods: [],
        };

        const newClassNode: Node<{ class: Class, id: string }> = {
            id: `class-${nodes.length}`,
            type: 'class',
            position: { x: nodes.length * 200, y: 100 },
            data: { class: newClassData, id: `class-${nodes.length}` },
        };

        setNodes(nodes => [...nodes, newClassNode]);
    }, [nodes]);

    const deleteClassNode = useCallback((nodeId: string) => {
        setNodes(nodes => nodes.filter(node => node.id !== nodeId));
        setEdges(edges => edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    }
        , []);

    const getDiagramData = useCallback((): ClassDiagram => {
        const classes = nodes.map(node => node.data.class);
        const relationships = edges.map(edge => edge.data.relationship);
        return new ClassDiagram(initialDiagram.diagramName, classes, relationships);
    }, [nodes, edges, initialDiagram.diagramName]);

    const saveDiagram = useCallback(async (fileDir: string) => {
        const diagram = getDiagramData();
        // Add diagramType to the diagram object at the beginning

        const json = JSON.stringify(diagram, null, 2);

        try {
            await window.myAPI.saveFile(fileDir, json);
            console.log('File saved successfully!');
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    }, [getDiagramData]);

    return (
        <DiagramContext.Provider value={{
            nodes,
            edges,
            onNodesChange,
            onEdgesChange,
            onConnect,
            updateClass,
            updateRelationship,
            flipEdgeDirection,
            deleteEdge,
            addClassNode,
            deleteClassNode,
            saveDiagram,
            getDiagramData
        }}>
            {children}
        </DiagramContext.Provider>
    );
}

// Helper function to convert ClassDiagram to nodes and edges
function convertDiagramToNodesAndEdges(diagram: ClassDiagram) {
    const nodes: Node<{ class: Class, id: string }>[] = diagram.classes.map((classData, index) => ({
        id: `class-${index}`,
        type: 'class',
        position: { x: index * 200, y: 100 },
        data: { class: classData, id: `class-${index}` },
    }));

    const edges: Edge<{ relationship: Relationship }>[] = diagram.relationships.map((relationship, index) => ({
        id: `edge-${index}`,
        source: `class-${diagram.classes.findIndex(c => c.name === relationship.fromClass)}`,
        target: `class-${diagram.classes.findIndex(c => c.name === relationship.toClass)}`,
        type: 'default',
        data: { relationship },
    }));

    return { nodes, edges };
}
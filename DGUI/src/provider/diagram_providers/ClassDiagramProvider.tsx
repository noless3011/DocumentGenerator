import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import {
    Node, Edge, OnNodesChange, OnEdgesChange, OnConnect,
    applyNodeChanges, applyEdgeChanges, addEdge
} from '@xyflow/react';
import { Class, Relationship, RelationshipType, ClassDiagram } from '../../models/ClassDiagram';

interface NodeGeometry {
    id: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
}

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
    setNodes: (nodes: Node<{ class: Class, id: string }>[]) => void;
    initialGeometryLoaded: boolean;
}

const DiagramContext = createContext<DiagramContextType | undefined>(undefined);

const diagramStateCache = new Map<string, {
    nodes: Node<{ class: Class, id: string }>[],
    edges: Edge<{ relationship: Relationship }>[]
}>();

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
    fileDir?: string;
}

const getGeometryFilePath = (mainFilePath?: string): string => {
    if (!mainFilePath) return '';
    const normalizedPath = mainFilePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    const fileName = parts.pop();
    if (!fileName) return '';

    const folderPath = parts.join('/');
    const geometryFilename = fileName.replace(/\.(json|diagram)$/i, '') + ".geometry.json";

    return folderPath ? `${folderPath}/${geometryFilename}` : geometryFilename;
};


export function ClassDiagramProvider({ children, initialDiagram, fileDir }: ClassDiagramProviderProps) {
    const cacheKey = fileDir ? `diagram-${fileDir}` : `diagram-${initialDiagram.diagramName}-unsaved`;

    const { initialNodes: memoizedInitialNodes, initialEdges: memoizedInitialEdges } = useMemo(() => {
        if (fileDir && diagramStateCache.has(cacheKey)) {
            const cached = diagramStateCache.get(cacheKey)!;
            return {
                initialNodes: cached.nodes,
                initialEdges: cached.edges
            };
        }
        const { nodes: newNodes, edges: newEdges } = convertDiagramToNodesAndEdges(initialDiagram);
        if (fileDir) {
            diagramStateCache.set(cacheKey, { nodes: newNodes, edges: newEdges });
        }
        return {
            initialNodes: newNodes,
            initialEdges: newEdges
        };
    }, [initialDiagram, fileDir, cacheKey]);

    const [nodes, setNodes] = useState<Node<{ class: Class, id: string }>[]>(memoizedInitialNodes);
    const [edges, setEdges] = useState<Edge<{ relationship: Relationship }>[]>(memoizedInitialEdges);
    const [initialGeometryLoaded, setInitialGeometryLoaded] = useState(false);

    useEffect(() => {
        if (fileDir) {
            diagramStateCache.set(cacheKey, { nodes, edges });
        }
    }, [nodes, edges, cacheKey, fileDir]);

    useEffect(() => {
        if (!fileDir) {
            // For new, unsaved diagrams, or if fileDir is not provided, use default positions
            // and consider geometry "loaded" with these defaults.
            const { nodes: defaultNodes } = convertDiagramToNodesAndEdges(initialDiagram);
            setNodes(defaultNodes);
            setEdges(convertDiagramToNodesAndEdges(initialDiagram).edges); // Also reset edges for consistency
            setInitialGeometryLoaded(true);
            return;
        }

        // For diagrams with a fileDir, attempt to load or create geometry.
        setInitialGeometryLoaded(false);

        const loadOrCreateGeometry = async () => {
            const geometryFilePath = getGeometryFilePath(fileDir);
            if (!geometryFilePath) {
                console.warn("Cannot load or create geometry: main fileDir is invalid for path generation.");
                // Fallback to default positions if path can't be determined
                setNodes(memoizedInitialNodes);
                setEdges(memoizedInitialEdges);
                setInitialGeometryLoaded(true);
                return;
            }

            let geometryApplied = false;
            try {
                const geometryJson = await window.myAPI.readFileAsText(geometryFilePath);
                const geometries: NodeGeometry[] = JSON.parse(geometryJson);

                if (geometries && Array.isArray(geometries) && geometries.length > 0) {
                    const { nodes: baseNodes, edges: baseEdges } = convertDiagramToNodesAndEdges(initialDiagram); // Get fresh base
                    const updatedNodes = baseNodes.map(node => {
                        const geom = geometries.find(g => g.id === node.id);
                        if (geom) {
                            return {
                                ...node,
                                position: { x: geom.x, y: geom.y },
                                width: geom.width,
                                height: geom.height,
                                style: { ...node.style, width: geom.width, height: geom.height }
                            };
                        }
                        return node;
                    });
                    setNodes(updatedNodes as Node<{ class: Class; id: string }>[]);
                    setEdges(baseEdges); // Set base edges, relationships don't store geometry
                    geometryApplied = true;
                } else {
                    // File exists but is empty or invalid, treat as "not found" for creation logic
                    console.warn(`No valid geometries found in ${geometryFilePath}. Will attempt to create.`);
                }
            } catch (error) {
                // Error reading file (e.g., not found, parse error)
                console.warn(`Geometry file ${geometryFilePath} not found or error loading:`, error, ". Will attempt to create.");
                // Ensure nodes/edges are reset to default state before attempting to save new geometry
                setNodes(memoizedInitialNodes);
                setEdges(memoizedInitialEdges);
            }

            if (geometryApplied) {
                setInitialGeometryLoaded(true);
            } else {
                // Geometry was not loaded/applied, so create it.
                // `nodes` state should be `memoizedInitialNodes` at this point.
                const nodesToSaveDefaultGeometry = nodes;

                if (nodesToSaveDefaultGeometry.length > 0) {
                    const nodeGeometries: NodeGeometry[] = nodesToSaveDefaultGeometry.map(node => ({
                        id: node.id,
                        x: node.position.x,
                        y: node.position.y,
                        width: node.width, // Initially undefined, will be populated by RF then saved on manual save
                        height: node.height, // Initially undefined
                    }));

                    try {
                        const geometryJsonToSave = JSON.stringify(nodeGeometries, null, 2);
                        await window.myAPI.saveFile(geometryFilePath, geometryJsonToSave);
                        console.log(`Initial geometry file created and saved: ${geometryFilePath}`);
                        setInitialGeometryLoaded(true);
                    } catch (saveError) {
                        console.error(`Error creating initial geometry file ${geometryFilePath}:`, saveError);
                        // Even if save fails, nodes have default positions.
                        setInitialGeometryLoaded(true);
                    }
                } else {
                    // No nodes in the diagram (e.g., new empty diagram)
                    console.warn("No nodes to create initial geometry for.");
                    setInitialGeometryLoaded(true);
                }
            }
        };

        loadOrCreateGeometry();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileDir, initialDiagram, memoizedInitialNodes, memoizedInitialEdges]);


    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds) as Node<{ class: Class, id: string }>[]),
        [setNodes]
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds) as Edge<{ relationship: Relationship }>[]),
        [setEdges]
    );

    const onConnect: OnConnect = useCallback(
        (params) => {
            setEdges((eds) => {
                const sourceNode = nodes.find(node => node.id === params.source);
                const targetNode = nodes.find(node => node.id === params.target);

                if (!sourceNode || !targetNode) return eds;

                const sourceClass = sourceNode.data.class.name;
                const targetClass = targetNode.data.class.name;

                const relationship: Relationship = {
                    type: RelationshipType.Association,
                    fromClass: sourceClass,
                    toClass: targetClass,
                    fromMultiplicity: '1',
                    toMultiplicity: '1',
                };

                return addEdge({
                    ...params,
                    type: 'default',
                    data: { relationship }
                }, eds) as Edge<{ relationship: Relationship }>[];
            });
        },
        [nodes, setEdges]
    );

    const updateClass = useCallback((nodeId: string, classData: Class) => {
        setNodes(nds =>
            nds.map(node =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, class: classData } }
                    : node
            )
        );
    }, [setNodes]);

    const updateRelationship = useCallback((edgeId: string, relationshipUpdate: Partial<Relationship>) => {
        setEdges(eds =>
            eds.map(edge => {
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
    }, [setEdges]);

    const flipEdgeDirection = useCallback((edgeId: string) => {
        setEdges(eds =>
            eds.map(edge => {
                if (edge.id === edgeId) {
                    const currentRelationship = edge.data?.relationship;
                    if (!currentRelationship) return edge;

                    return {
                        ...edge,
                        source: edge.target,
                        target: edge.source,
                        data: {
                            relationship: {
                                ...currentRelationship,
                                fromClass: currentRelationship.toClass,
                                toClass: currentRelationship.fromClass
                            }
                        }
                    };
                }
                return edge;
            })
        );
    }, [setEdges]);

    const deleteEdge = useCallback((edgeId: string) => {
        setEdges(eds => eds.filter(edge => edge.id !== edgeId));
    }, [setEdges]);

    const addClassNode = useCallback(() => {
        setNodes(nds => {
            const newClassData: Class = {
                name: `Class ${nds.length + 1}`,
                type: 'class',
                attributes: [],
                methods: [],
            };
            const newNodeId = `class-${Date.now()}-${nds.length}`;
            const newClassNode: Node<{ class: Class, id: string }> = {
                id: newNodeId,
                type: 'class',
                position: { x: (nds.length % 10) * 200, y: Math.floor(nds.length / 10) * 150 + 100 },
                data: { class: newClassData, id: newNodeId },
            };
            return [...nds, newClassNode];
        });
    }, [setNodes]);

    const deleteClassNode = useCallback((nodeId: string) => {
        setNodes(nds => nds.filter(node => node.id !== nodeId));
        setEdges(eds => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    }, [setNodes, setEdges]);

    const getDiagramData = useCallback((): ClassDiagram => {
        const classes = nodes.map(node => node.data.class);
        const relationships = edges.map(edge => edge.data.relationship);
        return new ClassDiagram(initialDiagram.diagramName, classes, relationships);
    }, [nodes, edges, initialDiagram.diagramName]);

    const saveDiagram = useCallback(async (fileDirToSaveTo: string) => {
        if (!fileDirToSaveTo) {
            console.error("Cannot save diagram: fileDirToSaveTo is missing.");
            throw new Error("Missing fileDirToSaveTo for saving.");
        }
        const diagram = getDiagramData();
        const diagramJson = JSON.stringify(diagram, null, 2);

        try {
            await window.myAPI.saveFile(fileDirToSaveTo, diagramJson);
            console.log('Diagram file saved successfully', fileDirToSaveTo);

            const geometryFilePath = getGeometryFilePath(fileDirToSaveTo);
            if (!geometryFilePath) {
                console.error("Could not determine geometry file path for saving with main file:", fileDirToSaveTo);
            } else {
                const nodeGeometries: NodeGeometry[] = nodes.map(node => ({
                    id: node.id,
                    x: node.position.x,
                    y: node.position.y,
                    width: node.width,
                    height: node.height,
                }));
                const geometryJsonToSave = JSON.stringify(nodeGeometries, null, 2);
                await window.myAPI.saveFile(geometryFilePath, geometryJsonToSave);
                console.log('Geometry file saved successfully!', geometryFilePath);
            }
            if (!initialGeometryLoaded) setInitialGeometryLoaded(true);

        } catch (error) {
            console.error('Error saving file(s):', error);
            throw error;
        }
    }, [getDiagramData, nodes, initialGeometryLoaded, setInitialGeometryLoaded]);

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
            getDiagramData,
            setNodes,
            initialGeometryLoaded,
        }}>
            {children}
        </DiagramContext.Provider>
    );
}

function convertDiagramToNodesAndEdges(diagram: ClassDiagram) {
    const nodes: Node<{ class: Class, id: string }>[] = diagram.classes.map((classData, index) => {
        const nodeIdBase = classData.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        const nodeId = `class-${nodeIdBase}-${index}`;
        return {
            id: nodeId,
            type: 'class',
            position: { x: (index % 5) * 280 + 50, y: Math.floor(index / 5) * 220 + 50 },
            data: { class: classData, id: nodeId },
        };
    });

    const edges: Edge<{ relationship: Relationship }>[] = diagram.relationships.map((relationship, index) => {
        const sourceNode = nodes.find(n => n.data.class.name === relationship.fromClass);
        const targetNode = nodes.find(n => n.data.class.name === relationship.toClass);

        if (!sourceNode || !targetNode) {
            console.warn("Could not find source or target node for relationship:", relationship);
            return null;
        }
        const edgeId = `edge-${sourceNode.id}-${targetNode.id}-${relationship.type.replace(/\s+/g, '_')}-${index}`;
        return {
            id: edgeId,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'default',
            data: { relationship },
        };
    }).filter(edge => edge !== null) as Edge<{ relationship: Relationship }>[];

    return { nodes, edges };
}
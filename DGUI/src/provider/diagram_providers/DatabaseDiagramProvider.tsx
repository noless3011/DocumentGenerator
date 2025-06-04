import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import {
    Node, Edge, OnNodesChange, OnEdgesChange, OnConnect,
    applyNodeChanges, applyEdgeChanges, addEdge
} from '@xyflow/react';
import { Table, DatabaseRelationship, RelationshipCardinality, DatabaseDiagram } from '../../models/DatabaseDiagram';

interface NodeGeometry {
    id: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
}

interface DatabaseDiagramContextType {
    nodes: Node<{ table: Table, id: string }>[];
    edges: Edge<{ relationship: DatabaseRelationship }>[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    updateTable: (nodeId: string, tableData: Table) => void;
    updateRelationship: (edgeId: string, relationship: Partial<DatabaseRelationship>) => void;
    flipEdgeDirection: (edgeId: string) => void;
    deleteEdge: (edgeId: string) => void;
    addTableNode: () => void;
    deleteTableNode: (nodeId: string) => void;
    saveDiagram: (fileDir: string) => Promise<void>;
    getDiagramData: () => DatabaseDiagram;
    setNodes: (nodes: Node<{ table: Table, id: string }>[]) => void;
    initialGeometryLoaded: boolean;
}

const DatabaseDiagramContext = createContext<DatabaseDiagramContextType | undefined>(undefined);

const diagramStateCache = new Map<string, {
    nodes: Node<{ table: Table, id: string }>[],
    edges: Edge<{ relationship: DatabaseRelationship }>[]
}>();

export function useDatabaseDiagramContext() {
    const context = useContext(DatabaseDiagramContext);
    if (!context) {
        throw new Error('useDatabaseDiagramContext must be used within a DatabaseDiagramProvider');
    }
    return context;
}

interface DatabaseDiagramProviderProps {
    children: ReactNode;
    initialDiagram: DatabaseDiagram;
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

export function DatabaseDiagramProvider({ children, initialDiagram, fileDir }: DatabaseDiagramProviderProps) {
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

    const [nodes, setNodes] = useState<Node<{ table: Table, id: string }>[]>(memoizedInitialNodes);
    const [edges, setEdges] = useState<Edge<{ relationship: DatabaseRelationship }>[]>(memoizedInitialEdges);
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
                    setNodes(updatedNodes as Node<{ table: Table; id: string }>[]);
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
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds) as Node<{ table: Table, id: string }>[]),
        [setNodes]
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds) as Edge<{ relationship: DatabaseRelationship }>[]),
        [setEdges]
    );

    const onConnect: OnConnect = useCallback(
        (params) => {
            setEdges((eds) => {
                const sourceNode = nodes.find(node => node.id === params.source);
                const targetNode = nodes.find(node => node.id === params.target);

                if (!sourceNode || !targetNode) return eds;

                const sourceTable = sourceNode.data.table.name;
                const targetTable = targetNode.data.table.name;

                const relationship: DatabaseRelationship = {
                    name: `fk_${sourceTable}_${targetTable}`,
                    fromTable: sourceTable,
                    toTable: targetTable,
                    fromColumns: ['id'], // Default, should be configurable
                    toColumns: ['id'], // Default, should be configurable
                    cardinality: RelationshipCardinality.OneToMany,
                };

                return addEdge({
                    ...params,
                    type: 'default',
                    data: { relationship }
                }, eds) as Edge<{ relationship: DatabaseRelationship }>[];
            });
        },
        [nodes, setEdges]
    );

    const updateTable = useCallback((nodeId: string, tableData: Table) => {
        setNodes(nds =>
            nds.map(node =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, table: tableData } }
                    : node
            )
        );
    }, [setNodes]);

    const updateRelationship = useCallback((edgeId: string, relationshipUpdate: Partial<DatabaseRelationship>) => {
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
                                fromTable: currentRelationship.toTable,
                                toTable: currentRelationship.fromTable,
                                fromColumns: currentRelationship.toColumns,
                                toColumns: currentRelationship.fromColumns
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

    const addTableNode = useCallback(() => {
        setNodes(nds => {
            const newTableData: Table = {
                name: `Table_${nds.length + 1}`,
                columns: [
                    { name: 'id', dataType: 'INTEGER', constraints: ['PRIMARY KEY', 'AUTO_INCREMENT'] }
                ],
                primaryKey: ['id'],
            };
            const newNodeId = `table-${Date.now()}-${nds.length}`;
            const newTableNode: Node<{ table: Table, id: string }> = {
                id: newNodeId,
                type: 'table',
                position: { x: (nds.length % 10) * 200, y: Math.floor(nds.length / 10) * 150 + 100 },
                data: { table: newTableData, id: newNodeId },
            };
            return [...nds, newTableNode];
        });
    }, [setNodes]);

    const deleteTableNode = useCallback((nodeId: string) => {
        setNodes(nds => nds.filter(node => node.id !== nodeId));
        setEdges(eds => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    }, [setNodes, setEdges]);

    const getDiagramData = useCallback((): DatabaseDiagram => {
        const tables = nodes.map(node => node.data.table);
        const relationships = edges.map(edge => edge.data.relationship);
        return new DatabaseDiagram(initialDiagram.diagramName, tables, relationships);
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
            }
            if (!initialGeometryLoaded) setInitialGeometryLoaded(true);

        } catch (error) {
            console.error('Error saving file(s):', error);
            throw error;
        }
    }, [getDiagramData, nodes, initialGeometryLoaded, setInitialGeometryLoaded]);

    return (
        <DatabaseDiagramContext.Provider value={{
            nodes,
            edges,
            onNodesChange,
            onEdgesChange,
            onConnect,
            updateTable,
            updateRelationship,
            flipEdgeDirection,
            deleteEdge,
            addTableNode,
            deleteTableNode,
            saveDiagram,
            getDiagramData,
            setNodes,
            initialGeometryLoaded,
        }}>
            {children}
        </DatabaseDiagramContext.Provider>
    );
}

function convertDiagramToNodesAndEdges(diagram: DatabaseDiagram) {
    const nodes: Node<{ table: Table, id: string }>[] = diagram.tables.map((tableData, index) => {
        const nodeIdBase = tableData.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        const nodeId = `table-${nodeIdBase}-${index}`;
        return {
            id: nodeId,
            type: 'table',
            position: { x: (index % 5) * 280 + 50, y: Math.floor(index / 5) * 220 + 50 },
            data: { table: tableData, id: nodeId },
        };
    });

    const edges: Edge<{ relationship: DatabaseRelationship }>[] = diagram.relationships.map((relationship, index) => {
        const sourceNode = nodes.find(n => n.data.table.name === relationship.fromTable);
        const targetNode = nodes.find(n => n.data.table.name === relationship.toTable);

        if (!sourceNode || !targetNode) {
            console.warn("Could not find source or target node for relationship:", relationship);
            return null;
        }
        const edgeId = `edge-${sourceNode.id}-${targetNode.id}-${relationship.name || 'fk'}-${index}`;
        return {
            id: edgeId,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'default',
            data: { relationship },
        };
    }).filter(edge => edge !== null) as Edge<{ relationship: DatabaseRelationship }>[];

    return { nodes, edges };
}
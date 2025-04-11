import { useState, useCallback, use, useEffect, useRef } from 'react';
import '@xyflow/react/dist/base.css';
import {
    ReactFlow,
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    type Node,
    type Edge,
    type FitViewOptions,
    type OnConnect,
    type OnNodesChange,
    type OnEdgesChange,
    type OnNodeDrag,
    type NodeTypes,
    type DefaultEdgeOptions,
    Background,
    BackgroundVariant,
    Controls,
    ControlButton,
    ConnectionMode,
    MarkerType,
    EdgeMouseHandler,
} from '@xyflow/react';
import ClassNode from './ClassDiagram/ClassNode';
import { Method, Attribute, Class, RelationshipType, Relationship } from '../../models/ClassDiagram';
import ClassEdge from './ClassDiagram/ClassEdge';
import { Button } from '@mui/material';
import EdgeTypeMenu from './ClassDiagram/EdgeTypeMenu';
import { ClassDiagram } from '../../models/ClassDiagram';
const nodeTypes = {
    class: ClassNode,
};
const edgeTypes = {
    default: ClassEdge,
}


const ClassDiagramToNodesAndEdges = (classDiagram: ClassDiagram) => {
    const nodes: Node<{ class: Class, id: string }>[] = classDiagram.classes.map((classData, index) => ({
        id: `class-${index}`,
        type: 'class',
        position: { x: index * 200, y: 100 },
        data: { class: classData, id: `class-${index}` },
    }));

    const edges: Edge<{ relation: Relationship }>[] = classDiagram.relationships.map((relationship, index) => ({
        id: `edge-${index}`,
        source: `class-${classDiagram.classes.findIndex(c => c.name === relationship.fromClass)}`,
        target: `class-${classDiagram.classes.findIndex(c => c.name === relationship.toClass)}`,
        type: 'default',
        data: {
            type: relationship.type,
            fromMultiplicity: relationship.fromMultiplicity,
            toMultiplicity: relationship.toMultiplicity,
            fromClass: relationship.fromClass,
            toClass: relationship.toClass
        },
    }));

    return { nodes, edges };
}
const NodeAndEdgesToClassDiagram = (nodes: Node<{ class: Class, id: string }>[], edges: Edge<{ relationship: Relationship }>[]) => {
    const classes: Class[] = nodes.map(node => node.data.class);
    const relationships: Relationship[] = edges.map(edge => edge.data.relationship);
    return new ClassDiagram('', classes, relationships);
}



const classDataList: Class[] = [];


const fitViewOptions: FitViewOptions = {
    padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
    animated: false,
    style: { stroke: 'black' },
    interactionWidth: 20
};

interface ClassDiagramCanvasProps {
    diagram: ClassDiagram;
    fileDir?: string;
}

const ClassDiagramCanvas: React.FC<ClassDiagramCanvasProps> = ({ diagram, fileDir }) => {
    const { nodes: initialNodes, edges: initialEdges } = ClassDiagramToNodesAndEdges(diagram);
    const canvas = useRef<HTMLDivElement>(null);
    const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
    const [nodes, setNodes] = useState<Node<{ class: Class, id: string }>[]>(initialNodes);
    const [edges, setEdges] = useState<Edge<{ relationship: Relationship }>[]>(initialEdges);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds) as Node<{ class: Class, id: string }>[]),
        [setNodes],
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds) as Edge<{ relationship: Relationship }>[]),
        [setEdges],
    );
    const onConnect: OnConnect = useCallback(
        (params) => setEdges((eds) => {
            // find the source and target nodes class name
            const sourceNode = nodes.find(node => node.id === params.source);
            const targetNode = nodes.find(node => node.id === params.target);
            if (!sourceNode || !targetNode) return eds; // Handle the case where nodes are not found
            const sourceClass = sourceNode.data.class.name;
            const targetClass = targetNode.data.class.name;
            const defaultRelationship: Relationship = {
                type: RelationshipType.Association,
                fromClass: sourceClass || '',
                toClass: targetClass || '',
                fromMultiplicity: '1',
                toMultiplicity: '1',
            };
            addEdge({ ...params, type: 'default', data: { relationship: null } }, eds)
        }),
        [setEdges],
    );

    const saveDiagram = () => {
        const classDiagram = NodeAndEdgesToClassDiagram(nodes, edges);
        const json = JSON.stringify(classDiagram, null, 2);
        window.myAPI.saveFile(fileDir || '', json).then(() => {
            console.log('File saved successfully!');
        }).catch((error: Error) => {
            console.error('Error saving file:', error);
        });
    }
    const addClassNode = () => {
        const newClassData: Class = {
            name: `Class ${nodes.length + 1}`,
            type: 'class',
            attributes: [],
            methods: [],
        }
        classDataList.push(newClassData);
        const newClassNode: Node<{ class: Class, id: string }> = {
            id: `class-${nodes.length}`,
            type: 'class',
            position: { x: nodes.length * 200, y: 100 },
            data: { class: classDataList[nodes.length % classDataList.length], id: `class-${nodes.length}` },
        };
        setNodes((nds) => nds.concat(newClassNode))
    }

    const onEdgeContextMenu = useCallback<EdgeMouseHandler>(
        (event, edge) => {
            event.preventDefault(); // Prevent native context menu
            const reactFlowBounds = canvas.current.getBoundingClientRect();

            // Calculate position relative to the React Flow container
            const top = event.clientY - reactFlowBounds.top;
            const left = event.clientX - reactFlowBounds.left;
            setMenu({
                id: edge.id,
                top: top,
                left: left,
            });

        },
        [setMenu]
    );

    // Close menu on pane click
    const onPaneClick = useCallback(() => setMenu(null), [setMenu]);


    // Handler passed to the EdgeTypeMenu
    const handleSelectEdgeType = (edgeId: string, type: RelationshipType) => {
        setEdges((eds) =>
            eds.map((edge) => {
                if (edge.id === edgeId) {
                    return {
                        ...edge,
                        data: {
                            ...edge.data,
                            type: type,
                        },
                    };
                }
                return edge;
            })
        );
        setMenu(null);
    };

    const handleDeleteEdge = (edgeId: string) => {
        setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
        setMenu(null);
    }
    return (
        <>
            <ReactFlow
                ref={canvas}
                style={{ backgroundColor: '#f0f0f0' }}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onPaneClick={onPaneClick}
                connectionMode={ConnectionMode.Loose}
                onEdgeContextMenu={onEdgeContextMenu}
                fitView
                fitViewOptions={fitViewOptions}
                defaultEdgeOptions={defaultEdgeOptions}
            >
                <Background color="#ccc" variant={BackgroundVariant.Dots} />
                <Controls>
                    <Button variant="contained" onClick={addClassNode} className=''>
                        Add Class Node
                    </Button>
                    <Button variant='contained' onClick={() => saveDiagram()} className=''>
                        Save
                    </Button>
                </Controls>
                {menu && (
                    <EdgeTypeMenu
                        id={menu.id}
                        top={menu.top}
                        left={menu.left}
                        onSelectEdgeType={handleSelectEdgeType}
                        onDeleteEdge={handleDeleteEdge}
                        onClick={(e) => e.stopPropagation()} // Prevent closing the menu when clicking inside it
                    // Optional: Add a className for further styling from here
                    // className="my-custom-menu-styles"
                    />
                )}
            </ReactFlow>
        </>

    );
}

export default ClassDiagramCanvas;
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
import { type ClassNodeData } from './ClassDiagram/ClassNode';
import ClassEdge, { EdgeTypes } from './ClassDiagram/ClassEdge';
import { Button } from '@mui/material';
import { Add, ControlCamera } from '@mui/icons-material';
import EdgeTypeMenu from './ClassDiagram/EdgeTypeMenu';
const nodeTypes = {
    class: ClassNode,
};
const edgeTypes = {
    default: ClassEdge,
}

const classNodeDataList: ClassNodeData[] = [
    {
        name: 'MyClass',
        attributes: [
            { name: 'attribute1', type: 'string' },
            { name: 'attribute2', type: 'number' },
        ],
        methods: [
            { name: 'method1', returnType: 'void' },
            { name: 'method2', returnType: 'string' },
        ],
    },
    {
        name: 'AnotherClass',
        attributes: [
            { name: 'attributeA', type: 'boolean' },
            { name: 'attributeB', type: 'array' },
        ],
        methods: [
            { name: 'methodA', returnType: 'number' },
            { name: 'methodB', returnType: 'void' },
        ],
    },
];

const initialNodes: Node[] = classNodeDataList.map((data, index) => ({
    id: `class-${index}`,
    type: 'class',
    position: { x: index * 200, y: 100 },
    dragHandle: '.drag-handle_custom',
    data: { class: data, id: `class-${index}` },
}));

const initialEdges: Edge[] = [
    {
        id: 'e1-2', source: 'class-0', target: 'class-1',
        sourceHandle: 'c',
        targetHandle: 'a',
        type: 'default',
        data: { type: EdgeTypes.Inheritance },
    },];

const fitViewOptions: FitViewOptions = {
    padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
    animated: false,
    style: { stroke: 'black' },
    interactionWidth: 20
};


const ClassDiagramCanvas = () => {
    const canvas = useRef<HTMLDivElement>(null);
    const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes],
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges],
    );
    const onConnect: OnConnect = useCallback(
        (params) => setEdges((eds) => addEdge({ ...params, type: 'default', data: { type: EdgeTypes.Aggregation } }, eds)),
        [setEdges],
    );


    const addClassNode = () => {
        const newClassData: ClassNodeData = {
            name: 'NewClass',
            attributes: [],
            methods: [],
        }
        classNodeDataList.push(newClassData);
        const newClassNode = {
            id: `class-${nodes.length}`,
            type: 'class',
            position: { x: nodes.length * 200, y: 100 },
            data: { class: classNodeDataList[nodes.length % classNodeDataList.length] },
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
    const handleSelectEdgeType = (edgeId: string, type: EdgeTypes) => {
        setEdges((eds) =>
            eds.map((edge) => {
                if (edge.id === edgeId) {
                    // Properly update the data.type property
                    return {
                        ...edge,
                        data: { ...(edge.data || {}), type: type }
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
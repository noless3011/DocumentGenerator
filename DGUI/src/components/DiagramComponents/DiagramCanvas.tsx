import { useState, useCallback } from 'react';
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
} from '@xyflow/react';
import ClassNode from './ClassDiagram/ClassNode';
import { type ClassNodeData } from './ClassDiagram/ClassNode';
import ClassEdge from './ClassDiagram/ClassEdge';
import { Button } from '@mui/material';
import { ControlCamera } from '@mui/icons-material';
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
    data: { class: data },
}));

const initialEdges: Edge[] = [
    { id: 'e1-2', source: 'class-0', target: 'class-1', type: 'default' },];

const fitViewOptions: FitViewOptions = {
    padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
    animated: true,
};

const onNodeDrag: OnNodeDrag = (_, node) => {
    console.log('drag event', node.data);
};

const DiagramCanvas = () => {
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
        (connection) => setEdges((eds) => addEdge(connection, eds)),
        [setEdges],
    );

    const addClassNode = () => {
        const newNode = {
            id: `class-${nodes.length}`,
            type: 'class',
            position: { x: nodes.length * 200, y: 100 },
            data: { class: classNodeDataList[nodes.length % classNodeDataList.length] },
        };
        setNodes((nds) => nds.concat(newNode));
    }
    return (
        <>
            <ReactFlow
                style={{ backgroundColor: '#f0f0f0' }}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDrag={onNodeDrag}
                connectionMode={ConnectionMode.Loose}
                fitView
                fitViewOptions={fitViewOptions}
                defaultEdgeOptions={defaultEdgeOptions}
            >
                <Background color="#ccc" variant={BackgroundVariant.Dots} />
                <Controls>
                    <ControlButton onClick={() => alert('Something magical just happened. ✨')}>
                        <ControlCamera></ControlCamera>
                    </ControlButton>
                </Controls>
            </ReactFlow>
            <Button variant="contained" onClick={addClassNode} className=''>
                Add Class Node
            </Button>
        </>

    );
}

export default DiagramCanvas;
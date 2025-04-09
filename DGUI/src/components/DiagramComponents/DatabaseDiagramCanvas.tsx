import { useState, useCallback, useRef } from 'react';
import '@xyflow/react/dist/base.css';

import TableNode from './DatabaseDiagram/TableNode';
import { type TableNodeData } from './DatabaseDiagram/TableNode';
import TableEdge, { EdgeTypes } from './DatabaseDiagram/TableEdge';
import { Button } from '@mui/material';
import EdgeTypeMenu from './DatabaseDiagram/EdgeTypeMenu';

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
    type NodeTypes,
    type DefaultEdgeOptions,
    Background,
    BackgroundVariant,
    Controls,
    ConnectionMode,
    EdgeMouseHandler,
} from '@xyflow/react';

const nodeTypes = {
    table: TableNode,
};

const edgeTypes = {
    default: TableEdge,
}

const tableNodeDataList: TableNodeData[] = [
    {
        name: 'Users',
        columns: [
            { name: 'id', type: 'int', isPrimaryKey: true, isNotNull: true },
            { name: 'username', type: 'varchar(50)', isUnique: true, isNotNull: true },
            { name: 'email', type: 'varchar(100)', isUnique: true, isNotNull: true },
            { name: 'created_at', type: 'timestamp' },
        ],
    },
    {
        name: 'Posts',
        columns: [
            { name: 'id', type: 'int', isPrimaryKey: true, isNotNull: true },
            { name: 'user_id', type: 'int', isForeignKey: true, isNotNull: true },
            { name: 'title', type: 'varchar(200)', isNotNull: true },
            { name: 'content', type: 'text' },
            { name: 'published_at', type: 'timestamp' },
        ],
    },
];

const initialNodes: Node[] = tableNodeDataList.map((data, index) => ({
    id: `table-${index}`,
    type: 'table',
    position: { x: index * 300, y: 100 },
    dragHandle: '.drag-handle_custom',
    data: { table: data, id: `table-${index}` },
}));

const initialEdges: Edge[] = [
    {
        id: 'e1-2',
        source: 'table-0',
        target: 'table-1',
        sourceHandle: 'c',
        targetHandle: 'a',
        type: 'default',
        data: { type: EdgeTypes.OneToMany, label: 'has many' },
    },
];

const fitViewOptions: FitViewOptions = {
    padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
    animated: false,
    style: { stroke: 'black' },
    interactionWidth: 20
};

const DatabaseDiagramCanvas = () => {
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
        (params) => setEdges((eds) => addEdge({ ...params, type: 'default', data: { type: EdgeTypes.Reference } }, eds)),
        [setEdges],
    );

    const addTableNode = () => {
        const newTableData: TableNodeData = {
            name: 'NewTable',
            columns: [
                { name: 'id', type: 'int', isPrimaryKey: true },
                { name: 'name', type: 'varchar(50)' },
            ],
        }

        const newTableNode = {
            id: `table-${nodes.length}`,
            type: 'table',
            position: { x: 100, y: nodes.length * 150 },
            data: { table: newTableData },
        };

        setNodes((nds) => nds.concat(newTableNode))
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
                style={{ backgroundColor: '#f5f5f5' }}
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
                    <Button variant="contained" onClick={addTableNode} className=''>
                        Add Table
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
                    />
                )}
            </ReactFlow>
        </>
    );
}

export default DatabaseDiagramCanvas;
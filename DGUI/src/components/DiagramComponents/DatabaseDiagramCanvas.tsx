import { useRef, useCallback, useState, useEffect } from 'react';
import '@xyflow/react/dist/base.css';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    ConnectionMode,
    FitViewOptions,
    DefaultEdgeOptions,
    EdgeMouseHandler,
} from '@xyflow/react';
import TableNode from './DatabaseDiagram/TableNode';
import TableEdge from './DatabaseDiagram/TableEdge';
import { Button, Menu, MenuItem } from '@mui/material';
import EdgeTypeMenu from './DatabaseDiagram/EdgeTypeMenu';
import { DatabaseDiagram, RelationshipCardinality } from '../../models/DatabaseDiagram';
import { useDatabaseDiagramContext, DatabaseDiagramProvider } from '../../provider/diagram_providers/DatabaseDiagramProvider';
import { autoArrange, gridLayout, circleLayout, forceDirectedLayout, LayoutOptions } from '../../utils/Arrange';

const nodeTypes = {
    table: TableNode,
};

const edgeTypes = {
    default: TableEdge,
};

const fitViewOptions: FitViewOptions = {
    padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
    animated: false,
    style: { stroke: 'black' },
    interactionWidth: 20
};

interface DatabaseDiagramCanvasProps {
    diagram: DatabaseDiagram;
    fileDir?: string;
}

const DatabaseDiagramCanvasInner = ({ fileDir }: { fileDir?: string }) => {
    const canvas = useRef<HTMLDivElement>(null);
    const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
    const [arrangeMenu, setArrangeMenu] = useState<{ top: number; left: number } | null>(null);

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        updateRelationship,
        flipEdgeDirection,
        deleteEdge,
        addTableNode,
        saveDiagram,
        setNodes,
    } = useDatabaseDiagramContext();

    const onEdgeContextMenu: EdgeMouseHandler = useCallback((event, edge) => {
        event.preventDefault();
        const reactFlowBounds = canvas.current?.getBoundingClientRect();

        if (!reactFlowBounds) return;

        const top = event.clientY - reactFlowBounds.top;
        const left = event.clientX - reactFlowBounds.left;
        setMenu({
            id: edge.id,
            top,
            left,
        });
    }, []);

    const onPaneClick = useCallback(() => {
        setMenu(null);
        setArrangeMenu(null);
    }, []);

    const handleSelectCardinality = useCallback((edgeId: string, cardinality: RelationshipCardinality) => {
        updateRelationship(edgeId, { cardinality });
        setMenu(null);
    }, [updateRelationship]);

    const handleFlipDirection = useCallback((edgeId: string) => {
        flipEdgeDirection(edgeId);
        setMenu(null);
    }, [flipEdgeDirection]);

    const handleDeleteEdge = useCallback((edgeId: string) => {
        deleteEdge(edgeId);
        setMenu(null);
    }, [deleteEdge]);

    const handleSave = useCallback(() => {
        if (fileDir) {
            saveDiagram(fileDir)
                .catch(err => {
                    console.error('Error saving diagram or geometry from canvas:', err);
                });
        } else {
            console.warn('Save clicked, but no fileDir is specified. Diagram not saved.');
        }
    }, [fileDir, saveDiagram]);

    const handleArrangeClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setArrangeMenu({
            top: buttonRect.bottom,
            left: buttonRect.left,
        });
    }, []);

    const handleArrange = useCallback((layoutType: string, options: LayoutOptions = {}) => {
        let arrangedNodes;
        switch (layoutType) {
            case 'auto':
                // Use gridLayout for database tables since autoArrange expects class nodes
                arrangedNodes = gridLayout(nodes, options);
                break;
            case 'force':
                arrangedNodes = forceDirectedLayout(nodes, edges, options);
                break;
            case 'grid':
                arrangedNodes = gridLayout(nodes, options);
                break;
            case 'circle':
                arrangedNodes = circleLayout(nodes, options);
                break;
            default:
                arrangedNodes = gridLayout(nodes, options);
        }

        setNodes(arrangedNodes);
        setArrangeMenu(null);
    }, [nodes, edges, setNodes]);

    return (
        <>
            <ReactFlow
                ref={canvas}
                style={{ backgroundColor: '#f0f0f0', width: '100%', height: '100%' }}
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
                    <Button variant="contained" onClick={addTableNode}>
                        Add Table
                    </Button>
                    <br />
                    <Button variant="contained" onClick={handleArrangeClick}>
                        Arrange
                    </Button>
                    <br />
                    <Button variant="contained" onClick={handleSave} disabled={!fileDir}>
                        Save
                    </Button>
                </Controls>
                {menu && (
                    <EdgeTypeMenu
                        id={menu.id}
                        top={menu.top}
                        left={menu.left}
                        onSelectCardinality={handleSelectCardinality}
                        onDeleteEdge={handleDeleteEdge}
                        onFlipDirection={handleFlipDirection}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
                {arrangeMenu && (
                    <div
                        style={{
                            position: 'absolute',
                            zIndex: 1000,
                            backgroundColor: 'white',
                            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                            borderRadius: '4px',
                            top: arrangeMenu.top,
                            left: arrangeMenu.left
                        }}
                    >
                        <Menu
                            open={Boolean(arrangeMenu)}
                            anchorReference="anchorPosition"
                            anchorPosition={arrangeMenu && {
                                top: arrangeMenu.top,
                                left: arrangeMenu.left
                            }}
                            onClose={() => setArrangeMenu(null)}
                        >
                            <MenuItem onClick={() => handleArrange('auto')}>Auto Arrange</MenuItem>
                            <MenuItem onClick={() => handleArrange('grid')}>Grid Layout</MenuItem>
                            <MenuItem onClick={() => handleArrange('circle', { centerX: 500, centerY: 300 })}>Circle Layout</MenuItem>
                            <MenuItem onClick={() => handleArrange('force')}>Force Directed Layout</MenuItem>
                        </Menu>
                    </div>
                )}
            </ReactFlow>
        </>
    );
};

const DatabaseDiagramCanvas: React.FC<DatabaseDiagramCanvasProps> = ({ diagram, fileDir }) => {
    const providerKey = fileDir || diagram.diagramName || 'new-diagram';
    return (
        <DatabaseDiagramProvider key={providerKey} initialDiagram={diagram} fileDir={fileDir}>
            <DatabaseDiagramCanvasInner fileDir={fileDir} />
        </DatabaseDiagramProvider>
    );
};

export default DatabaseDiagramCanvas;
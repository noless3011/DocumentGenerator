import { useRef, useCallback, useState } from 'react';
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
import ClassNode from './ClassDiagram/ClassNode';
import ClassEdge from './ClassDiagram/ClassEdge';
import { Button, Menu, MenuItem } from '@mui/material';
import EdgeTypeMenu from './ClassDiagram/EdgeTypeMenu';
import { ClassDiagram, RelationshipType } from '../../models/ClassDiagram';
import { useDiagramContext, ClassDiagramProvider } from '../../provider/diagram_providers/ClassDiagramProvider';
import { autoArrange, gridLayout, circleLayout, LayoutOptions } from '../../utils/Arrange';

const nodeTypes = {
    class: ClassNode,
};

const edgeTypes = {
    default: ClassEdge,
};

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

// This is the inner component that uses the context
const ClassDiagramCanvasInner = ({ fileDir }: { fileDir?: string }) => {
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
        addClassNode,
        saveDiagram,
        setNodes
    } = useDiagramContext();

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

    const handleSelectEdgeType = useCallback((edgeId: string, type: RelationshipType) => {
        updateRelationship(edgeId, { type });
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
            saveDiagram(fileDir);
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
                arrangedNodes = autoArrange(nodes, edges, options);
                break;
            case 'grid':
                arrangedNodes = gridLayout(nodes, options);
                break;
            case 'circle':
                arrangedNodes = circleLayout(nodes, options);
                break;
            default:
                arrangedNodes = autoArrange(nodes, edges, options);
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
                    <Button variant="contained" onClick={addClassNode}>
                        Add Class Node
                    </Button>
                    <br />
                    <Button variant="contained" onClick={handleArrangeClick}>
                        Arrange
                    </Button>
                    <br />
                    <Button variant="contained" onClick={handleSave}>
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
                        </Menu>
                    </div>
                )}
            </ReactFlow>
        </>
    );
};

// This is the wrapper component that provides the context
const ClassDiagramCanvas: React.FC<ClassDiagramCanvasProps> = ({ diagram, fileDir }) => {
    return (
        <ClassDiagramProvider initialDiagram={diagram}>
            <ClassDiagramCanvasInner fileDir={fileDir} />
        </ClassDiagramProvider>
    );
};

export default ClassDiagramCanvas;
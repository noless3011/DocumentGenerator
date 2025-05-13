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
    // useReactFlow, // Removed: No longer needed here
} from '@xyflow/react';
import ClassNode from './ClassDiagram/ClassNode';
import ClassEdge from './ClassDiagram/ClassEdge';
import { Button, Menu, MenuItem } from '@mui/material';
import EdgeTypeMenu from './ClassDiagram/EdgeTypeMenu';
import { ClassDiagram, RelationshipType } from '../../models/ClassDiagram';
import { useDiagramContext, ClassDiagramProvider } from '../../provider/diagram_providers/ClassDiagramProvider';
import { autoArrange, gridLayout, circleLayout, forceDirectedLayout, LayoutOptions } from '../../utils/Arrange';

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
    // const { getNodes: getReactFlowNodes, fitView: rfFitView } = useReactFlow(); // Removed

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
        saveDiagram, // This is the context's saveDiagram, which handles geometry
        setNodes,
        // initialGeometryLoaded, // Removed: Provider handles initial geometry loading/creation
        // saveNodeGeometriesIfNeeded // Removed: Provider handles initial geometry logic
    } = useDiagramContext();

    // Removed useEffect for initial geometry saving as provider now handles this.
    // The ClassDiagramProvider will attempt to load geometry or create an initial
    // geometry file if one doesn't exist.

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
            saveDiagram(fileDir) // This calls the context's saveDiagram
                .then(() => {
                    console.log('Diagram and geometry saved successfully via canvas save button.');
                })
                .catch(err => {
                    console.error('Error saving diagram or geometry from canvas:', err);
                });
        } else {
            // Optionally, handle saving for new diagrams (e.g., prompt for file path)
            // For now, we assume saveDiagram in provider might throw or handle missing fileDir.
            // Or, the button could be disabled if fileDir is not available.
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
        // Ensure 'nodes' from context has the most current data, including dimensions if available
        // For layout algorithms, current positions and sometimes dimensions are important.
        // The 'nodes' from context should be up-to-date due to onNodesChange.
        switch (layoutType) {
            case 'auto':
                arrangedNodes = autoArrange(nodes, edges, options);
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
                    <Button variant="contained" onClick={handleSave} disabled={!fileDir}>
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
                            <MenuItem onClick={() => handleArrange('force')}>Force Directed Layout</MenuItem>
                        </Menu>
                    </div>
                )}
            </ReactFlow>
        </>
    );
};

// This is the wrapper component that provides the context
const ClassDiagramCanvas: React.FC<ClassDiagramCanvasProps> = ({ diagram, fileDir }) => {
    // Keying the provider by fileDir (or a unique ID for new diagrams) can help
    // ensure a fresh provider state when the diagram source changes.
    // The initialDiagram prop will also trigger updates if its reference changes.
    const providerKey = fileDir || diagram.diagramName || 'new-diagram';
    return (
        <ClassDiagramProvider key={providerKey} initialDiagram={diagram} fileDir={fileDir}>
            <ClassDiagramCanvasInner fileDir={fileDir} />
        </ClassDiagramProvider>
    );
};

export default ClassDiagramCanvas;

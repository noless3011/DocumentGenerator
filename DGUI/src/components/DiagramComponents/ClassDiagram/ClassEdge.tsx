import React, { useState, useRef, useEffect } from 'react';
import { getBezierPath, BaseEdge, EdgeProps, Edge, useInternalNode, Position, EdgeLabelRenderer } from '@xyflow/react';
import { RelationshipType, Relationship } from '../../../models/ClassDiagram';
import { useDiagramContext } from '../../../provider/diagram_providers/ClassDiagramProvider';
import '@xyflow/react/dist/base.css';

type ClassEdgeData = {
    relationship: Relationship;
};

type ClassEdge = Edge<ClassEdgeData, 'default'>;

// Marker IDs definition
const MARKER_IDS = {
    hollowTriangle: 'uml-hollow-triangle',
    hollowDiamond: 'uml-hollow-diamond',
    filledDiamond: 'uml-filled-diamond',
    openArrow: 'uml-open-arrow',
};

// Helper function to render multiplicity labels
const renderMultiplicityLabel = (
    multiplicity: string | undefined,
    position: { x: number, y: number },
    editing: boolean,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onClick: () => void,
    onBlur: () => void,
    onKeyDown: (e: React.KeyboardEvent) => void,
    inputRef: React.RefObject<HTMLInputElement>
) => {
    if (editing) {
        return (
            <EdgeLabelRenderer>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    className="absolute -translate-x-1/2 -translate-y-1/2 bg-white px-0.5 py-[1px] rounded text-xs font-normal border border-blue-500 z-[1000] min-w-[20px] nodrag nopan pointer-events-auto focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{
                        transform: `translate(-50%, -50%) translate(${position.x}px,${position.y}px)`,
                    }}
                    autoFocus
                />
            </EdgeLabelRenderer>
        );
    }

    return (
        <EdgeLabelRenderer>
            <div
                className="absolute -translate-x-1/2 -translate-y-1/2 bg-white px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer border border-gray-400 shadow-sm z-[1000] min-w-[20px] min-h-[16px] text-center select-none pointer-events-auto nodrag nopan hover:bg-gray-50 hover:scale-110 transition-transform duration-150"
                style={{
                    transform: `translate(-50%, -50%) translate(${position.x}px,${position.y}px)`,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Multiplicity label clicked!');
                    onClick();
                }}
            >
                {multiplicity || '*'}
            </div>
        </EdgeLabelRenderer>
    );
};

// Determine edge style based on relationship type
const getEdgeStyle = (edgeType: RelationshipType, style?: React.CSSProperties) => {
    let strokeDasharray = 'none';
    let markerStartUrl = '';
    let markerEndUrl = '';

    switch (edgeType) {
        case RelationshipType.Inheritance:
            markerEndUrl = `url(#${MARKER_IDS.hollowTriangle})`;
            break;
        case RelationshipType.Realization:
            markerEndUrl = `url(#${MARKER_IDS.hollowTriangle})`;
            strokeDasharray = '5, 5';
            break;
        case RelationshipType.Dependency:
            markerEndUrl = `url(#${MARKER_IDS.openArrow})`;
            strokeDasharray = '5, 5';
            break;
        case RelationshipType.Aggregation:
            markerStartUrl = `url(#${MARKER_IDS.hollowDiamond})`;
            break;
        case RelationshipType.Composition:
            markerStartUrl = `url(#${MARKER_IDS.filledDiamond})`;
            break;
        // Association and default case - simple line
    }

    return { strokeDasharray, markerStartUrl, markerEndUrl };
};

// Calculate node center
const getCenter = (node: any) => {
    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    const x = node.internals.positionAbsolute.x ?? 0;
    const y = node.internals.positionAbsolute.y ?? 0;

    return { x: x + width / 2, y: y + height / 2 };
};

// Get handle coordinates by position
const getHandleCoordsByPosition = (node: any, handlePosition: Position) => {
    if (!node?.internals?.handleBounds?.source || !node.internals.positionAbsolute || !node.measured) {
        const center = getCenter(node);
        return [center.x, center.y];
    }

    const handle = node.internals.handleBounds.source.find(
        (h: any) => h.position === handlePosition,
    );

    if (!handle) {
        const center = getCenter(node);
        const width = node.measured.width ?? 0;
        const height = node.measured.height ?? 0;
        const absX = node.internals.positionAbsolute.x;
        const absY = node.internals.positionAbsolute.y;

        switch (handlePosition) {
            case Position.Left: return [absX, center.y];
            case Position.Right: return [absX + width, center.y];
            case Position.Top: return [center.x, absY];
            case Position.Bottom: return [center.x, absY + height];
            default: return [center.x, center.y];
        }
    }

    let offsetX = handle.width / 2;
    let offsetY = handle.height / 2;

    switch (handlePosition) {
        case Position.Left:
            offsetX = 0;
            break;
        case Position.Right:
            offsetX = handle.width;
            break;
        case Position.Top:
            offsetY = 0;
            break;
        case Position.Bottom:
            offsetY = handle.height;
            break;
    }

    const x = node.internals.positionAbsolute.x + handle.x + offsetX;
    const y = node.internals.positionAbsolute.y + handle.y + offsetY;

    return [x, y];
};

// Determine closest side for connection
const getClosestSide = (source: any, target: any): Position => {
    const centerSource = getCenter(source);
    const centerTarget = getCenter(target);

    const horizontalDiff = Math.abs(centerSource.x - centerTarget.x);
    const verticalDiff = Math.abs(centerSource.y - centerTarget.y);

    if (horizontalDiff > verticalDiff) {
        return centerSource.x > centerTarget.x ? Position.Left : Position.Right;
    } else {
        return centerSource.y > centerTarget.y ? Position.Top : Position.Bottom;
    }
};

// Get edge parameters
const getEdgeParams = (sourceNode: any, targetNode: any) => {
    const sourcePos = getClosestSide(sourceNode, targetNode);
    const targetPos = getClosestSide(targetNode, sourceNode);

    const [sx, sy] = getHandleCoordsByPosition(sourceNode, sourcePos);
    const [tx, ty] = getHandleCoordsByPosition(targetNode, targetPos);

    return { sx, sy, tx, ty, sourcePos, targetPos };
};

// Position multiplicity labels
const getMultiplicityPosition = (x: number, y: number, handlePosition: Position, offset: number = 15) => {
    switch (handlePosition) {
        case Position.Left:
            return { x: x - offset, y: y + offset };
        case Position.Right:
            return { x: x + offset, y: y - offset };
        case Position.Top:
            return { x: x + offset, y: y - offset };
        case Position.Bottom:
            return { x: x - offset, y: y + offset };
        default:
            return { x, y };
    }
}


const ClassEdge = ({ id, source, target, data, style, interactionWidth = 10 }: EdgeProps<ClassEdge>) => {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    const { updateRelationship } = useDiagramContext();

    // Add state for editing multiplicity
    const [editingSource, setEditingSource] = useState(false);
    const [editingTarget, setEditingTarget] = useState(false);
    const [sourceMultiplicityValue, setSourceMultiplicityValue] = useState(data?.relationship.fromMultiplicity || '');
    const [targetMultiplicityValue, setTargetMultiplicityValue] = useState(data?.relationship.toMultiplicity || '');

    const sourceInputRef = useRef<HTMLInputElement>(null);
    const targetInputRef = useRef<HTMLInputElement>(null);

    // Update local state when props change
    useEffect(() => {
        setSourceMultiplicityValue(data?.relationship.fromMultiplicity || '');
        setTargetMultiplicityValue(data?.relationship.toMultiplicity || '');
    }, [data?.relationship.fromMultiplicity, data?.relationship.toMultiplicity]);

    // Handle click outside to end editing
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sourceInputRef.current && !sourceInputRef.current.contains(event.target as Node)) {
                saveSourceEdit();
            }
            if (targetInputRef.current && !targetInputRef.current.contains(event.target as Node)) {
                saveTargetEdit();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [sourceMultiplicityValue, targetMultiplicityValue]);

    // Save handlers
    const saveSourceEdit = () => {
        if (editingSource) {
            setEditingSource(false);
            if (data?.relationship.fromMultiplicity !== sourceMultiplicityValue) {
                updateRelationship(id, {
                    fromMultiplicity: sourceMultiplicityValue
                });
            }
        }
    };

    const saveTargetEdit = () => {
        if (editingTarget) {
            setEditingTarget(false);
            if (data?.relationship.toMultiplicity !== targetMultiplicityValue) {
                updateRelationship(id, {
                    toMultiplicity: targetMultiplicityValue
                });
            }
        }
    };

    // Key handlers
    const handleSourceKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveSourceEdit();
        } else if (e.key === 'Escape') {
            setEditingSource(false);
            setSourceMultiplicityValue(data?.relationship.fromMultiplicity || '');
        }
    };

    const handleTargetKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveTargetEdit();
        } else if (e.key === 'Escape') {
            setEditingTarget(false);
            setTargetMultiplicityValue(data?.relationship.toMultiplicity || '');
        }
    };

    if (!sourceNode?.internals?.positionAbsolute || !targetNode?.internals?.positionAbsolute ||
        !sourceNode.measured || !targetNode.measured) {
        return null; // Nodes not fully initialized yet
    }

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        targetX: tx,
        targetY: ty,
        curvature: 0.2,
    });

    // Style and markers based on relationship type
    const edgeType = data?.relationship.type ?? RelationshipType.Association;
    const edgeStyle = getEdgeStyle(edgeType, style);

    // Calculate positions for multiplicity labels
    const sourceMultiplicityPos = getMultiplicityPosition(sx, sy, sourcePos, 20);
    const targetMultiplicityPos = getMultiplicityPosition(tx, ty, targetPos, 20);

    return (
        <>
            {/* Define all markers */}
            <defs>
                {/* Hollow Triangle (Inheritance, Realization) */}
                <marker
                    id={MARKER_IDS.hollowTriangle}
                    viewBox="0 0 20 20"
                    markerWidth="15"
                    markerHeight="15"
                    refX="19"
                    refY="10"
                    orient="auto-start-reverse"
                >
                    <path d="M 1 1 L 19 10 L 1 19 z" fill={style?.stroke ?? 'white'} stroke={style?.stroke ?? 'black'} strokeWidth="1.5" />
                </marker>

                {/* Open Arrow (Dependency) */}
                <marker
                    id={MARKER_IDS.openArrow}
                    viewBox="0 0 20 20"
                    markerWidth="12"
                    markerHeight="12"
                    refX="19"
                    refY="10"
                    orient="auto-start-reverse"
                >
                    <path d="M 1 1 L 19 10 L 1 19" fill="none" stroke={style?.stroke ?? 'black'} strokeWidth="1.5" />
                </marker>

                {/* Hollow Diamond (Aggregation) */}
                <marker
                    id={MARKER_IDS.hollowDiamond}
                    viewBox="0 0 20 20"
                    markerWidth="16"
                    markerHeight="16"
                    refX="1"
                    refY="10"
                    orient="auto"
                >
                    <path d="M 10 1 L 19 10 L 10 19 L 1 10 z" fill="white" stroke={style?.stroke ?? 'black'} strokeWidth="1.5" />
                </marker>

                {/* Filled Diamond (Composition) */}
                <marker
                    id={MARKER_IDS.filledDiamond}
                    viewBox="0 0 20 20"
                    markerWidth="16"
                    markerHeight="16"
                    refX="1"
                    refY="10"
                    orient="auto"
                >
                    <path d="M 10 1 L 19 10 L 10 19 L 1 10 z" fill="black" stroke={style?.stroke ?? 'black'} strokeWidth="1.5" />
                </marker>
            </defs>

            {/* Invisible path for better interaction */}
            <path
                id={id + '-interaction'}
                d={edgePath}
                fill="none"
                strokeOpacity={0}
                strokeWidth={interactionWidth}
                className="react-flow__edge-interaction"
            />

            {/* Visible edge path */}
            <path
                id={id}
                className="react-flow__edge-path"
                d={edgePath}
                strokeDasharray={edgeStyle.strokeDasharray}
                markerStart={edgeStyle.markerStartUrl}
                markerEnd={edgeStyle.markerEndUrl}
                style={style}
            />

            {/* Relationship type label */}
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        background: '#f0f0f0',
                        padding: '2px 4px',
                        borderRadius: 5,
                        fontSize: 8,
                        fontWeight: 700,
                    }}
                    className="nodrag nopan"
                >
                    {data.relationship.type}
                </div>
            </EdgeLabelRenderer>

            {/* Multiplicity labels */}
            {renderMultiplicityLabel(
                data.relationship.fromMultiplicity,
                sourceMultiplicityPos,
                editingSource,
                sourceMultiplicityValue,
                (e) => setSourceMultiplicityValue(e.target.value),
                () => setEditingSource(true),
                saveSourceEdit,
                handleSourceKeyDown,
                sourceInputRef
            )}
            {renderMultiplicityLabel(
                data.relationship.toMultiplicity,
                targetMultiplicityPos,
                editingTarget,
                targetMultiplicityValue,
                (e) => setTargetMultiplicityValue(e.target.value),
                () => setEditingTarget(true),
                saveTargetEdit,
                handleTargetKeyDown,
                targetInputRef
            )}
        </>
    );
};

export default ClassEdge;
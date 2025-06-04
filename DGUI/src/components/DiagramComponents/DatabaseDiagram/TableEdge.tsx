import React, { useState, useRef, useEffect } from 'react';
import { getBezierPath, BaseEdge, EdgeProps, Edge, useInternalNode, Position, EdgeLabelRenderer } from '@xyflow/react';
import { RelationshipCardinality, DatabaseRelationship } from '../../../models/DatabaseDiagram';
import { useDatabaseDiagramContext } from '../../../provider/diagram_providers/DatabaseDiagramProvider';
import '@xyflow/react/dist/base.css';

type DatabaseEdgeData = {
    relationship: DatabaseRelationship;
};

type DatabaseEdge = Edge<DatabaseEdgeData, 'default'>;

const MARKER_IDS = {
    oneToMany: 'db-one-to-many',
    manyToOne: 'db-many-to-one',
    oneToOne: 'db-one-to-one',
    manyToMany: 'db-many-to-many',
};

const renderCardinalityLabel = (
    cardinality: RelationshipCardinality | undefined,
    position: { x: number, y: number },
    editing: boolean,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    onClick: () => void,
    onBlur: () => void,
    onKeyDown: (e: React.KeyboardEvent) => void,
    inputRef: React.RefObject<HTMLSelectElement>
) => {
    if (editing) {
        return (
            <EdgeLabelRenderer>
                <select
                    ref={inputRef}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    onKeyDown={onKeyDown}
                    className="absolute -translate-x-1/2 -translate-y-1/2 bg-white px-1 py-[1px] rounded text-xs font-normal border border-blue-500 z-[1000] nodrag nopan pointer-events-auto focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{
                        transform: `translate(-50%, -50%) translate(${position.x}px,${position.y}px)`,
                    }}
                    autoFocus
                >
                    <option value={RelationshipCardinality.OneToOne}>1:1</option>
                    <option value={RelationshipCardinality.OneToMany}>1:N</option>
                    <option value={RelationshipCardinality.ManyToOne}>N:1</option>
                    <option value={RelationshipCardinality.ManyToMany}>N:N</option>
                </select>
            </EdgeLabelRenderer>
        );
    }

    const displayText = cardinality ?
        cardinality === RelationshipCardinality.OneToOne ? '1:1' :
            cardinality === RelationshipCardinality.OneToMany ? '1:N' :
                cardinality === RelationshipCardinality.ManyToOne ? 'N:1' :
                    cardinality === RelationshipCardinality.ManyToMany ? 'N:N' : '1:N'
        : '1:N';

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
                    onClick();
                }}
            >
                {displayText}
            </div>
        </EdgeLabelRenderer>
    );
};

const getEdgeStyle = (cardinality: RelationshipCardinality | undefined, style?: React.CSSProperties) => {
    let markerStartUrl = '';
    let markerEndUrl = '';

    switch (cardinality) {
        case RelationshipCardinality.OneToMany:
            markerEndUrl = `url(#${MARKER_IDS.oneToMany})`;
            break;
        case RelationshipCardinality.ManyToOne:
            markerStartUrl = `url(#${MARKER_IDS.manyToOne})`;
            break;
        case RelationshipCardinality.OneToOne:
            markerStartUrl = `url(#${MARKER_IDS.oneToOne})`;
            markerEndUrl = `url(#${MARKER_IDS.oneToOne})`;
            break;
        case RelationshipCardinality.ManyToMany:
            markerStartUrl = `url(#${MARKER_IDS.manyToMany})`;
            markerEndUrl = `url(#${MARKER_IDS.manyToMany})`;
            break;
        default:
            markerEndUrl = `url(#${MARKER_IDS.oneToMany})`;
            break;
    }

    return { markerStartUrl, markerEndUrl };
};

const getCenter = (node: any) => {
    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    return {
        x: node.internals.positionAbsolute.x + width / 2,
        y: node.internals.positionAbsolute.y + height / 2,
    };
};

const getClosestSide = (source: any, target: any): Position => {
    const sourceCenter = getCenter(source);
    const targetCenter = getCenter(target);

    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;

    if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? Position.Right : Position.Left;
    } else {
        return dy > 0 ? Position.Bottom : Position.Top;
    }
};

const getHandlePosition = (node: any, side: Position) => {
    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    const x = node.internals.positionAbsolute.x;
    const y = node.internals.positionAbsolute.y;

    switch (side) {
        case Position.Left: return [x, y + height / 2];
        case Position.Right: return [x + width, y + height / 2];
        case Position.Top: return [x + width / 2, y];
        case Position.Bottom: return [x + width / 2, y + height];
        default: return [x + width / 2, y + height / 2];
    }
};

const getEdgeParams = (source: any, target: any) => {
    const sourcePos = getClosestSide(source, target);
    const targetPos = getClosestSide(target, source);

    const [sx, sy] = getHandlePosition(source, sourcePos);
    const [tx, ty] = getHandlePosition(target, targetPos);

    return {
        sx, sy, tx, ty, sourcePos, targetPos,
    };
};

const getMultiplicityPosition = (x: number, y: number, position: Position, offset: number) => {
    switch (position) {
        case Position.Left:
            return { x: x - offset, y };
        case Position.Right:
            return { x: x + offset, y };
        case Position.Top:
            return { x, y: y - offset };
        case Position.Bottom:
            return { x, y: y + offset };
        default:
            return { x, y };
    }
};

const TableEdge: React.FC<EdgeProps<DatabaseEdge>> = ({ id, source, target, data, style, interactionWidth = 20 }) => {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    const { updateRelationship } = useDatabaseDiagramContext();

    const [editingCardinality, setEditingCardinality] = useState(false);
    const [cardinalityValue, setCardinalityValue] = useState(data?.relationship.cardinality || RelationshipCardinality.OneToMany);

    const cardinalityInputRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        setCardinalityValue(data?.relationship.cardinality || RelationshipCardinality.OneToMany);
    }, [data?.relationship.cardinality]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cardinalityInputRef.current && !cardinalityInputRef.current.contains(event.target as Node)) {
                saveCardinalityEdit();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [cardinalityValue]);

    const saveCardinalityEdit = () => {
        if (editingCardinality) {
            setEditingCardinality(false);
            if (data?.relationship.cardinality !== cardinalityValue) {
                updateRelationship(id, {
                    cardinality: cardinalityValue
                });
            }
        }
    };

    const handleCardinalityKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveCardinalityEdit();
        } else if (e.key === 'Escape') {
            setEditingCardinality(false);
            setCardinalityValue(data?.relationship.cardinality || RelationshipCardinality.OneToMany);
        }
    };

    if (!sourceNode?.internals?.positionAbsolute || !targetNode?.internals?.positionAbsolute ||
        !sourceNode.measured || !targetNode.measured) {
        return null;
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

    const cardinality = data?.relationship.cardinality ?? RelationshipCardinality.OneToMany;
    const edgeStyle = getEdgeStyle(cardinality, style);

    const cardinalityPos = getMultiplicityPosition(labelX, labelY, Position.Top, 15);

    return (
        <>
            {/* Define all markers */}
            <defs>
                {/* One-to-Many marker */}
                <marker
                    id={MARKER_IDS.oneToMany}
                    viewBox="0 0 20 20"
                    markerWidth="12"
                    markerHeight="12"
                    refX="19"
                    refY="10"
                    orient="auto-start-reverse"
                >
                    <path d="M 2 4 L 18 10 L 2 16 M 2 6 L 2 14" fill="none" stroke={style?.stroke ?? 'black'} strokeWidth="2" />
                </marker>

                {/* Many-to-One marker */}
                <marker
                    id={MARKER_IDS.manyToOne}
                    viewBox="0 0 20 20"
                    markerWidth="12"
                    markerHeight="12"
                    refX="1"
                    refY="10"
                    orient="auto"
                >
                    <path d="M 18 4 L 2 10 L 18 16 M 18 6 L 18 14" fill="none" stroke={style?.stroke ?? 'black'} strokeWidth="2" />
                </marker>

                {/* One-to-One marker */}
                <marker
                    id={MARKER_IDS.oneToOne}
                    viewBox="0 0 20 20"
                    markerWidth="8"
                    markerHeight="8"
                    refX="10"
                    refY="10"
                    orient="auto"
                >
                    <path d="M 10 4 L 10 16" stroke={style?.stroke ?? 'black'} strokeWidth="2" />
                </marker>

                {/* Many-to-Many marker */}
                <marker
                    id={MARKER_IDS.manyToMany}
                    viewBox="0 0 20 20"
                    markerWidth="12"
                    markerHeight="12"
                    refX="10"
                    refY="10"
                    orient="auto"
                >
                    <path d="M 2 4 L 10 10 L 2 16 M 18 4 L 10 10 L 18 16" fill="none" stroke={style?.stroke ?? 'black'} strokeWidth="2" />
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
                markerStart={edgeStyle.markerStartUrl}
                markerEnd={edgeStyle.markerEndUrl}
                style={style}
            />

            {/* Relationship name label */}
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
                    {data?.relationship.name || 'FK'}
                </div>
            </EdgeLabelRenderer>

            {/* Cardinality label */}
            {renderCardinalityLabel(
                data?.relationship.cardinality,
                cardinalityPos,
                editingCardinality,
                cardinalityValue,
                (e) => setCardinalityValue(e.target.value as RelationshipCardinality),
                () => setEditingCardinality(true),
                saveCardinalityEdit,
                handleCardinalityKeyDown,
                cardinalityInputRef
            )}
        </>
    );
};

export default TableEdge;
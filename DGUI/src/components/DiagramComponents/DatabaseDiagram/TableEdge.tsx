import { getBezierPath, BaseEdge, type EdgeProps, type Edge, getSmoothStepPath, useInternalNode, InternalNode, Node, Position, MarkerType, EdgeLabelRenderer } from '@xyflow/react';
import '@xyflow/react/dist/base.css';




export enum EdgeTypes {
    OneToOne = "OneToOne",
    OneToMany = "OneToMany",
    ManyToOne = "ManyToOne",
    ManyToMany = "ManyToMany",
    Reference = "Reference",
}

type TableEdgeProps = Edge<{ type: EdgeTypes; label?: string }, 'default'>;



function getCenter(node: InternalNode<Node>) {

    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    const x = node.internals.positionAbsolute.x ?? 0;
    const y = node.internals.positionAbsolute.y ?? 0;

    return {
        x: x + width / 2,
        y: y + height / 2,
    }
}

function getHandleCoordsByPosition(node: InternalNode<Node>, handlePosition: Position) {

    if (!node?.internals?.handleBounds?.source || !node.internals.positionAbsolute || !node.measured) {
        console.warn('Node data incomplete for getHandleCoordsByPosition:', node);

        const center = getCenter(node);
        return [center.x, center.y];
    }


    const handle = node.internals.handleBounds.source.find(
        (h) => h.position === handlePosition,
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
}


function getClosestSide(source: InternalNode<Node>, target: InternalNode<Node>): Position {
    const centerSource = getCenter(source);
    const centerTarget = getCenter(target);

    const horizontalDiff = Math.abs(centerSource.x - centerTarget.x);
    const verticalDiff = Math.abs(centerSource.y - centerTarget.y);

    if (horizontalDiff > verticalDiff) {
        return centerSource.x > centerTarget.x ? Position.Left : Position.Right;
    } else {
        return centerSource.y > centerTarget.y ? Position.Top : Position.Bottom;
    }
}

export function getEdgeParams(sourceNode: InternalNode<Node>, targetNode: InternalNode<Node>) {
    const sourcePos = getClosestSide(sourceNode, targetNode);
    const targetPos = getClosestSide(targetNode, sourceNode);

    const [sx, sy] = getHandleCoordsByPosition(sourceNode, sourcePos);
    const [tx, ty] = getHandleCoordsByPosition(targetNode, targetPos);

    return {
        sx,
        sy,
        tx,
        ty,
        sourcePos,
        targetPos,
    };
}



export default function TableEdge({
    id,
    source,
    target,
    data,
    style,
    interactionWidth = 10,
}: TableEdgeProps) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode?.internals?.positionAbsolute || !targetNode?.internals?.positionAbsolute || !sourceNode.measured || !targetNode.measured) {

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


    const edgeType = data?.type ?? EdgeTypes.Reference;
    let markerStartUrl = '';
    let markerEndUrl = '';


    const markerIds = {
        one: 'db-one',
        many: 'db-many',
        zero: 'db-zero',
        arrow: 'db-arrow',
    }

    switch (edgeType) {
        case EdgeTypes.OneToOne:
            markerStartUrl = `url(#${markerIds.one})`;
            markerEndUrl = `url(#${markerIds.one})`;
            break;
        case EdgeTypes.OneToMany:
            markerStartUrl = `url(#${markerIds.one})`;
            markerEndUrl = `url(#${markerIds.many})`;
            break;
        case EdgeTypes.ManyToOne:
            markerStartUrl = `url(#${markerIds.many})`;
            markerEndUrl = `url(#${markerIds.one})`;
            break;
        case EdgeTypes.ManyToMany:
            markerStartUrl = `url(#${markerIds.many})`;
            markerEndUrl = `url(#${markerIds.many})`;
            break;
        case EdgeTypes.Reference:
        default:
            markerEndUrl = `url(#${markerIds.arrow})`;
            break;
    }

    return (
        <>
            {/* Define all potential markers in one <defs> block */}
            <defs>
                {/* One (single vertical line) */}
                <marker
                    id={markerIds.one}
                    viewBox="0 0 10 10"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="5"
                    orient="auto-start-reverse"
                >
                    <path d="M 1 1 L 1 9" fill="none" stroke={style?.stroke ?? 'black'} strokeWidth="1.5" />
                </marker>

                {/* Many (crow's foot) */}
                <marker
                    id={markerIds.many}
                    viewBox="0 0 12 12"
                    markerWidth="12"
                    markerHeight="12"
                    refX="11"
                    refY="6"
                    orient="auto-start-reverse"
                >
                    <path d="M 1 1 L 10 6 L 1 11" fill="none" stroke={style?.stroke ?? 'black'} strokeWidth="1.5" />
                </marker>

                {/* Zero (optional, circle) */}
                <marker
                    id={markerIds.zero}
                    viewBox="0 0 10 10"
                    markerWidth="10"
                    markerHeight="10"
                    refX="5"
                    refY="5"
                    orient="auto"
                >
                    <circle cx="5" cy="5" r="4" fill="none" stroke={style?.stroke ?? 'black'} strokeWidth="1" />
                </marker>

                {/* Arrow (for reference relationships) */}
                <marker
                    id={markerIds.arrow}
                    viewBox="0 0 10 10"
                    markerWidth="8"
                    markerHeight="8"
                    refX="9"
                    refY="5"
                    orient="auto-start-reverse"
                >
                    <path d="M 1 1 L 9 5 L 1 9 z" fill={style?.stroke ?? 'black'} />
                </marker>
            </defs>

            {/* Invisible wider path for easier interaction */}
            <path
                id={id + '-interaction'}
                d={edgePath}
                fill="none"
                strokeOpacity={0}
                strokeWidth={interactionWidth}
                className="react-flow__edge-interaction"
            />

            {/* Visible Edge Path */}
            <path
                id={id}
                className="react-flow__edge-path"
                d={edgePath}
                markerStart={markerStartUrl}
                markerEnd={markerEndUrl}
                style={style}
            />

            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        background: '#f0f0f0',
                        borderRadius: 5,
                        padding: '2px 5px',
                        fontSize: 10,
                        fontWeight: 500,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >
                    {data.label || data.type}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
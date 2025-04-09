import { getBezierPath, BaseEdge, type EdgeProps, type Edge, getSmoothStepPath, useInternalNode, InternalNode, Node, Position, MarkerType, EdgeLabelRenderer } from '@xyflow/react';
import '@xyflow/react/dist/base.css';
// enum naming convention
export enum EdgeTypes {
    Association = "Association",
    Aggregation = "Aggregation",
    Composition = "Composition",
    Inheritance = "Inheritance",
    Dependency = "Dependency",
    Realization = "Realization",
}

type ClassEdgeProps = Edge<{ type: EdgeTypes }, 'default'>;

// --- Helper functions (keep as they are, they handle floating connections well) ---

function getCenter(node: InternalNode<Node>) {
    // Ensure dimensions are available, provide defaults if not
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
    // Defensive checks for node internals
    if (!node?.internals?.handleBounds?.source || !node.internals.positionAbsolute || !node.measured) {
        console.warn('Node data incomplete for getHandleCoordsByPosition:', node);
        // Return center as a fallback
        const center = getCenter(node);
        return [center.x, center.y];
    }

    // all handles are from type source, that's why we use handleBounds.source here
    const handle = node.internals.handleBounds.source.find(
        (h) => h.position === handlePosition,
    );

    // Fallback if specific handle position isn't found (e.g., node definition missing handles)
    if (!handle) {
        // Fallback to using the node center or edge
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
            default: return [center.x, center.y]; // Should not happen
        }
    }

    let offsetX = handle.width / 2;
    let offsetY = handle.height / 2;

    // this is a tiny detail to make the markerEnd of an edge visible.
    // The handle position that gets calculated has the origin top-left, so depending which side we are using, we add a little offset
    // when the handlePosition is Position.Right for example, we need to add an offset as big as the handle itself in order to get the correct position
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

// Calculates the closest side of a node for connection
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
    const targetPos = getClosestSide(targetNode, sourceNode); // Use the *opposite* perspective for the target

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

// --- Custom Edge Component ---

export default function ClassEdge({
    id,
    source,
    target,
    data,
    style, // Pass standard style props
    interactionWidth = 10, // Default interaction width
}: ClassEdgeProps) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode?.internals?.positionAbsolute || !targetNode?.internals?.positionAbsolute || !sourceNode.measured || !targetNode.measured) {
        // Nodes or their positions/dimensions aren't fully initialized yet
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
        curvature: 0.2, // Adjust curvature as needed
    });

    // Determine style and markers based on edge type
    const edgeType = data?.type ?? EdgeTypes.Association; // Default to Association
    let strokeDasharray = 'none';
    let markerStartUrl = '';
    let markerEndUrl = '';

    // Define marker IDs
    const markerIds = {
        hollowTriangle: 'uml-hollow-triangle',
        hollowDiamond: 'uml-hollow-diamond',
        filledDiamond: 'uml-filled-diamond',
        openArrow: 'uml-open-arrow',
    }

    switch (edgeType) {
        case EdgeTypes.Inheritance:
            markerEndUrl = `url(#${markerIds.hollowTriangle})`;
            break;
        case EdgeTypes.Realization:
            markerEndUrl = `url(#${markerIds.hollowTriangle})`;
            strokeDasharray = '5, 5'; // Dashed line
            break;
        case EdgeTypes.Dependency:
            markerEndUrl = `url(#${markerIds.openArrow})`;
            strokeDasharray = '5, 5'; // Dashed line
            break;
        case EdgeTypes.Aggregation:
            // Aggregation diamond is at the SOURCE
            markerStartUrl = `url(#${markerIds.hollowDiamond})`;
            break;
        case EdgeTypes.Composition:
            // Composition diamond is at the SOURCE
            markerStartUrl = `url(#${markerIds.filledDiamond})`;
            break;
        case EdgeTypes.Association:
        default:
            // Simple line, no marker for basic association
            // Could add an open arrow markerEndUrl here for directed association if needed
            break;
    }

    return (
        <>
            {/* Define all potential markers in one <defs> block */}
            <defs>
                {/* Hollow Triangle (Inheritance, Realization) - points TO target */}
                <marker
                    id={markerIds.hollowTriangle}
                    viewBox="0 0 20 20"
                    markerWidth="15" // Size of the marker
                    markerHeight="15"
                    refX="19" // Position the tip at the very end of the path
                    refY="10" // Center vertically
                    orient="auto-start-reverse" // Aligns with the path direction at the end
                >
                    <path d="M 1 1 L 19 10 L 1 19 z" fill={style?.stroke ?? 'white'} stroke={style?.stroke ?? 'black'} strokeWidth="1.5" />
                </marker>

                {/* Open Arrow (Dependency) - points TO target */}
                <marker
                    id={markerIds.openArrow}
                    viewBox="0 0 20 20"
                    markerWidth="12"
                    markerHeight="12"
                    refX="19" // Position the tip at the very end
                    refY="10"
                    orient="auto-start-reverse"
                >
                    <path d="M 1 1 L 19 10 L 1 19" fill="none" stroke={style?.stroke ?? 'black'} strokeWidth="1.5" />
                </marker>

                {/* Hollow Diamond (Aggregation) - at SOURCE */}
                <marker
                    id={markerIds.hollowDiamond}
                    viewBox="0 0 20 20"
                    markerWidth="16" // Slightly larger diamond
                    markerHeight="16"
                    refX="1"   // Position the leftmost point (base) at the start of the path
                    refY="10"  // Center vertically
                    orient="auto" // Aligns with the path direction at the start
                >
                    {/* Rotated diamond path: M 10 1 L 19 10 L 10 19 L 1 10 z */}
                    <path d="M 10 1 L 19 10 L 10 19 L 1 10 z" fill={'white'} stroke={style?.stroke ?? 'black'} strokeWidth="1.5" />
                </marker>

                {/* Filled Diamond (Composition) - at SOURCE */}
                <marker
                    id={markerIds.filledDiamond}
                    viewBox="0 0 20 20"
                    markerWidth="16"
                    markerHeight="16"
                    refX="1"   // Position the leftmost point (base) at the start
                    refY="10"
                    orient="auto"
                >
                    {/* Same path as hollow diamond */}
                    <path d="M 10 1 L 19 10 L 10 19 L 1 10 z" fill={'black'} stroke={style?.stroke ?? 'black'} strokeWidth="1.5" />
                </marker>
            </defs>

            {/* Invisible wider path for easier interaction */}
            <path
                id={id + '-interaction'}
                d={edgePath}
                fill="none"
                strokeOpacity={0} // Make transparent
                strokeWidth={interactionWidth}
                className="react-flow__edge-interaction"
            />

            {/* Visible Edge Path */}
            <path
                id={id}
                className="react-flow__edge-path"
                d={edgePath}
                strokeDasharray={strokeDasharray}
                markerStart={markerStartUrl}
                markerEnd={markerEndUrl}
                style={style} // Apply standard styles (stroke color, width etc.)
            />

            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        background: '#f0f0f0',
                        borderRadius: 5,
                        fontSize: 8,
                        fontWeight: 700,
                    }}
                    className="nodrag nopan"
                >
                    {data.type}
                </div>
            </EdgeLabelRenderer>



        </>
    );
}
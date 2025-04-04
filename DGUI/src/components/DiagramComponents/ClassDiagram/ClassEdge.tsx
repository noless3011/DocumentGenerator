import { getBezierPath, BaseEdge, type EdgeProps, type Edge, getSmoothStepPath, useInternalNode, InternalNode, Node, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/base.css';
// enum naming convention
export enum EdgeTypes {
    "Association",
    "Aggregation",
    "Composition",
    "Inheritance",
    "Dependency",
    "Realization",
}

type ClassEdgeProps = Edge<{ type: EdgeTypes }, 'default'>;

function getCenter(node: InternalNode<Node>) {
    return {
        x: node.internals.positionAbsolute.x + node.measured.width / 2,
        y: node.internals.positionAbsolute.y + node.measured.height / 2
    }
}


function getHandleCoordsByPosition(node: InternalNode<Node>, handlePosition: Position) {
    // all handles are from type source, that's why we use handleBounds.source here
    const handle = node.internals.handleBounds.source.find(
        (h) => h.position === handlePosition,
    );

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

function getFloatingPath(source: InternalNode<Node>, target: InternalNode<Node>) {
    const centerSource = getCenter(source);
    const centerTarget = getCenter(target);

    const horizontalDiff = Math.abs(centerSource.x - centerTarget.x);
    const verticalDiff = Math.abs(centerSource.y - centerTarget.y);

    let position: Position;
    if (horizontalDiff > verticalDiff) {
        position = centerSource.x > centerTarget.x ? Position.Left : Position.Right;
    } else {
        // here the vertical difference between the nodes is bigger, so we use Position.Top or Position.Bottom for the handle
        position = centerSource.y > centerTarget.y ? Position.Top : Position.Bottom;
    }
    const [x, y] = getHandleCoordsByPosition(source, position)
    return [x, y, position]
}

export function getEdgeParams(source: InternalNode<Node>, target: InternalNode<Node>) {
    const [sx, sy, sourcePos] = getFloatingPath(source, target);
    const [tx, ty, targetPos] = getFloatingPath(target, source);

    return {
        sx,
        sy,
        tx,
        ty,
        sourcePos,
        targetPos,
    };
}

export default function ClassEdge({
    id,
    source, // source node id
    target, // target node id
    data,   // The custom data object { type: EdgeTypes.XYZ }
    interactionWidth,
    // style, // React Flow might pass down style, capture it if needed
}: ClassEdgeProps) { // Use the correct type here

    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode || !targetNode) {
        return null;
    }

    // Get calculated connection points and handle positions
    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

    // Calculate the path (Bezier in this case)
    const [edgePath] = getBezierPath({
        sourceX: sx as number,
        sourceY: sy as number,
        sourcePosition: sourcePos as Position,
        targetPosition: targetPos as Position,
        targetX: tx as number,
        targetY: ty as number,
        curvature: 0.2, // Adjust curvature as needed
    });

    // --- Determine Marker and Style based on data.type ---
    let markerStartUrl: string | undefined = undefined;
    let markerEndUrl: string | undefined = undefined;
    let strokeDasharray: string | undefined = undefined;
    let strokeColor = 'black'; // Default stroke color

    const edgeType = data?.type; // Safely access type

    switch (edgeType) {
        case EdgeTypes.Association:
            // Standard arrow at target
            markerEndUrl = `url(#${MarkerType.Arrow})`; // Use React Flow's built-in arrow marker ID
            break;
        case EdgeTypes.Aggregation:
            // Open diamond at source
            markerStartUrl = `url(#marker-aggregation)`;
            break;
        case EdgeTypes.Composition:
            // Filled diamond at source
            markerStartUrl = `url(#marker-composition)`;
            break;
        case EdgeTypes.Inheritance:
            // Triangle at target
            markerEndUrl = `url(#marker-inheritance)`;
            break;
        case EdgeTypes.Dependency:
            // Dashed line, arrow at target
            markerEndUrl = `url(#${MarkerType.Arrow})`;
            strokeDasharray = '5 5';
            break;
        case EdgeTypes.Realization:
            // Dashed line, triangle at target
            markerEndUrl = `url(#marker-inheritance)`;
            strokeDasharray = '5 5';
            break;
        default:
            break;
    }


    const edgeStyle = {
        stroke: strokeColor,
        strokeDasharray,
    };


    return (
        <>
            <path
                id={id + '-interaction'}
                style={{ strokeWidth: interactionWidth }}
                className="react-flow__edge-interaction fill-none stroke-transparent"
                d={edgePath}
            />

            <path
                id={id}
                className="react-flow__edge-path"
                d={edgePath}
                style={edgeStyle}
                markerStart={markerStartUrl}
                markerEnd={markerEndUrl}
            />

        </>
    )
}
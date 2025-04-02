import { getBezierPath, BaseEdge, type EdgeProps, type Edge, getSmoothStepPath } from '@xyflow/react';
import '@xyflow/react/dist/base.css';
// enum naming convention
export enum EdgeTypes {
    "Association",
    "Aggregation",
    "Composition",
    "Inheritance ",
    "Dependency",
    "Dealization"
}

type ClassEdgeProps = Edge<{ type: EdgeTypes }, 'default'>;
export default function ClassEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
}: EdgeProps<ClassEdgeProps>) {

    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });

    return (
        <>
            <BaseEdge id={id} path={edgePath} />;
        </>
    )

}
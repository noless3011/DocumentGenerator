import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ClassDiagram } from '../models/ClassDiagram';
import ClassDiagramCanvas from '../components/DiagramComponents/ClassDiagramCanvas';
import { ReactFlowProvider } from '@xyflow/react';

interface DiagramViewProps {
    fileDir: string;
    setLoading?: (loading: boolean) => void;
}

const DiagramView: React.FC<DiagramViewProps> = ({ fileDir, setLoading }) => {
    const [diagram, setDiagram] = useState<any>(null);

    useEffect(() => {
        if (setLoading) {
            setLoading(true);
        }

        window.myAPI.readFileAsText(fileDir).then((data: string) => {
            const jsonData = JSON.parse(data);
            if (jsonData.diagramType === "UML Class Diagram") {
                const classDiagram = ClassDiagram.fromJSON(jsonData);
                setDiagram(<div className="p-4 w-full h-full"><ReactFlowProvider><ClassDiagramCanvas diagram={classDiagram} fileDir={fileDir}></ClassDiagramCanvas></ReactFlowProvider></div>);
            }
            // handle other diagram types here

            if (setLoading) {
                setLoading(false);
            }
        }).catch((error) => {
            console.error("Error loading diagram:", error);
            if (setLoading) {
                setLoading(false);
            }
        });
    }, [fileDir, setLoading]);

    return <div className='w-full h-full'>
        {diagram}
    </div>
};

export default DiagramView;
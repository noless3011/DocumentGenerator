import React, { useRef, useEffect, useState, useCallback, use } from 'react';
import { ClassDiagram } from '../models/ClassDiagram';
import ClassDiagramCanvas from '../components/DiagramComponents/ClassDiagramCanvas';
import { ReactFlowProvider } from '@xyflow/react';
interface DiagramViewProps {
    fileDir: string;
}


const DiagramView: React.FC<DiagramViewProps> = ({ fileDir }) => {
    const [diagram, setDiagram] = useState<any>(null);

    useEffect(() => {

        window.myAPI.readFileAsText(fileDir).then((data: string) => {
            const jsonData = JSON.parse(data);
            if (jsonData.diagramType === "UML Class Diagram") {

                const classDiagram = ClassDiagram.fromJSON(jsonData);
                setDiagram(<div className="p-4 w-full h-full"><ReactFlowProvider><ClassDiagramCanvas diagram={classDiagram} fileDir={fileDir}></ClassDiagramCanvas></ReactFlowProvider></div>);
            }
            // handle other diagram types here
        });
    }, [fileDir]);

    return <div className='w-full h-full'>
        {diagram}
    </div>
};

export default DiagramView;
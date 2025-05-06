import { Schema, Warning, WarningAmber } from '@mui/icons-material';
import React, { useRef, useState } from 'react';
import ArticleIcon from '@mui/icons-material/Article';
import ComputerIcon from '@mui/icons-material/Computer';
interface ExplorerPaneProps {
    // Define your props here
}


const DocumentItem: React.FC<{ name: string, type: string, isSelected: boolean }> = ({ name, type, isSelected }) => {
    const icon = () => {
        if (type === "Diagram") {
            return <Schema />
        }
        else if (type === "Markdown") {
            return <ArticleIcon />
        } else if (type === "Prototype") {
            return <ComputerIcon />
        } else {
            return <WarningAmber />
        }
    }


    return (
        <div className="flex flex-row gap-2 h-10 items-center p-1 cursor-pointer "
            style={{ backgroundColor: isSelected ? "#c2c2c2" : "transparent" }}>
            <div className='w-fit aspect-square bg-transparent'>
                {icon()}
            </div>

            <div className='bg-transparent w-full overflow-hidden truncate'>
                {name}
            </div>
        </div>
    )
}

interface Document {
    id: string;
    name: string;
    type: string;
}

const ExplorerPane: React.FC<ExplorerPaneProps> = (props) => {
    // State hooks go here
    const [documents, setDocuments] = useState<Document[]>([
        { id: "1", name: "Document 1 afjlajfoiasjfdoiajdfoajsdfoiajf", type: "Diagram" },
        { id: "2", name: "Document 2", type: "Markdown" },
        { id: "3", name: "Document 3", type: "Prototype" },
        { id: "4", name: "Document 4", type: "Unknown" },
    ]);
    const [selectedDocument, setSelectedDocument] = useState<string>();

    const handleDocumentClick = (index: string) => {
        setSelectedDocument(index);
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-100 p-4">
            <h1 className="text-xl font-bold mb-4">Explorer Pane</h1>
            <div className="flex-grow overflow-auto">
                {documents.map((doc) => (
                    <div onClick={() => handleDocumentClick(doc.id)} key={doc.id} className='hover:bg-gray-300 '>
                        <DocumentItem
                            name={doc.name}
                            type={doc.type}
                            isSelected={selectedDocument === doc.id}
                        />
                    </div>

                ))}
            </div>
        </div>
    );
};

export default ExplorerPane;
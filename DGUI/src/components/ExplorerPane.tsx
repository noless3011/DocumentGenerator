import { Schema, WarningAmber, AddCircleOutline as AddCircleOutlineIcon, Delete as DeleteIcon } from '@mui/icons-material';
import React, { useEffect, useRef, useState } from 'react';
import ArticleIcon from '@mui/icons-material/Article';
import ComputerIcon from '@mui/icons-material/Computer';
import { useProjects } from '../provider/ProjectProvider';

// Use the provided enum
export enum DocumentType {
    DIAGRAM = 'diagram',
    MARKDOWN = 'markdown',
    PROTOTYPE = 'prototype',
}

interface ExplorerPaneProps {
    onFileSelect: (fileId: string, filePath: string, fileType: DocumentType) => void;
}

const DocumentItem: React.FC<{
    name: string;
    type: DocumentType;
    isSelected: boolean;
    onRename: (newName: string) => void;
    onDelete: () => void;
}> = ({ name, type, isSelected, onRename, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    const getNameWithoutExtension = (fileName: string): string => {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex <= 0) return fileName;
        return fileName.substring(0, lastDotIndex);
    };

    const icon = () => {
        if (type === DocumentType.DIAGRAM) {
            return <Schema />;
        }
        else if (type === DocumentType.MARKDOWN) {
            return <ArticleIcon />;
        } else if (type === DocumentType.PROTOTYPE) {
            return <ComputerIcon />;
        } else {
            return <WarningAmber />;
        }
    };

    const handleDoubleClick = () => {
        setEditText(getNameWithoutExtension(name));
        setIsEditing(true);
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEditText(event.target.value);
    };

    const handleConfirmEdit = () => {
        setIsEditing(false);
        if (editText.trim() && editText.trim() !== getNameWithoutExtension(name)) {
            onRename(editText.trim());
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleConfirmEdit();
        } else if (event.key === 'Escape') {
            setIsEditing(false);
        }
    };

    const nameForDisplay = getNameWithoutExtension(name);

    return (
        <div
            className={`flex flex-row gap-2 h-10 items-center p-1 cursor-pointer ${isSelected ? "bg-gray-300" : "hover:bg-gray-200"}`}
            onDoubleClick={!isEditing ? handleDoubleClick : undefined}
        >
            <div className='w-fit aspect-square bg-transparent'>
                {icon()}
            </div>
            <div className='bg-transparent w-full overflow-hidden truncate'>
                {isEditing ? (
                    <input
                        type="text"
                        value={editText}
                        onChange={handleInputChange}
                        onBlur={handleConfirmEdit}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="w-full bg-white border border-gray-400 rounded px-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span title={name} className="text-sm select-none">
                        {nameForDisplay}
                    </span>
                )}
            </div>
            <button
                className="ml-2 p-1 rounded hover:bg-red-100"
                title="Delete file"
                onClick={e => { e.stopPropagation(); onDelete(); }}
            >
                <DeleteIcon fontSize="small" />
            </button>
        </div>
    );
};

interface Document {
    id: string;
    name: string;
    type: DocumentType;
    filePath: string;
}

const ExplorerPane: React.FC<ExplorerPaneProps> = ({ onFileSelect }) => {
    const { currentProject: project, createFile, renameFile, deleteFile } = useProjects();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<string>();
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (project && project.files) {
            setDocuments(project.files?.output.map((file) => {
                let type: DocumentType;
                if (file.path.endsWith(".md")) {
                    type = DocumentType.MARKDOWN;
                } else if (file.path.endsWith(".json")) {
                    type = DocumentType.DIAGRAM;
                } else if (file.path.endsWith(".html")) {
                    type = DocumentType.PROTOTYPE;
                } else {
                    type = DocumentType.MARKDOWN; // fallback, or you can add UNKNOWN to enum
                }
                return {
                    id: file.path,
                    name: file.name,
                    type: type,
                    filePath: file.path,
                };
            }) || []);
        }
    }, [project]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
                setIsAddMenuOpen(false);
            }
        };

        if (isAddMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAddMenuOpen]);

    const handleDocumentClick = (doc: Document) => {
        setSelectedDocument(doc.id);
        onFileSelect(doc.id, doc.filePath, doc.type);
    };

    const handleAddNewDocument = (type: DocumentType) => {
        createFile("Untitled", type);
        setIsAddMenuOpen(false);
    };

    const handleRename = async (doc: Document, newName: string) => {
        try {
            await renameFile(
                doc.name.replace(/\.[^/.]+$/, ""), // old name without extension
                newName,
                doc.type
            );
        } catch (e) {
            console.error("Error renaming file:", e);
        }
    };

    const handleDelete = async (doc: Document) => {
        if (window.confirm(`Delete "${doc.name}"?`)) {
            try {
                await deleteFile(
                    doc.name.replace(/\.[^/.]+$/, ""),
                    doc.type
                );
            } catch (e) {
                console.error("Error deleting file:", e);
            }
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-100 p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">Explorer Pane</h1>
                <div className="relative" ref={addMenuRef}>
                    <button
                        onClick={() => setIsAddMenuOpen(prev => !prev)}
                        className="p-1 rounded hover:bg-gray-200 focus:outline-none"
                        aria-label="Add new document"
                        title="Add new document"
                    >
                        <AddCircleOutlineIcon />
                    </button>
                    {isAddMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-xl z-50 border border-gray-200">
                            <ul className="py-1">
                                {Object.values(DocumentType).map((option) => (
                                    <li key={option}>
                                        <button
                                            onClick={() => handleAddNewDocument(option as DocumentType)}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                                        >
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-grow overflow-auto">
                {documents.map((doc) => (
                    <div onClick={() => handleDocumentClick(doc)} key={doc.id} className='hover:bg-gray-300 '>
                        <DocumentItem
                            name={doc.name}
                            type={doc.type}
                            isSelected={selectedDocument === doc.id}
                            onRename={(newName) => handleRename(doc, newName)}
                            onDelete={() => handleDelete(doc)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
export default ExplorerPane;
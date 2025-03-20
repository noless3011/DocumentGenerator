import React, { useState, useRef } from 'react';
import LoadPreviousSessionDialog from '../components/DocumentsHandling/LoadSessionDialog';
import * as XLSX from 'xlsx';

interface SheetOption {
    name: string;
    selected: boolean;
    options: string[];
    selectedOption: string;
}

interface DocumentsHandlingProps {
    switchTab: (tabIndex: number) => void;
    setFileDirs: (fileDirs: string[]) => void;
}

const DocumentsHandling: React.FC<DocumentsHandlingProps> = ({ switchTab, setFileDirs }) => {
    const onSessionSelect = (sessionId: string) => {
        console.log('Selected session:', sessionId);
    }
    return (
        <div className="flex flex-col h-full">
            <LoadPreviousSessionDialog className='w-20 h-10' onSessionSelect={onSessionSelect}></LoadPreviousSessionDialog>
        </div>
    );
};

export default DocumentsHandling;
import React from 'react';
import { useState } from 'react';
import { DocumentType } from "../provider/WorkspaceProvider"
import MarkdownView from '../pages/MarkdownView';
import DiagramView from '../pages/DiagramView';
import PreviewAppView from './PreviewApp/PreviewAppView';
import { CircularProgress } from '@mui/material';
import { Warning } from '@mui/icons-material';

interface TabProps {
    label: string;
    filePath: string;
    type: DocumentType;
}

const Tab: React.FC<TabProps> = ({ label, filePath, type }) => {
    const [loading, setLoading] = useState<boolean>(false);
    let viewContent = null;

    if (type === DocumentType.MARKDOWN) {
        viewContent = <MarkdownView fileDir={`${filePath}`} setLoading={setLoading} />;
    } else if (type === DocumentType.DIAGRAM) {
        viewContent = <DiagramView fileDir={`${filePath}`} setLoading={setLoading} />;
    } else if (type === DocumentType.PROTOTYPE) {
        // Assuming PreviewAppView can also accept setLoading or handles its own loading state.
        // If PreviewAppView doesn't use setLoading, this prop will be ignored by it.
        viewContent = <PreviewAppView setLoading={setLoading} />;
    } else {
        viewContent = (
            <div className='bg-red-100 text-red-700 p-4 flex flex-col items-center justify-center h-full'>
                <Warning fontSize="large" />
                <p className="mt-2">Error: Unknown or unsupported tab type.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative"> {/* Ensure this container can position children absolutely */}
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent overlay
                    zIndex: 10 // Ensure spinner is on top
                }}>
                    <CircularProgress />
                </div>
            )}
            {/* The actual content view, hidden when loading to prevent interaction with stale content */}
            <div style={{
                width: '100%',
                height: '100%',
                visibility: loading ? 'hidden' : 'visible'
            }}>
                {viewContent}
            </div>
        </div>
    );
};

export default Tab;
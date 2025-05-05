import React from 'react';
import { useState } from 'react';
import { TabType } from "../provider/WorkspaceProvider"
import MarkdownView from '../pages/MarkdownView';
import DiagramView from '../pages/DiagramView';
import PreviewAppView from './PreviewApp/PreviewAppView';
import { CircularProgress } from '@mui/material';
import { Warning } from '@mui/icons-material';
interface TabProps {
    label: string;
    filePath: string;
    type: TabType;
}

const Tab: React.FC<TabProps> = ({ label, filePath, type }) => {
    const [loading, setLoading] = useState<boolean>(false);

    if (type === TabType.MARKDOWN) {

        return (
            <>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </div>
                ) : (
                    <MarkdownView fileDir={`${filePath}`} setLoading={setLoading} />
                )}
            </>
        )
    }
    if (type === TabType.DIAGRAM) {
        return (
            <>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </div>
                ) : (
                    <DiagramView fileDir={`${filePath}`} setLoading={setLoading} />
                )}
            </>
        )
    }
    if (type === TabType.PROTOTYPE) {
        return (
            <>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </div>
                ) : (
                    <PreviewAppView setLoading={setLoading} />
                )}
            </>
        )
    }

    return (
        <div className='bg-red-500 flex flex-col'>
            <Warning></Warning>
            Error: Something went wrong while loading the tab.
        </div>
    );
};

export default Tab;
import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import DiagramView from './DiagramView';

interface TabProps {
    title: string;
    dir: string;
    type: 'Image' | 'Markdown' | 'Diagram';
}

interface ResultsViewProps {
    fileDirs: string[];
}
const ResultsView: React.FC<ResultsViewProps> = ({ fileDirs }) => {
    const [tabs, setTabs] = useState<TabProps[]>([]);
    useEffect(() => {
        const newTabs: TabProps[] = [];
        fileDirs.forEach((dir) => {
            if (dir.endsWith('.md')) {
                newTabs.push({ title: dir, dir, type: 'Markdown' });
            } else if (dir.endsWith('.png') || dir.endsWith('.jpg')) {
                newTabs.push({ title: dir, dir, type: 'Image' });
            } else if (dir.endsWith('.json')) {
                newTabs.push({ title: dir, dir, type: 'Diagram' });
            }
        });
        setTabs(newTabs);
    }, [fileDirs]);
    return <></>
}
export default ResultsView;

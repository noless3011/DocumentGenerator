import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import DiagramView from './DiagramView';
import MarkdownView from './MarkdownView';
import ImageView from './ImageView';

interface TabProps {
    title: string;
    dir: string;
    type: 'Image' | 'Markdown' | 'Diagram';
}

interface ResultsViewProps {
    fileDirs: string[];
}

const ResultsView: React.FC<ResultsViewProps> = ({ fileDirs }) => {
    const [tabs, setTabs] = useState<TabProps[]>([
        { title: 'Test', dir: 'test.md', type: 'Markdown' } // Initial tab for testing, can be removed in production if not needed
    ]);
    const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);
    // Using hardcoded values for testing - remove or comment this line in production
    fileDirs = ['test.md', `outputs/images/KVA-XNK-Functions_v1.0_bfade153d889436283f76444a383281f_Menu 3.png`, 'test.json']

    useEffect(() => {
        const newTabs: TabProps[] = [];
        fileDirs.forEach((dir) => {
            if (dir.endsWith('.md')) {
                newTabs.push({ title: dir.split('/').pop() || dir, dir, type: 'Markdown' });
            } else if (dir.endsWith('.png') || dir.endsWith('.jpg')) {
                newTabs.push({ title: dir.split('/').pop() || dir, dir, type: 'Image' });
            } else if (dir.endsWith('.json')) {
                newTabs.push({ title: dir.split('/').pop() || dir, dir, type: 'Diagram' });
            }
        });

        // Check if the new tabs are actually different from the current tabs before updating state
        const areTabsDifferent = (newTabs: TabProps[], currentTabs: TabProps[]) => {
            if (newTabs.length !== currentTabs.length) {
                return true;
            }
            for (let i = 0; i < newTabs.length; i++) {
                if (newTabs[i].dir !== currentTabs[i].dir || newTabs[i].type !== currentTabs[i].type || newTabs[i].title !== currentTabs[i].title) {
                    return true;
                }
            }
            return false;
        };

        if (areTabsDifferent(newTabs, tabs)) {
            setTabs(newTabs);
            if (newTabs.length > 0) {
                setSelectedTabIndex(0);
            } else {
                setSelectedTabIndex(-1);
            }
        }
    }, [fileDirs, tabs]); // Added 'tabs' to dependency array for comparison

    return (
        <div className="flex flex-col h-full">
            {/* Horizontal Tab Bar */}
            <div className="flex border-b border-gray-300">
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        className={`flex items-center px-6 py-4 text-sm font-medium transition-colors duration-150 ${selectedTabIndex === index
                            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                        onClick={() => setSelectedTabIndex(index)}
                    >
                        {/* Icon based on file type */}
                        <span className="mr-3">
                            {tab.type === 'Markdown' && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            {tab.type === 'Image' && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            )}
                            {tab.type === 'Diagram' && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                            )}
                        </span>
                        {tab.title}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6">
                {selectedTabIndex !== -1 && tabs[selectedTabIndex] && (
                    (() => {
                        const selectedTab = tabs[selectedTabIndex];
                        switch (selectedTab.type) {
                            case 'Image':
                                return <ImageView key={selectedTabIndex} fileDir={selectedTab.dir} />;
                            case 'Markdown':
                                return <MarkdownView key={selectedTabIndex} fileDir={selectedTab.dir} />;
                            case 'Diagram':
                                return <DiagramView key={selectedTabIndex} fileDir={selectedTab.dir} />;
                            default:
                                return <div key={selectedTabIndex}>Invalid file type</div>;
                        }
                    })()
                )}
                {selectedTabIndex === -1 && (
                    <div className="text-center text-gray-500 mt-10">No files to display.</div>
                )}
            </div>
        </div>
    );
};

export default ResultsView;
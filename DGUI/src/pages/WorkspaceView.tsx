import React, { useState, useEffect, useRef } from 'react';
import ChatView from './ChatView';
import { useProjects } from '../provider/ProjectProvider';
import { ChatProvider } from '../provider/ChatProvider';
import { TabType, useWorkspace } from '../provider/WorkspaceProvider';
import { ArrowBackIos } from '@mui/icons-material';


const WorkspaceView: React.FC = () => {
    const { currentProject: project } = useProjects();
    const { tabs, removeTab, activeTab, setActiveTab, addTab } = useWorkspace();
    const [chatPanelVisible, setChatPanelVisible] = useState<boolean>(true);
    const [resultsWidth, setResultsWidth] = useState<number>(67); // 67% (2/3) initially
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        if (tabs.length === 0) {
            for (let i = 0; i < 1; i++) {
                addTab('1', 'Diagram abasufhoaishjfiajfdijoaspdfjapsifdj', TabType.DIAGRAM);
                addTab('2', 'Markdown', TabType.MARKDOWN);
                addTab('3', 'Preview App', TabType.PROTOTYPE);
            }
        }
    }, []); // Empty dependency array means this runs once when component mounts
    const toggleChatPanel = () => {
        setChatPanelVisible(!chatPanelVisible);
    };

    // Mouse event handlers for resizing
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const newWidth = ((e.clientX - 30 - containerRect.left) / containerWidth) * 100; // 30 is the padding, if dont minus 30, the handle will be snappy

            // If dragged close to the right edge, collapse the chat panel completely
            if (newWidth > 95) {
                setChatPanelVisible(false);
                setIsDragging(false);
                return;
            }

            // Limit resize between 20% and 80%
            const boundedWidth = Math.min(Math.max(newWidth, 20), 80);
            setResultsWidth(boundedWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            // Add a class to the body to prevent text selection during drag
            document.body.classList.add('resize-cursor');
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('resize-cursor');
        };
    }, [isDragging]);

    if (!project) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-gray-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-sm max-w-md">
                    <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h2 className="mt-4 text-xl font-semibold text-gray-700">No Project Loaded</h2>
                    <p className="mt-2 text-gray-500">Please select or create a project to get started.</p>
                </div>
            </div>
        );
    }
    // add 15 tab to test

    return (
        // I truly dont know why i have to set the h-5% here, but if i set it to full, there will be a scroll bar on the right side of the chat panel, and i dont want that
        <div className="flex flex-col h-[5%] w-full max-w-full bg-gray-50 flex-1">
            <div className="flex flex-col h-full overflow-hidden">
                <div ref={containerRef} className="flex flex-row h-full overflow-hidden relative">

                    <div
                        className="bg-white m-3 mb-10 h-[95%] overflow-hidden flex flex-col"
                        style={{ width: chatPanelVisible ? `${resultsWidth}%` : '100%' }}
                    >

                        <div className="flex flex-row items-center h-13 overflow-x-scroll scroll-smooth scrollbar scrollbar-h-1 scrollbar-thumb-indigo-500 bg-gray-50 px-2">
                            {tabs.map((tab, index) => (
                                <div
                                    key={index}
                                    className={`flex flex-row items-center w-fit max-w-60 border-solid border-r-0 border-2 px-4 py-2 cursor-pointer ${activeTab === tab.id ? 'border-gray-200 border-t-blue-800 border-b-0' : 'text-gray-700 border-x-0 border-t-0 hover:bg-blue-200 border-gray-200'
                                        }`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <span className="truncate whitespace-nowrap overflow-hidden">
                                        {tab.title}
                                    </span>
                                    <button
                                        className="ml-2 text-blue-800 text-lg font-bold rounded-full p-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeTab(tab.id);
                                            console.log('Tab removed, current tabs: ', tabs);
                                        }}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}

                        </div>

                        <div className="flex-1 flex flex-col gap-4 p-6 overflow-y-scroll scroll-smooth scrollbar scrollbar-w-3 scrollbar-thumb-indigo-500/30 bg-white">
                            {activeTab ? (
                                // Find the active tab and render its content
                                tabs.find(tab => tab.id === activeTab)?.content()
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center p-6">
                                        <h3 className="text-xl font-semibold text-white mb-2">No Open Tabs</h3>
                                        <p className="text-gray-200">Open a file from the file explorer to get started.</p>
                                    </div>
                                </div>
                            )}


                        </div>
                    </div>

                    {chatPanelVisible && (
                        <div
                            className={`w-2 h-full cursor-col-resize hover:bg-blue-500 active:bg-blue-600 z-10 ${isDragging ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                            onMouseDown={handleMouseDown}
                        />
                    )}

                    {chatPanelVisible ? (
                        <ChatProvider><ChatView /></ChatProvider>
                    ) : (
                        <button
                            title='Show chat panel'
                            className="absolute bottom-6 right-6 p-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors z-10"
                            onClick={toggleChatPanel}
                        >
                            <ArrowBackIos />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkspaceView;

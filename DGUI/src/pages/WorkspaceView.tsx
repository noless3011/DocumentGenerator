import React, { useState, useEffect, useRef } from 'react';
import ChatView from './ChatView';
import { useProjects } from '../provider/ProjectProvider';
import { ChatProvider } from '../provider/ChatProvider';
import { DocumentType, useWorkspace } from '../provider/WorkspaceProvider';
import ExplorerPane from '../components/ExplorerPane';
import { AccountTree, ArrowBackIos, ChatBubble } from '@mui/icons-material';

const WorkspaceView: React.FC = () => {
    const { currentProject: project } = useProjects();
    const { tabs, removeTab, activeTab, setActiveTab, addTab } = useWorkspace();
    const [chatPanelVisible, setChatPanelVisible] = useState<boolean>(true);
    const [chatPanelWidthPx, setChatPanelWidthPx] = useState<number>(400);
    const [explorerPanelWidthPx, setExplorerPanelWidthPx] = useState<number>(300);
    const [explorerPanelVisible, setExplorerPanelVisible] = useState<boolean>(true);
    const [isChatDividerDragging, setIsChatDividerDragging] = useState<boolean>(false);
    const [isExplorerDividerDragging, setIsExplorerDividerDragging] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const resizerWidth = 8;



    const toggleChatPanel = () => {
        setChatPanelVisible(!chatPanelVisible);

    };

    const toggleExplorerPanel = () => {
        setExplorerPanelVisible(!explorerPanelVisible);
    };

    const handleDragExplorerDivider = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsExplorerDividerDragging(true);
        if (!explorerPanelVisible) {
            setExplorerPanelVisible(true);
        }
    };
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isExplorerDividerDragging || !containerRef.current || !explorerPanelVisible) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const containerWidth = containerRect.width;

            const newExplorerWidth = e.clientX - containerRect.left;

            const minExplorerWidth = 200;
            const maxExplorerWidth = containerWidth * 0.8;

            const collapseThreshold = 25;

            if (newExplorerWidth < collapseThreshold) {
                setExplorerPanelVisible(false);
                setIsExplorerDividerDragging(false);
                return;
            }

            const boundedWidth = Math.min(Math.max(newExplorerWidth, minExplorerWidth), maxExplorerWidth);
            setExplorerPanelWidthPx(boundedWidth);
        };

        const handleMouseUp = () => {
            if (isExplorerDividerDragging) {
                setIsExplorerDividerDragging(false);
            }
        };

        if (isExplorerDividerDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp, { once: true });
            document.body.classList.add('resize-cursor');
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('resize-cursor');
        };
    }, [isExplorerDividerDragging, explorerPanelVisible]);


    const handleDragChatDivider = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsChatDividerDragging(true);
        if (!chatPanelVisible) {
            setChatPanelVisible(true);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isChatDividerDragging || !containerRef.current || !chatPanelVisible) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const containerWidth = containerRect.width;

            const newChatWidth = containerWidth - (e.clientX - containerRect.left);

            const minChatWidth = 200;
            const maxChatWidth = containerWidth * 0.8;

            const collapseThreshold = 25;

            if (newChatWidth < collapseThreshold) {
                setChatPanelVisible(false);
                setIsChatDividerDragging(false);
                return;
            }

            const boundedWidth = Math.min(Math.max(newChatWidth, minChatWidth), maxChatWidth);
            setChatPanelWidthPx(boundedWidth);
        };

        const handleMouseUp = () => {
            if (isChatDividerDragging) {
                setIsChatDividerDragging(false);
            }
        };

        if (isChatDividerDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp, { once: true });
            document.body.classList.add('resize-cursor');
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('resize-cursor');
        };
    }, [isChatDividerDragging, chatPanelVisible]);

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

    const resultsPanelWidthStyle = chatPanelVisible
        ? `calc(100% - ${chatPanelWidthPx + resizerWidth}px - ${explorerPanelWidthPx}px)` // Adjusted for explorer panel width
        : `calc(100% - ${explorerPanelWidthPx}px)`;

    return (
        <div className="flex flex-col w-full max-w-full bg-gray-50 flex-1 overflow-hidden">
            <div ref={containerRef} className="flex flex-row h-full overflow-hidden relative">
                {explorerPanelVisible ?
                    (<div className="flex-shrink-0 h-full flex flex-col"
                        style={{ width: `${explorerPanelWidthPx}px` }}>
                        <ExplorerPane
                            onFileSelect={(fileId, filePath, fileType) => {
                                // Convert fileType string to TabType enum
                                const tabType = fileType.toUpperCase() as keyof typeof DocumentType;
                                addTab(fileId, filePath, DocumentType[tabType]);
                            }}
                        />
                    </div>)
                    :
                    (<button
                        title='Show explorer panel'
                        className="absolute bottom-6 left-6 p-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors z-20"
                        onClick={toggleExplorerPanel}
                    >
                        <AccountTree style={{ fontSize: '1.25rem' }} />
                    </button>)}

                {explorerPanelVisible && (
                    <div
                        className={`w-2 h-full cursor-col-resize flex-shrink-0 hover:bg-blue-500 active:bg-blue-600 z-10 ${isExplorerDividerDragging ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                        onMouseDown={handleDragExplorerDivider}
                        title="Resize panels"
                    />
                )}


                <div
                    className="bg-white m-3 mb-10 h-[calc(100%-40px)] flex flex-col overflow-hidden"
                    style={{ width: resultsPanelWidthStyle }}
                >
                    {/* Tabs */}
                    <div className="flex flex-row items-center h-13 overflow-x-auto scroll-smooth scrollbar scrollbar-h-1 scrollbar-thumb-indigo-500 bg-gray-50 px-2 flex-shrink-0">
                        {tabs.map((tab) => (
                            <div
                                key={tab.id}
                                className={`flex flex-row items-center w-fit max-w-60 border-solid border-r-0 border-2 px-4 py-2 cursor-pointer whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-gray-200 border-t-blue-800 border-b-0 bg-white'
                                    : 'text-gray-700 border-x-0 border-t-0 hover:bg-blue-100 border-b-gray-200'
                                    }`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="truncate overflow-hidden" title={tab.title}>
                                    {tab.title}
                                </span>
                                <button
                                    className="ml-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full p-0.5 text-xs leading-none flex items-center justify-center w-4 h-4"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeTab(tab.id);
                                    }}
                                    title={`Close ${tab.title}`}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col p-6 overflow-y-auto scroll-smooth scrollbar scrollbar-w-2 scrollbar-thumb-indigo-500/30 bg-white">
                        {activeTab ? (
                            tabs.find(tab => tab.id === activeTab)?.content
                        ) : tabs.length > 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500">Select a tab</div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center p-6 text-gray-500">
                                    <h3 className="text-lg font-semibold mb-2">No Open Tabs</h3>
                                    <p>Open a file or create a new one to start.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resizer */}
                {chatPanelVisible && (
                    <div
                        className={`w-2 h-full cursor-col-resize flex-shrink-0 hover:bg-blue-500 active:bg-blue-600 z-10 ${isChatDividerDragging ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                        onMouseDown={handleDragChatDivider}
                        title="Resize panels"
                    />
                )}

                {/* Chat Panel (Right Side) */}
                {chatPanelVisible ? (
                    <div
                        className="flex-shrink-0 h-full flex flex-col"
                        style={{ width: `${chatPanelWidthPx}px` }}
                    >
                        <ChatProvider>

                            <ChatView />
                        </ChatProvider>
                    </div>
                ) : (
                    <button
                        title='Show chat panel'
                        className="absolute bottom-6 right-6 p-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors z-20"
                        onClick={toggleChatPanel}
                    >
                        <ChatBubble style={{ fontSize: '1.25rem' }} />
                    </button>
                )}

            </div>
        </div>
    );
};

export default WorkspaceView;
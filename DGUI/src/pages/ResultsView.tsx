import React, { useState, useEffect } from 'react';
import DiagramView from './DiagramView';
import MarkdownView from './MarkdownView';
import ImageView from './ImageView';
import PreviewAppView from '../components/PreviewApp/PreviewAppView';
import ChatView from './ChatView';
import { useProjects } from '../provider/ProjectProvider';

interface TabProps {
    title: string;
    dir: string;
    type: 'Image' | 'Markdown' | 'Diagram' | 'PreviewApp';
}

const ResultsView: React.FC = () => {
    const { currentProject: project } = useProjects();
    const [tabs, setTabs] = useState<TabProps[]>([]);
    const [selectedTabIndex, setSelectedTabIndex] = useState<number>(-1);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [chatPanelVisible, setChatPanelVisible] = useState<boolean>(true);

    useEffect(() => {
        if (!project) {
            console.log("ResultsView useEffect: project is null or undefined. Skipping fetch.");
            return;
        }
        const fetchProjectFiles = async () => {
            if (!project) return;
            setLoading(true);
            setError(null);

            try {
                if (!window.myAPI) {
                    throw new Error('myAPI is not available. This could indicate the preload script is not loaded correctly.');
                }

                const files = await window.myAPI.getProcessedFilesFromProject(project);
                console.log('Received files:', files);

                const newTabs: TabProps[] = [];

                if (files?.markdown) {
                    files.markdown.forEach((file) => {
                        newTabs.push({ title: file, dir: `output/${file}`, type: 'Markdown' });
                    });
                }

                if (files?.image) {
                    files.image.forEach((file) => {
                        newTabs.push({ title: file, dir: `output/${file}`, type: 'Image' });
                    });
                }

                if (files?.json) {
                    files.json.forEach((file) => {
                        newTabs.push({ title: file, dir: `output/${file}`, type: 'Diagram' });
                    });
                }

                if (files?.html) {
                    newTabs.push({
                        title: 'Preview App',
                        dir: `output`,
                        type: 'PreviewApp'
                    });
                }

                setTabs(newTabs);
                if (newTabs.length > 0 && selectedTabIndex === -1) {
                    setSelectedTabIndex(0);
                }
            } catch (error) {
                console.error('Error fetching project files:', error);
                setError(error instanceof Error ? error.message : String(error));
            } finally {
                setLoading(false);
            }
        }

        fetchProjectFiles();
    }, [project]);

    const toggleChatPanel = () => {
        setChatPanelVisible(!chatPanelVisible);
    };

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

    return (
        <div className="flex flex-col h-full w-full max-w-full bg-gray-50">
            <div className="flex flex-col h-full overflow-hidden">
                <div className='flex flex-row h-full overflow-hidden'>
                    <div className={`transition-all duration-300 ease-in-out ${chatPanelVisible ? 'w-2/3' : 'w-full'} bg-white shadow-sm rounded-lg m-3 overflow-hidden flex flex-col`}>
                        {/* Project title bar */}
                        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center">
                                <h2 className="text-lg font-semibold text-gray-800">{project.name}</h2>
                                <span className="ml-3 px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                    {project.id}
                                </span>
                            </div>
                            <button
                                onClick={toggleChatPanel}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                                title={chatPanelVisible ? "Hide chat panel" : "Show chat panel"}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </button>
                        </div>

                        {/* Tabs for files */}
                        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 bg-gray-50 px-2">
                            {tabs.map((tab, index) => (
                                <button
                                    key={index}
                                    className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-150 flex-shrink-0 rounded-t-md ${selectedTabIndex === index
                                        ? 'bg-white text-blue-600 border-t-2 border-l border-r border-blue-500 border-b-0'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                        }`}
                                    onClick={() => setSelectedTabIndex(index)}
                                >
                                    <span className="mr-2">
                                        {tab.type === 'Markdown' && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        )}
                                        {tab.type === 'Image' && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                        {tab.type === 'Diagram' && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                            </svg>
                                        )}
                                        {tab.type === 'PreviewApp' && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </span>
                                    {tab.title}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-6 overflow-auto">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                    <span className="ml-3 text-gray-600">Loading files...</span>
                                </div>
                            ) : error ? (
                                <div className="text-center p-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 mb-4">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-red-800">Error Loading Files</h3>
                                    <p className="mt-2 text-red-600">{String(error)}</p>
                                </div>
                            ) : selectedTabIndex !== -1 && tabs[selectedTabIndex] ? (
                                (() => {
                                    const selectedTab = tabs[selectedTabIndex];
                                    const projectDir = project.directories.project;
                                    switch (selectedTab.type) {
                                        case 'Image':
                                            return <ImageView key={selectedTabIndex} fileDir={`${projectDir}/${selectedTab.dir}`} />;
                                        case 'Markdown':
                                            return <MarkdownView key={selectedTabIndex} fileDir={`${projectDir}/${selectedTab.dir}`} />;
                                        case 'Diagram':
                                            return <DiagramView key={selectedTabIndex} fileDir={`${projectDir}/${selectedTab.dir}`} />;
                                        case 'PreviewApp':
                                            console.log(`Loading PreviewApp with project: ${project.id}`);
                                            return <PreviewAppView key={selectedTabIndex} project={project} fileDir={`${projectDir}/output`} />;
                                        default:
                                            return <div key={selectedTabIndex}>Invalid file type</div>;
                                    }
                                })()
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-gray-500">
                                        {tabs.length === 0 ? "No files found in this project." : "Select a file to view."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Panel */}
                    {chatPanelVisible && (<ChatView />)}
                </div>
            </div>
        </div>
    );
};

export default ResultsView;

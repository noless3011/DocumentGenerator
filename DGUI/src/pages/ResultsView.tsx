import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import DiagramView from './DiagramView';
import MarkdownView from './MarkdownView';
import ImageView from './ImageView';
import { Project } from 'src/components/DocumentsHandling/ProjectManagingMenu';

interface TabProps {
    title: string;
    dir: string;
    type: 'Image' | 'Markdown' | 'Diagram';
}

interface ResultsViewProps {
    project: Project | null;
}

const ResultsView: React.FC<ResultsViewProps> = ({ project }) => {
    const [tabs, setTabs] = useState<TabProps[]>([]);
    const [selectedTabIndex, setSelectedTabIndex] = useState<number>(-1);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!project) { // Add check at the beginning of useEffect
            console.log("ResultsView useEffect: project is null or undefined. Skipping fetch.");
            return; // Exit useEffect if project is invalid
        }
        const fetchProjectFiles = async () => {
            if (!project) return;
            setLoading(true);
            setError(null); // Reset error state at the beginning
            
            try {
                // Check if window.myAPI exists first
                if (!window.myAPI) {
                    throw new Error('myAPI is not available. This could indicate the preload script is not loaded correctly.');
                }
                
                const files = await window.myAPI.getProcessedFilesFromProject(project);
                console.log('Received files:', files);
                
                const newTabs: TabProps[] = [];
                
                // Make sure we don't double-add markdown files
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
                
                setTabs(newTabs);
            } catch (error) {
                console.error('Error fetching project files:', error);
                setError(error instanceof Error ? error.message : String(error));
            } finally {
                setLoading(false);
            }
        }

        fetchProjectFiles();

    }, [project]);

    return (
        <div className="flex flex-col h-full w-full max-w-full">
            <div className="flex flex-col h-full overflow-hidden">
                {!project ? (
                    <div className="text-center text-gray-500 mt-10">No project loaded. Please load a project first.</div>
                ) : (
                    <>
                        <div className="flex border-b border-gray-300 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 whitespace-nowrap">
                            {tabs.map((tab, index) => (
                                <button
                                    key={index}
                                    className={`flex items-center px-6 py-4 text-sm font-medium transition-colors duration-150 flex-shrink-0 ${selectedTabIndex === index
                                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                        }`}
                                    onClick={() => setSelectedTabIndex(index)}
                                >
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
                        <div className="flex-1 p-6 overflow-auto">
                            {loading ? (
                                <div className="text-center text-gray-500 mt-10">Loading files...</div>
                            ) : error ? (
                                <div className="text-center text-red-500 mt-10">{String(error)}</div> // Ensure error is a string
                            ) : selectedTabIndex !== -1 && tabs[selectedTabIndex] ? (
                                (() => {
                                    const selectedTab = tabs[selectedTabIndex];
                                    const projectDir = project.project_dir || `${project.base_dir}/${project.name}_${project.id}`;
                                    switch (selectedTab.type) {
                                        case 'Image':
                                            return <ImageView key={selectedTabIndex} fileDir={`${projectDir}/${selectedTab.dir}`} />;
                                        case 'Markdown':
                                            return <MarkdownView key={selectedTabIndex} fileDir={`${projectDir}/${selectedTab.dir}`} />;
                                        case 'Diagram':
                                            return <DiagramView key={selectedTabIndex} fileDir={`${projectDir}/${selectedTab.dir}`} />;
                                        default:
                                            return <div key={selectedTabIndex}>Invalid file type</div>;
                                    }
                                })()
                            ) : (
                                <div className="text-center text-gray-500 mt-10">
                                    {tabs.length === 0 ? "No files found in this project." : "Select a file to view."}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResultsView;
import React, { useState } from 'react';
import DocumentsHandling from './pages/DocumentsHandlingView';
import ResultsView from './pages/ResultsView';
import ProjectManagingMenu from './components/DocumentsHandling/ProjectManagingMenu';
import { useProjects } from './provider/ProjectProvider';
import ClassDiagramCanvas from './components/DiagramComponents/ClassDiagramCanvas';
import DatabaseDiagramCanvas from './components/DiagramComponents/DatabaseDiagramCanvas';

interface VerticalTabProps {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

const VerticalTab: React.FC<VerticalTabProps> = ({ children }) => {
    return <div className="p-4">{children}</div>;
};

const AppContainer: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const { currentProject } = useProjects();

    const switchTab = (index: number) => setActiveTab(index);

    const tabs = [
        {
            label: "Documents",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            content: <DocumentsHandling switchTab={switchTab} />
        },
        {
            label: "Results",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            content: <ResultsView />
        },
        {
            label: "Settings",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            content: <div className="p-4">Settings configuration will be available here</div>
        },
        {
            label: "About",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
                </svg>
            ),
            content: <div className="p-4 w-[1500px] h-[800px]"><DatabaseDiagramCanvas></DatabaseDiagramCanvas></div>
        }
    ];

    // Use provided tabs or fallback to test tabs
    const displayTabs = tabs.length > 0 ? tabs : [];

    return (
        <div className="flex flex-row h-full flex-grow">
            {/* Vertical Sidebar */}
            <div className="w-64 bg-white shadow-lg">
                <div className="flex flex-col h-full ">
                    {displayTabs.map((tab, index) => (
                        <button
                            key={index}
                            className={`flex items-center px-6 py-4 text-sm font-medium text-left transition-colors duration-150 ${activeTab === index
                                ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                }`}
                            onClick={() => setActiveTab(index)}
                        >
                            {tab.icon && <span className="mr-3">{tab.icon}</span>}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex-grow overflow-hidden">
                <div className='flex flex-col p-6 w-full h-full overflow-hidden'>
                    <ProjectManagingMenu />
                    {displayTabs[activeTab].content}
                </div>
            </div>
        </div>
    );
};

export { AppContainer, VerticalTab };
export default AppContainer;

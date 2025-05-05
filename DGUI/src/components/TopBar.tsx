import React from 'react';
import ProjectManagingMenu from './DocumentsHandling/ProjectManagingMenu';
import AIProviderMenu from './AIProviderMenu';
import DocumentsHandlingMenu from './DocumentsHandlingMenu';

interface TopBarProps {

}

const TopBar: React.FC<TopBarProps> = (props) => {
    return (
        <div className="flex items-start gap-1 p-1 h-fit bg-blue-300">
            <ProjectManagingMenu />
            <div className="mx-2 h-6 w-px bg-gray-700 self-center"></div>
            <AIProviderMenu />
            <div className="mx-2 h-6 w-px bg-gray-700 self-center"></div>
            <DocumentsHandlingMenu />
        </div>
    );
};

export default TopBar;
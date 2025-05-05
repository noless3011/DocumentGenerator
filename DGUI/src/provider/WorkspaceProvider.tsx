import React, { createContext, useContext, useState, ReactNode } from 'react';
import Tab from '../components/Tab';

export enum TabType {
    DIAGRAM = 'diagram',
    MARKDOWN = 'markdown',
    PROTOTYPE = 'prototype',
}

export interface Tab {
    id: string;
    title: string;
    filePath: string;
    content: () => ReactNode;
}

interface WorkspaceContextValue {
    tabs: Tab[];
    activeTab: string | null;
    setActiveTab: (tabId: string | null) => void;
    removeTab: (filePath: string) => void;
    addTab: (id: string, filePath: string, tabType: TabType) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

interface WorkspaceProviderProps {
    children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
    // Initialize state for the workspace
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);

    const value = {
        tabs,
        activeTab,
        setActiveTab: (tabId: string | null) => {
            setActiveTab(tabId);
        },
        removeTab: (filePath: string) => {
            setTabs((prevTabs) => prevTabs.filter((tab) => tab.filePath !== filePath));
        },
        addTab: (id: string, filePath: string, tabType: TabType) => {
            const newTab = {
                id: id,
                title: filePath.split('/').pop() || 'Untitled',
                filePath,
                content: () => <Tab label={filePath} filePath={filePath} type={tabType} />,
            };
            setTabs((prevTabs) => [...prevTabs, newTab]);
        },

    }

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = (): WorkspaceContextValue => {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
};

import React, { createContext, useContext, useState, ReactNode } from 'react';
import Tab from '../components/Tab';

export enum DocumentType {
    DIAGRAM = 'diagram',
    MARKDOWN = 'markdown',
    PROTOTYPE = 'prototype',
}

export interface Tab {
    id: string;
    title: string;
    filePath: string;
    content: ReactNode; // Changed from () => ReactNode
}

interface WorkspaceContextValue {
    tabs: Tab[];
    activeTab: string | null;
    setActiveTab: (tabId: string | null) => void;
    removeTab: (tabId: string) => void; // Changed from filePath: string
    addTab: (id: string, filePath: string, tabType: DocumentType) => void;
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
        removeTab: (tabId: string) => {
            setTabs((prevTabs) => {
                const newTabs = prevTabs.filter((tab) => tab.id !== tabId);
                // If the removed tab was the active one, update activeTab
                if (activeTab === tabId) {
                    setActiveTab(newTabs.length > 0 ? newTabs[0].id : null);
                }
                return newTabs;
            });
        },
        addTab: (id: string, filePath: string, tabType: DocumentType) => {
            // Check if tab already exists
            const existingTab = tabs.find(tab => tab.id === id);
            if (existingTab) {
                setActiveTab(id); // If exists, just make it active
                return;
            }

            const newTabDefinition: Tab = {
                id: id,
                title: filePath.split(/[\\/]/).pop() || filePath || 'Untitled', // Use regex for path separators
                filePath,
                content: <Tab label={filePath} filePath={filePath} type={tabType} />, // Store instance directly
            };
            setTabs((prevTabs) => [...prevTabs, newTabDefinition]);
            setActiveTab(id); // Make the new tab active
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

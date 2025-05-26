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
    content: ReactNode;
}

interface WorkspaceContextValue {
    tabs: Tab[];
    activeTab: string | null;
    setActiveTab: (tabId: string | null) => void;
    removeTab: (tabId: string) => void;
    addTab: (id: string, filePath: string, tabType: DocumentType) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

interface WorkspaceProviderProps {
    children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {

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

                if (activeTab === tabId) {
                    setActiveTab(newTabs.length > 0 ? newTabs[0].id : null);
                }
                return newTabs;
            });
        },
        addTab: (id: string, filePath: string, tabType: DocumentType) => {

            const existingTab = tabs.find(tab => tab.id === id);
            if (existingTab) {
                setActiveTab(id);
                return;
            }

            const newTabDefinition: Tab = {
                id: id,
                title: filePath.split(/[\\/]/).pop() || filePath || 'Untitled',
                filePath,
                content: <Tab label={filePath} filePath={filePath} type={tabType} />,
            };
            setTabs((prevTabs) => [...prevTabs, newTabDefinition]);
            setActiveTab(id);
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

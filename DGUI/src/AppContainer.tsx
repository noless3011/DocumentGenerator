import React from 'react';
import WorkspaceView from './pages/WorkspaceView';
import TopBar from './components/TopBar';
import { WorkspaceProvider } from './provider/WorkspaceProvider';

interface VerticalTabProps {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

const VerticalTab: React.FC<VerticalTabProps> = ({ children }) => {
    return <div className="p-4">{children}</div>;
};

const AppContainer: React.FC = () => {

    return (<div className='flex flex-col h-full w-full'>
        <TopBar />
        <WorkspaceProvider>
            <WorkspaceView />
        </WorkspaceProvider>

    </div>);
};

export { AppContainer, VerticalTab };
export default AppContainer;

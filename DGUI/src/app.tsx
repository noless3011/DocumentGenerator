
import "./index.css";
import { createRoot } from 'react-dom/client';
import React from 'react';
import AppContainer from "./AppContainer";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { ProjectProvider } from "./provider/ProjectProvider";
import { ChatProvider } from "./provider/ChatProvider";

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <ProjectProvider>
            <ChatProvider>
                <AppContainer />
            </ChatProvider>
        </ProjectProvider>
    </React.StrictMode>
);
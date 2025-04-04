
import "./index.css";
import { createRoot } from 'react-dom/client';
import React from 'react';
import AppContainer from "./AppContainer";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <AppContainer />
    </React.StrictMode>
);
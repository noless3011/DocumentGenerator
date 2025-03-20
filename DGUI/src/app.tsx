
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
        <h1 className="font-bold text-2xl underline text-green-600">DOCGEN</h1>
        <AppContainer />
    </React.StrictMode>
);
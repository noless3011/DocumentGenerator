
import "./index.css";
import { createRoot } from 'react-dom/client';
import DocumentsHandling from './DocumentsHandling';
import React from 'react';
import Results from "./Results";
import AppContainer from "./AppContainer";
const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <h1 className="font-bold text-2xl underline text-red-700">Hello react</h1>
        <AppContainer />
    </React.StrictMode>
);
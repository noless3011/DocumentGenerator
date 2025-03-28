
import "./index.css";
import { createRoot } from 'react-dom/client';
import DocumentsHandling from './pages/DocumentsHandlingView';
import React from 'react';
import Results from "./pages/ResultsView";
import AppContainer from "./AppContainer";
const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(
    // <React.StrictMode>
    //     <h1 className="font-bold text-2xl underline text-green-600">DOCGEN</h1>
        <AppContainer />
    // </React.StrictMode>
);
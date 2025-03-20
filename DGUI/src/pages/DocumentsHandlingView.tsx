import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface SheetOption {
    name: string;
    selected: boolean;
    options: string[];
    selectedOption: string;
}

interface DocumentsHandlingProps {
    switchTab: (tabIndex: number) => void;
    setFileDirs: (fileDirs: string[]) => void;
}

const DocumentsHandling: React.FC<DocumentsHandlingProps> = ({ switchTab, setFileDirs }) => {
    const [fileName, setFileName] = useState<string>('');
    const [outputFolder, setOutputFolder] = useState<string>('');
    const [sheets, setSheets] = useState<SheetOption[]>([]);
    const [previewData, setPreviewData] = useState<any[][]>([]);
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
    const [currentPreviewSheet, setCurrentPreviewSheet] = useState<string>('');
    const [fileId, setFileId] = useState<string>(''); // To store the uploaded file ID
    const [processing, setProcessing] = useState<boolean>(false);
    const [processingResults, setProcessingResults] = useState<any>(null);
    const [generating, setGenerating] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const workbookRef = useRef<XLSX.WorkBook | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionName, setSessionName] = useState<string>('');


    const startNewSession = async () => {
        try {
            const response = await fetch('http://localhost:5000/start-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ session_name: sessionName || 'Untitled Session' }),
                mode: 'cors',
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Failed to start session: ${response.status}`);
            }

            const result = await response.json();
            setSessionId(result.session_id);
            alert(`Session "${result.session_name}" started successfully! Session ID: ${result.session_id}`);
        } catch (error) {
            console.error('Error starting session:', error);
            alert(error instanceof Error ? error.message : 'An error occurred while starting the session.');
        }
    };

    const endSession = async () => {
        if (!sessionId) {
            alert('No active session to end.');
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/end-session', {
                method: 'POST',
                mode: 'cors',
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Failed to end session: ${response.status}`);
            }

            setSessionId(null);
            setSessionName('');
            alert('Session ended successfully.');
        } catch (error) {
            console.error('Error ending session:', error);
            alert(error instanceof Error ? error.message : 'An error occurred while ending the session.');
        }
    };


    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!sessionId) {
            alert('Please start a session before uploading a file.');
            return;
        }

        setFileName(file.name);
        setSheets([]); // Clear previous sheets
        setPreviewData([]); // Clear preview data
        setPreviewHeaders([]); // Clear preview headers
        setProcessingResults(null); // Clear processing results
        setFileId(''); // Clear previous fileId

        try {
            // Create form data for file upload
            const formData = new FormData();
            formData.append('file', file);

            // Upload file to backend
            const uploadResponse = await fetch('http://localhost:5000/upload-excel', {
                method: 'POST',
                body: formData,
                mode: 'cors'
            });

            if (!uploadResponse.ok) {
                const errorResult = await uploadResponse.json();
                throw new Error(errorResult.error || `Failed to upload file: ${uploadResponse.status}`);
            }

            const uploadResult = await uploadResponse.json();

            // Store the file ID for later use
            setFileId(uploadResult.file_id);

            // Get sheet names from the uploaded file
            const sheetsResponse = await fetch(`http://localhost:5000/get-sheets/${uploadResult.file_id}`, {
                method: 'GET',
                mode: 'cors'
            });

            if (!sheetsResponse.ok) {
                const errorResult = await sheetsResponse.json();
                throw new Error(sheetsResponse.statusText || `Failed to get sheet names: ${sheetsResponse.status}`);
            }

            const sheetsResult = await sheetsResponse.json();

            // Map sheet names to sheet options
            const sheetOptions: SheetOption[] = sheetsResult.sheets.map((name: string) => ({
                name,
                selected: true,
                options: ['UI', 'Table'], // Removed Diagram and Others as per backend options
                selectedOption: 'UI'
            }));

            setSheets(sheetOptions);

            // Preview the first sheet if available
            if (sheetOptions.length > 0) {
                setCurrentPreviewSheet(sheetOptions[0].name);
                // No need to handle preview logic immediately here, let user click preview button
            }
            alert('File uploaded and sheets loaded successfully!');


        } catch (error) {
            console.error('Error handling file:', error);
            alert(error instanceof Error ? error.message : 'An unknown error occurred during file upload.');
            setFileName(''); // Reset file name on error
            setSheets([]); // Clear sheets on error
            setFileId(''); // Clear fileId on error
        }
    };

    const handlePreviewSheet = async (sheetName: string) => {
        try {
            const sheetsResponse = await fetch(`http://localhost:5000/get-sheets/${fileId}`, {
                method: 'GET',
                mode: 'cors'
            });

            if (!sheetsResponse.ok) {
                const errorResult = await sheetsResponse.json();
                throw new Error(errorResult.error || `Failed to get sheet data for preview: ${sheetsResponse.status}`);
            }
            const sheetsResult = await sheetsResponse.json();

            // Simulate reading sheet data from backend (replace with actual API if needed for preview data)
            // For now, re-parse the file on frontend for preview (efficient for small previews)
            const fileInput = fileInputRef.current?.files?.[0];
            if (!fileInput) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const binaryString = e.target?.result;
                const workbook = XLSX.read(binaryString, { type: 'binary' });
                workbookRef.current = workbook; // Store workbook for later use

                const worksheet = workbook.Sheets[sheetName];

                if (worksheet) {
                    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1, defval: '' });

                    if (jsonData.length > 0) {
                        // First row as headers
                        const headers = (jsonData[0] as any[]).map(h => h?.toString() || '');
                        const rows = jsonData.slice(1, 21); // Preview up to 20 rows

                        setPreviewHeaders(headers);
                        setPreviewData(rows);
                        setCurrentPreviewSheet(sheetName);
                    } else {
                        setPreviewHeaders([]);
                        setPreviewData([[]]); // Show empty table if no data
                        setCurrentPreviewSheet(sheetName);
                        alert(`Sheet "${sheetName}" is empty.`);
                    }
                } else {
                    alert(`Sheet "${sheetName}" not found in the Excel file.`);
                }
            };
            reader.onerror = (error) => {
                console.error('Error reading file for preview:', error);
                alert('Failed to read file for preview. Check console for details.');
            };
            reader.readAsBinaryString(fileInput);


        } catch (error) {
            console.error('Error previewing sheet:', error);
            alert(error instanceof Error ? error.message : 'An error occurred while trying to preview the sheet.');
        }
    };


    const handleOutputFolderSelect = () => {
        window.myAPI.selectFolder().then((folderPath) => {
            setOutputFolder(folderPath);
        })
    };

    const handleSheetSelectionChange = (index: number) => {
        const updatedSheets = [...sheets];
        updatedSheets[index].selected = !updatedSheets[index].selected;
        setSheets(updatedSheets);
    };

    const handleOptionChange = (sheetIndex: number, option: string) => {
        const updatedSheets = [...sheets];
        updatedSheets[sheetIndex].selectedOption = option;
        setSheets(updatedSheets);
    };

    const handleProcessSheets = async () => {
        if (!fileId) {
            alert('Please upload an Excel file first.');
            return;
        }
        if (!sessionId) {
            alert('Please start a session before processing sheets.');
            return;
        }

        const selectedSheetTypes = sheets.reduce((acc, sheet) => {
            if (sheet.selected) {
                acc[sheet.name] = sheet.selectedOption.toLowerCase();
            }
            return acc;
        }, {} as Record<string, string>);

        if (Object.keys(selectedSheetTypes).length === 0) {
            alert('Please select at least one sheet to process.');
            return;
        }

        const payload = {
            file_id: fileId,
            sheets: selectedSheetTypes
        };

        try {
            setProcessing(true);
            setProcessingResults(null); // Clear previous results

            const response = await fetch('http://localhost:5000/process-excel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Sheet processing failed: ${response.status}`);
            }

            const result = await response.json();
            setProcessingResults(result);
            alert('Sheets processed successfully!');


        } catch (error) {
            console.error('Error processing sheets:', error);
            alert(error instanceof Error ? error.message : 'Failed to process sheets.');
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateDocuments = async () => {
        if (!sessionId) {
            alert('Please start a session before generating documents.');
            return;
        }
        try {
            setGenerating(true);
            const response = await fetch('http://localhost:5000/generate-documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...(outputFolder && { output_dir: outputFolder })
                }),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Document generation failed: ${response.status}`);
            }


            const result = await response.json();

            if (result.generated_files && Array.isArray(result.generated_files)) {
                setFileDirs(result.generated_files);
            }
            alert(`Documents generated successfully! ${result.count} file(s) created in ${result.output_dir}`);
            switchTab(1); // Switch to the Results tab
        } catch (error) {
            console.error('Error generating documents:', error);
            alert('Failed to generate documents. Check console for details.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex h-full">
            {/* Left Panel - Controls */}
            <div className="w-full md:w-1/3 p-4 bg-gray-100 border-r border-gray-200 flex flex-col">
                <h2 className="panel-title text-xl font-semibold mb-4">Excel File Handler</h2>

                {/* Session Management */}
                <div className="session-container mb-6">
                    <p className="section-label text-sm font-medium text-gray-700 mb-2">Session Management</p>
                    <div className="mb-2">
                        <input
                            type="text"
                            placeholder="Session Name (Optional)"
                            className="session-name-input shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                        />
                    </div>
                    <div className="button-row flex space-x-2">
                        <button
                            onClick={startNewSession}
                            className="primary-button bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm"
                            disabled={sessionId != null}
                        >
                            Start Session
                        </button>
                        <button
                            onClick={endSession}
                            className="primary-button bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm"
                            disabled={sessionId == null}
                        >
                            End Session
                        </button>
                    </div>
                    {sessionId && <p className="text-gray-500 text-xs italic mt-1">Current Session ID: {sessionId}</p>}
                </div>


                {/* File Uploader */}
                <div className="upload-container mb-6">
                    <p className="section-label text-sm font-medium text-gray-700 mb-2">Upload Excel File</p>

                    <div className="button-row flex items-center space-x-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".xlsx, .xls"
                            className="file-input hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="primary-button bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            disabled={!sessionId}
                        >
                            Select File
                        </button>
                        <span className="file-name text-gray-600 text-sm truncate">
                            {fileName || 'No file selected'}
                        </span>
                    </div>
                    {!sessionId && <p className="text-red-500 text-xs italic mt-1">Please start a session first to upload file.</p>}
                </div>

                {/* Output Folder Selector */}
                <div className="folder-container mb-6">
                    <p className="section-label text-sm font-medium text-gray-700 mb-2">Output Folder for Document Generation</p>
                    <div className="button-row flex items-center space-x-2">
                        <button
                            onClick={handleOutputFolderSelect}
                            className="primary-button bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            Select Folder
                        </button>
                        <span className="folder-path text-gray-600 text-sm truncate">
                            {outputFolder || 'No folder selected'}
                        </span>
                    </div>
                    <p className="text-gray-500 text-xs italic mt-1">
                        Choose where to save generated documents
                    </p>
                </div>

                {/* Sheet List with Options */}
                <div className="sheets-container flex-grow flex flex-col">
                    <p className="section-label text-sm font-medium text-gray-700 mb-2">Available Sheets</p>

                    {sheets.length === 0 ? (
                        <p className="no-sheets-message text-gray-600 italic text-sm">No sheets available. Please upload an Excel file.</p>
                    ) : (
                        <ul className="sheets-list overflow-y-auto border border-gray-300 rounded p-2">
                            {sheets.map((sheet, index) => (
                                <li
                                    key={index}
                                    className={`sheet-item flex items-center justify-between p-2 rounded hover:bg-gray-200 mb-1 last:mb-0 ${sheet.selected ? 'sheet-item-selected bg-blue-100' : ''} ${sheet.name === currentPreviewSheet ? 'sheet-previewing bg-green-100' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={sheet.selected}
                                        onChange={() => handleSheetSelectionChange(index)}
                                        className="sheet-checkbox form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <div className="sheet-details flex-1 ml-2 flex items-center justify-between">
                                        <div className="sheet-name text-sm font-medium text-gray-800">{sheet.name}</div>
                                        <div className="sheet-actions flex items-center space-x-2">
                                            <select
                                                value={sheet.selectedOption}
                                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                                className="sheet-options-select block appearance-none w-full bg-white border border-gray-300 hover:border-gray-500 px-2 py-1 rounded shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50"
                                                disabled={!sheet.selected}
                                            >
                                                {sheet.options.map((option) => (
                                                    <option key={option} value={option}>
                                                        {option}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handlePreviewSheet(sheet.name)}
                                                className="preview-sheet-button bg-green-500 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                                                title="Preview this sheet"
                                            >
                                                Preview
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {sheets.length > 0 && (
                        <div>
                            <button
                                className="process-button mt-4 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                onClick={handleProcessSheets}
                                disabled={processing || !sessionId}
                            >
                                {processing ? 'Processing...' : 'Process Selected Sheets'}
                            </button>
                            <br></br>
                            <button
                                className="process-button mt-4 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                onClick={handleGenerateDocuments}
                                disabled={generating || !sessionId}
                            >
                                {generating ? 'Asking LLM...' : 'Generate Documents'}
                            </button>
                            {!sessionId && <p className="text-red-500 text-xs italic mt-1">Please start a session first to process or generate documents.</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="w-full md:w-2/3 p-4 bg-white flex flex-col">
                <h2 className="panel-title text-xl font-semibold mb-4">Excel Preview</h2>

                {previewData.length > 0 ? (
                    <div className="table-container overflow-x-auto shadow-md rounded">
                        <table className="preview-table min-w-full leading-normal">
                            <thead>
                                <tr>
                                    {previewHeaders.map((header, index) => (
                                        <th key={index} className="table-header px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={cellIndex} className="table-cell px-5 py-3 border-b border-gray-200 bg-white text-sm">
                                                {cell?.toString() || ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-preview flex justify-center items-center h-full">
                        <p className="empty-message text-gray-500 italic">
                            {fileName
                                ? 'Select a sheet to preview...'
                                : 'Upload an Excel file to see preview'}
                        </p>
                    </div>
                )}

                {processingResults && (
                    <div className="processing-results mt-6">
                        <h3 className="text-lg font-semibold mb-2">Processing Results</h3>
                        <ul className="list-disc pl-5">
                            {Object.entries(processingResults).map(([sheetName, result]) => (
                                <li key={sheetName} className="mb-1">
                                    <strong className="font-medium">{sheetName}:</strong> <span className="text-sm">{(result as any).status === 'success'
                                        ? `Processed as ${(result as any).type}, output in: ${(result as any).output_folder}` // Changed to output_folder as per API
                                        : `Error: ${(result as any).message}`}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentsHandling;
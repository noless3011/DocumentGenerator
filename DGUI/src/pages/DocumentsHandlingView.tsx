import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useProjects } from '../provider/ProjectProvider';

interface SheetOption {
    name: string;
    selected: boolean;
    options: string[];
    selectedOption: string;
}

interface DocumentsHandlingProps {
    switchTab: (tabIndex: number) => void;
}

interface ProjectFile {
    path: string;
    name: string;
    added_date: string;
    selected?: boolean;
}

const DocumentsHandling: React.FC<DocumentsHandlingProps> = ({ switchTab }) => {
    const { currentProject, loading } = useProjects();
    const [fileName, setFileName] = useState<string>('');
    const [sheets, setSheets] = useState<SheetOption[]>([]);
    const [previewData, setPreviewData] = useState<any[][]>([]);
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
    const [currentPreviewSheet, setCurrentPreviewSheet] = useState<string>('');
    const [processing, setProcessing] = useState<boolean>(false);
    const [processingResults, setProcessingResults] = useState<any>(null);
    const [generating, setGenerating] = useState<boolean>(false);
    const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
    const [selectedFileIndex, setSelectedFileIndex] = useState<number>(-1);

    const [loadingSheets, setLoadingSheets] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const workbookRef = useRef<XLSX.WorkBook | null>(null);

    // Load project files when current project changes
    useEffect(() => {
        if (currentProject && currentProject.files) {
            const files = currentProject.files.input.map((file: ProjectFile) => ({
                ...file,
                selected: false
            }));
            setProjectFiles(files);
        } else {
            setProjectFiles([]);
        }
    }, [currentProject]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!currentProject) {
            alert('Please load or create a project first.');
            return;
        }

        setFileName(file.name);
        setSheets([]);
        setPreviewData([]);
        setPreviewHeaders([]);
        setProcessingResults(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch('http://localhost:5000/files/upload-excel', {
                method: 'POST',
                body: formData,
                mode: 'cors',
                credentials: 'include',
            });

            if (!uploadResponse.ok) {
                const errorResult = await uploadResponse.json();
                throw new Error(errorResult.error || `Failed to upload file: ${uploadResponse.status}`);
            }

            const uploadResult = await uploadResponse.json();

            const sheetsResponse = await fetch(`http://localhost:5000/files/get-sheets`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'include'
            });

            if (!sheetsResponse.ok) {
                const errorResult = await sheetsResponse.json();
                throw new Error(sheetsResponse.statusText || `Failed to get sheet names: ${sheetsResponse.status}`);
            }

            const sheetsResult = await sheetsResponse.json();

            const sheetOptions: SheetOption[] = sheetsResult.sheets.map((name: string) => ({
                name,
                selected: true,
                options: ['UI', 'Table'],
                selectedOption: 'UI'
            }));

            setSheets(sheetOptions);

            if (sheetOptions.length > 0) {
                setCurrentPreviewSheet(sheetOptions[0].name);
            }
            alert('File uploaded and sheets loaded successfully!');

            // Update input files array with the new file
            const now = new Date().toISOString();
            const newFile = {
                path: uploadResult.output_folder,
                name: file.name,
                added_date: now,
                selected: true
            };

            // Add to project files list
            const updatedFiles = [...projectFiles, newFile];
            setProjectFiles(updatedFiles);
            setSelectedFileIndex(updatedFiles.length - 1);

        } catch (error) {
            console.error('Error handling file:', error);
            alert(error instanceof Error ? error.message : 'An unknown error occurred during file upload.');
            setFileName('');
            setSheets([]);
        }
    };

    const handleSelectFile = async (index: number) => {
        setSelectedFileIndex(index);
        const file = projectFiles[index];
        setFileName(file.name);
        setLoadingSheets(true);
        try {
            const sheetsResponse = await fetch(`http://localhost:5000/files/get-sheets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                credentials: 'include'
            });

            if (!sheetsResponse.ok) {
                throw new Error(`Failed to get sheet names: ${sheetsResponse.status}`);
            }

            const sheetsResult = await sheetsResponse.json();

            // The API now returns all sheet names in a flat array under "sheets" key
            const sheetOptions: SheetOption[] = sheetsResult.sheets.map((name: string) => ({
                name,
                selected: true,
                options: ['UI', 'Table'],
                selectedOption: 'UI'
            }));

            setSheets(sheetOptions);
            if (sheetOptions.length > 0) {
                handlePreviewSheet(sheetOptions[0].name);
                setCurrentPreviewSheet(sheetOptions[0].name);
            }
        } catch (error) {
            console.error('Error loading file sheets:', error);
            alert(error instanceof Error ? error.message : 'An error occurred loading the file');
        } finally {
            setLoadingSheets(false);
        }
    };

    const toggleFileSelection = (index: number) => {
        const updatedFiles = [...projectFiles];
        updatedFiles[index].selected = !updatedFiles[index].selected;
        setProjectFiles(updatedFiles);
    };

    const handlePreviewSheet = async (sheetName: string) => {
        try {
            // If a file is selected from project files
            if (selectedFileIndex >= 0) {
                const response = await fetch(`http://localhost:5000/files/preview-sheet`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        filePath: projectFiles[selectedFileIndex].path,
                        sheetName: sheetName
                    }),
                    mode: 'cors'
                });

                if (!response.ok) {
                    throw new Error(`Failed to get sheet data for preview: ${response.status}`);
                }

                const result = await response.json();
                setPreviewHeaders(result.headers);
                setPreviewData(result.data);
                setCurrentPreviewSheet(sheetName);
                return;
            }

            // Fallback to existing method for newly uploaded file
            const sheetsResponse = await fetch(`http://localhost:5000/files/get-sheets`, {
                method: 'POST',
                mode: 'cors'
            });

            if (!sheetsResponse.ok) {
                const errorResult = await sheetsResponse.json();
                throw new Error(errorResult.error || `Failed to get sheet data for preview: ${sheetsResponse.status}`);
            }
            const sheetsResult = await sheetsResponse.json();

            const fileInput = fileInputRef.current?.files?.[0];
            if (!fileInput) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                workbookRef.current = workbook;

                const worksheet = workbook.Sheets[sheetName];

                if (worksheet) {
                    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1, defval: '' });

                    if (jsonData.length > 0) {
                        const headers = (jsonData[0] as any[]).map(h => h?.toString() || '');
                        const rows = jsonData.slice(1, 21);

                        setPreviewHeaders(headers);
                        setPreviewData(rows);
                        setCurrentPreviewSheet(sheetName);
                    } else {
                        setPreviewHeaders([]);
                        setPreviewData([[]]);
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
            reader.readAsArrayBuffer(fileInput);
        } catch (error) {
            console.error('Error previewing sheet:', error);
            alert(error instanceof Error ? error.message : 'An error occurred while trying to preview the sheet.');
        }
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
        if (!currentProject) {
            alert('Please create/load a project first.');
            return;
        }

        // Check if files are selected for processing
        const selectedFiles = projectFiles.filter(file => file.selected);
        if (selectedFiles.length === 0 && selectedFileIndex === -1) {
            alert('Please select at least one file to process.');
            return;
        }

        // If specific file is selected in preview but not checked, add it to the processing list
        if (selectedFileIndex >= 0 && !projectFiles[selectedFileIndex].selected) {
            selectedFiles.push(projectFiles[selectedFileIndex]);
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

        // Create the filesToProcess array with proper sheet format
        const filesToProcess = selectedFiles.map(file => ({
            path: file.path,
            name: file.name,
            sheets: Object.fromEntries(
                sheets
                    .filter(sheet => sheet.selected)
                    .map(sheet => [sheet.name, selectedSheetTypes[sheet.name]])
            )
        }));

        try {
            setProcessing(true);
            setProcessingResults(null);

            const response = await fetch('http://localhost:5000/files/process-excel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ files: filesToProcess }),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Sheet processing failed: ${response.status}`);
            }

            const result = await response.json();
            setProcessingResults(result);
            alert('Files processed successfully!');

        } catch (error) {
            console.error('Error processing sheets:', error);
            alert(error instanceof Error ? error.message : 'Failed to process sheets.');
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateDocuments = async () => {
        if (!currentProject) {
            alert('Please load or create a project first.');
            return;
        }

        try {
            setGenerating(true);
            const response = await fetch('http://localhost:5000/generate/all-documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Document generation failed: ${response.status}`);
            }

            const result = await response.json();
            console.log("Generate Documents Result:", result);

            alert('Documents generated successfully!');
            switchTab(1);
        } catch (error) {
            console.error('Error generating documents:', error);
            alert('Failed to generate documents. Check console for details.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex h-full overflow-y-scroll">
            {/* Left Panel - Controls */}
            <div className="w-full md:w-1/3 p-4 bg-gray-100 border-r border-gray-200 flex flex-col">
                <h2 className="panel-title text-xl font-semibold mb-4">Excel File Handler</h2>
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
                            disabled={!currentProject || loading}
                        >
                            Select File
                        </button>
                        <span className="file-name text-gray-600 text-sm truncate">
                            {fileName || 'No file selected'}
                        </span>
                    </div>
                    {!currentProject && <p className="text-red-500 text-xs italic mt-1">Please load/create first to upload file.</p>}
                </div>

                {/* Project Files List */}
                <div className="project-files-container mb-6">
                    <p className="section-label text-sm font-medium text-gray-700 mb-2">Project Files</p>
                    {projectFiles.length === 0 ? (
                        <p className="no-files-message text-gray-600 italic text-sm">No files in project. Upload an Excel file.</p>
                    ) : (
                        <div className="project-files border border-gray-300 rounded p-2 max-h-40 overflow-y-auto">
                            {projectFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className={`file-item flex items-center justify-between p-2 rounded mb-1 hover:bg-gray-200 ${selectedFileIndex === index ? 'bg-blue-100' : ''}`}
                                >
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={file.selected}
                                            onChange={() => toggleFileSelection(index)}
                                            className="mr-2"
                                        />
                                        <span
                                            className="file-name cursor-pointer"
                                            onClick={() => handleSelectFile(index)}
                                        >
                                            {file.name}
                                            {loadingSheets && selectedFileIndex === index && (
                                                <span className="ml-2 inline-block">
                                                    <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(file.added_date).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sheet List with Options */}
                <div className="sheets-container flex-grow flex flex-col">
                    <p className="section-label text-sm font-medium text-gray-700 mb-2">Available Sheets</p>

                    {sheets.length === 0 ? (
                        <p className="no-sheets-message text-gray-600 italic text-sm">No sheets available. Please select or upload an Excel file.</p>
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
                                                {sheet.options.map((option, index) => (
                                                    <option key={index} value={option}>
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

                    {sheets.length > 0 || projectFiles.some(f => f.selected) ? (
                        <div>
                            <button
                                className="process-button mt-4 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                onClick={handleProcessSheets}
                                disabled={processing || !currentProject || loading}
                            >
                                {processing ? 'Processing...' : 'Process Files'}
                            </button>
                            <br></br>
                            <button
                                className="process-button mt-4 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                onClick={handleGenerateDocuments}
                                disabled={generating || !currentProject || loading}
                            >
                                {generating ? 'Asking LLM...' : 'Generate Documents'}
                            </button>
                            {!currentProject && <p className="text-red-500 text-xs italic mt-1">Please start a session first to process or generate documents.</p>}
                        </div>
                    ) : null}
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
                                : 'Upload or select an Excel file to see preview'}
                        </p>
                    </div>
                )}

                {processingResults && (
                    <div className="processing-results mt-6">
                        <h3 className="text-lg font-semibold mb-2">Processing Results</h3>
                        <p>Project ID: {processingResults.project_id}</p>
                        <p>Status: {processingResults.status}</p>
                        <ul className="list-disc pl-5">
                            {Object.entries(processingResults.results).map(([fileName, fileResults], fileIndex) => (
                                <li key={fileIndex} className="mb-2">
                                    <strong className="font-medium">{fileName}:</strong>
                                    <ul>
                                        {Object.entries(fileResults).map(([sheetName, sheetResult], sheetIndex) => (
                                            <li key={`${fileIndex}-${sheetIndex}`}>
                                                <strong className="font-medium ml-4">{sheetName}:</strong> <span className="text-sm">
                                                    {sheetResult.status === 'success'
                                                        ? `Processed as ${sheetResult.type}, output in: ${sheetResult.output_path}`
                                                        : `Error: ${sheetResult.message}`}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
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
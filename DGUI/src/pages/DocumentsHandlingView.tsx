import React, { useState, useRef } from 'react';
import { Project } from 'src/components/DocumentsHandling/ProjectManagingMenu';
import * as XLSX from 'xlsx';

interface SheetOption {
    name: string;
    selected: boolean;
    options: string[];
    selectedOption: string;
}

interface DocumentsHandlingProps {
    switchTab: (tabIndex: number) => void;
    project: Project;
}

const DocumentsHandling: React.FC<DocumentsHandlingProps> = ({ switchTab, project }) => {
    const [fileName, setFileName] = useState<string>('');
    const [sheets, setSheets] = useState<SheetOption[]>([]);
    const [previewData, setPreviewData] = useState<any[][]>([]);
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
    const [currentPreviewSheet, setCurrentPreviewSheet] = useState<string>('');
    const [processing, setProcessing] = useState<boolean>(false);
    const [processingResults, setProcessingResults] = useState<any>(null);
    const [generating, setGenerating] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const workbookRef = useRef<XLSX.WorkBook | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!project) {
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

            const uploadResponse = await fetch('http://localhost:5000/upload-excel', {
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

            const sheetsResponse = await fetch(`http://localhost:5000/get-sheets`, {
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
            if (project) {
                project.base_dir = uploadResult.output_folder;
            }

        } catch (error) {
            console.error('Error handling file:', error);
            alert(error instanceof Error ? error.message : 'An unknown error occurred during file upload.');
            setFileName('');
            setSheets([]);
        }
    };

    const handlePreviewSheet = async (sheetName: string) => {
        try {
            const sheetsResponse = await fetch(`http://localhost:5000/get-sheets`, {
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
                const binaryString = e.target?.result;
                const workbook = XLSX.read(binaryString, { type: 'binary' });
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
            reader.readAsBinaryString(fileInput);


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
        if (!project) {
            alert('Please create/load a project first.');
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
            sheets: selectedSheetTypes
        };

        try {
            setProcessing(true);
            setProcessingResults(null);

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
        if (!project) {
            alert('Please load or create a project first.');
        }

        try {
            setGenerating(true);
            const response = await fetch('http://localhost:5000/generate-all-documents', {
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

            // alert(`Documents generated successfully! ${result.count} file(s) created in ${result.output_dir}`);
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
        <div className="flex h-full">
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
                            disabled={!project}
                        >
                            Select File
                        </button>
                        <span className="file-name text-gray-600 text-sm truncate">
                            {fileName || 'No file selected'}
                        </span>
                    </div>
                    {!project && <p className="text-red-500 text-xs italic mt-1">Please load/create first to upload file.</p>}
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
                                disabled={processing || !project}
                            >
                                {processing ? 'Processing...' : 'Process Selected Sheets'}
                            </button>
                            <br></br>
                            <button
                                className="process-button mt-4 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                onClick={handleGenerateDocuments}
                                disabled={generating || !project}
                            >
                                {generating ? 'Asking LLM...' : 'Generate Documents'}
                            </button>
                            {!project && <p className="text-red-500 text-xs italic mt-1">Please start a session first to process or generate documents.</p>}
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
                        <p>Project ID: {processingResults.project_id}</p>
                        <p>Status: {processingResults.status}</p>
                        <ul className="list-disc pl-5">
                            {Object.entries(processingResults.results).map(([fileName, fileResults]) => (
                                <li key={fileName} className="mb-2">
                                    <strong className="font-medium">{fileName}:</strong>
                                    <ul>
                                        {Object.entries(fileResults).map(([sheetName, sheetResult]) => (
                                            <li key={sheetName}>
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
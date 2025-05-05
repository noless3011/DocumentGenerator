import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useProjects } from '../provider/ProjectProvider';

import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Box,
    CircularProgress
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';


interface SheetOption {
    name: string;
    selected: boolean;
    options: string[];
    selectedOption: string;
}

interface DocumentsHandlingProps {
}

interface ProjectFile {
    path: string;
    name: string;
    added_date: string;
    selected?: boolean;
}

const DocumentsHandlingMenu: React.FC<DocumentsHandlingProps> = () => {
    const [open, setOpen] = useState(false);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const { currentProject, loading: projectLoading } = useProjects();
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

    useEffect(() => {
        if (open && currentProject && currentProject.files && currentProject.files.input) {
            const files = currentProject.files.input.map((file: any) => ({
                path: file.path,
                name: file.name,
                added_date: file.added_date,
                selected: projectFiles.find(pf => pf.path === file.path)?.selected ?? false
            }));
            setProjectFiles(files);

            if (selectedFileIndex !== -1) {
                const currentSelectedPath = projectFiles[selectedFileIndex]?.path;
                const newIndex = files.findIndex(f => f.path === currentSelectedPath);
                setSelectedFileIndex(newIndex);
                if (newIndex === -1) {
                    setFileName('');
                    setSheets([]);
                    setPreviewData([]);
                    setPreviewHeaders([]);
                    setCurrentPreviewSheet('');
                }
            }

        } else if (!currentProject) {
            setProjectFiles([]);
            setSelectedFileIndex(-1);
            setFileName('');
            setSheets([]);
            setPreviewData([]);
            setPreviewHeaders([]);
            setCurrentPreviewSheet('');
        }
    }, [currentProject, open]);


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
        setCurrentPreviewSheet('');
        setSelectedFileIndex(-1);

        try {
            setLoadingSheets(true);

            const formData = new FormData();
            formData.append('file', file);
            console.log('Uploading file:', formData);
            const uploadResponse = await fetch('http://localhost:5000/files/upload-excel', {
                method: 'POST',
                body: formData,
                mode: 'cors',
            });

            if (!uploadResponse.ok) {
                const errorResult = await uploadResponse.json();
                throw new Error(errorResult.error || `Failed to upload file: ${uploadResponse.status}`);
            }

            const uploadResult = await uploadResponse.json();

            const sheetsResponse = await fetch(`http://localhost:5000/files/get-sheets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: uploadResult.output_folder + "/" + file.name }),
                mode: 'cors',
            });


            if (!sheetsResponse.ok) {
                const errorResult = await sheetsResponse.json();
                throw new Error(errorResult.error || `Failed to get sheet names: ${sheetsResponse.status}`);
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
                await handlePreviewSheet(sheetOptions[0].name, uploadResult.output_folder + "/" + file.name);
                setCurrentPreviewSheet(sheetOptions[0].name);
            }
            alert('File uploaded and sheets loaded successfully!');

            const now = new Date().toISOString();
            const newFileEntry: ProjectFile = {
                path: uploadResult.output_folder + "/" + file.name,
                name: file.name,
                added_date: now,
                selected: false
            };
            setProjectFiles(prevFiles => [...prevFiles, newFileEntry]);

        } catch (error) {
            console.error('Error handling file:', error);
            alert(error instanceof Error ? error.message : 'An unknown error occurred during file upload.');
            setFileName('');
            setSheets([]);
        } finally {
            setLoadingSheets(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSelectFile = async (index: number) => {
        if (index === selectedFileIndex) return;

        setSelectedFileIndex(index);
        const file = projectFiles[index];
        setFileName(file.name);
        setLoadingSheets(true);
        setSheets([]);
        setPreviewData([]);
        setPreviewHeaders([]);
        setCurrentPreviewSheet('');

        try {
            const sheetsResponse = await fetch(`http://localhost:5000/files/get-sheets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: file.path }),
                mode: 'cors',
            });

            if (!sheetsResponse.ok) {
                const errorResult = await sheetsResponse.json();
                throw new Error(errorResult.error || `Failed to get sheet names: ${sheetsResponse.status}`);
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
                await handlePreviewSheet(sheetOptions[0].name, file.path);
                setCurrentPreviewSheet(sheetOptions[0].name);
            } else {
                alert(`No sheets found in ${file.name}.`);
            }
        } catch (error) {
            console.error('Error loading file sheets:', error);
            alert(error instanceof Error ? error.message : 'An error occurred loading the file sheets');
            setFileName('');
            setSelectedFileIndex(-1);
        } finally {
            setLoadingSheets(false);
        }
    };

    const toggleFileSelection = (index: number) => {
        setProjectFiles(prevFiles =>
            prevFiles.map((file, i) =>
                i === index ? { ...file, selected: !file.selected } : file
            )
        );
    };

    const handlePreviewSheet = async (sheetName: string, filePath?: string) => {
        const targetFilePath = filePath ?? (selectedFileIndex >= 0 ? projectFiles[selectedFileIndex].path : null);

        if (!targetFilePath) {
            alert("Could not determine the file path for preview.");
            console.error("Preview error: File path is missing.", { selectedFileIndex, projectFiles });
            return;
        }

        setPreviewData([]);
        setPreviewHeaders([]);
        setCurrentPreviewSheet(sheetName);

        try {
            const response = await fetch(`http://localhost:5000/files/preview-sheet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: targetFilePath, sheetName: sheetName }),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Failed to get sheet data for preview: ${response.status}`);
            }

            const result = await response.json();
            setPreviewHeaders(result.headers || []);
            setPreviewData(result.data || []);

        } catch (error) {
            console.error('Error previewing sheet:', error);
            alert(error instanceof Error ? error.message : 'An error occurred while trying to preview the sheet.');
            setPreviewHeaders([]);
            setPreviewData([]);
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

        let relevantFilePath: string | null = null;
        if (selectedFileIndex !== -1) {
            relevantFilePath = projectFiles[selectedFileIndex].path;
        } else if (fileName && !selectedFileIndex) {
            const uploadedFile = projectFiles.find(f => f.name === fileName);
            relevantFilePath = uploadedFile?.path ?? null;
            if (!relevantFilePath) {
                alert("Could not determine the path of the file to process. Please select it from the list.");
                return;
            }
        }

        const fileToProcess = projectFiles.find(f => f.path === relevantFilePath);

        if (!fileToProcess) {
            alert('No file selected or identified for processing.');
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

        const processPayload = {
            files: [{
                path: fileToProcess.path,
                name: fileToProcess.name,
                sheets: selectedSheetTypes
            }]
        };

        try {
            setProcessing(true);
            setProcessingResults(null);

            const response = await fetch('http://localhost:5000/files/process-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(processPayload),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Sheet processing failed: ${response.status}`);
            }

            const result = await response.json();
            setProcessingResults(result);
            alert('File processed successfully!');

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
        if (!processingResults) {
            alert('Please process the files first before generating documents.');
            return;
        }

        try {
            setGenerating(true);
            const response = await fetch('http://localhost:5000/generate/all-documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Document generation failed: ${response.status}`);
            }

            const result = await response.json();
            console.log("Generate Documents Result:", result);

            alert('Documents generated successfully! Check the output tab.');
            handleClose();

        } catch (error) {
            console.error('Error generating documents:', error);
            alert(error instanceof Error ? error.message : 'Failed to generate documents. Check console for details.');
        } finally {
            setGenerating(false);
        }
    };

    const canProcess = sheets.length > 0 && sheets.some(s => s.selected) && (selectedFileIndex !== -1 || fileName);
    const canGenerate = !!processingResults;


    return (
        <>
            <Button
                variant="text"
                color="inherit"
                onClick={handleOpen}
                startIcon={<UploadFileIcon />}
                sx={{ mr: 1 }}
            >
                Sources
            </Button>

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="xl"
                fullWidth
            >
                <DialogTitle sx={{ pb: 1 }}>
                    Excel Document Handling
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 0, m: 0, maxHeight: '80vh' }}>
                    <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-1/3 p-4 bg-gray-100 border-r border-gray-200 flex flex-col max-h-[75vh] overflow-y-auto">
                            <div className="upload-container mb-4">
                                <p className="section-label text-sm font-medium text-gray-700 mb-1">1. Upload or Select File</p>
                                <div className="button-row flex items-center space-x-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".xlsx, .xls, .xlsb, .csv"
                                        className="file-input hidden"
                                        disabled={projectLoading || loadingSheets}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="primary-button bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm focus:outline-none focus:shadow-outline disabled:opacity-50"
                                        disabled={!currentProject || projectLoading || loadingSheets}
                                    >
                                        {loadingSheets && !selectedFileIndex ? 'Uploading...' : 'Upload New'}
                                    </button>
                                    <span className="file-name text-gray-600 text-sm truncate flex-1">
                                        {fileName || 'No file selected/uploaded'}
                                    </span>
                                </div>
                                {!currentProject && <p className="text-red-500 text-xs italic mt-1">Load/create project first.</p>}
                            </div>

                            <div className="project-files-container mb-4">
                                <p className="section-label text-sm font-medium text-gray-700 mb-1">Project Input Files</p>
                                {projectLoading ? (
                                    <CircularProgress size={20} />
                                ) : projectFiles.length === 0 ? (
                                    <p className="no-files-message text-gray-600 italic text-sm">No input files in project.</p>
                                ) : (
                                    <div className="project-files border border-gray-300 rounded p-2 max-h-40 overflow-y-auto">
                                        {projectFiles.map((file, index) => (
                                            <div
                                                key={file.path || index}
                                                className={`file-item flex items-center justify-between p-1 rounded mb-1 hover:bg-gray-200 cursor-pointer ${selectedFileIndex === index ? 'bg-blue-200 font-semibold' : ''}`}
                                                onClick={() => handleSelectFile(index)}
                                            >
                                                <div className="flex items-center flex-1 overflow-hidden mr-2">
                                                    <span className="file-name truncate" title={file.name}>
                                                        {file.name}
                                                        {loadingSheets && selectedFileIndex === index && (
                                                            <span className="ml-2 inline-block">
                                                                <CircularProgress size={14} thickness={5} />
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500 flex-shrink-0">
                                                    {new Date(file.added_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="sheets-container flex-grow flex flex-col mb-4">
                                <p className="section-label text-sm font-medium text-gray-700 mb-1">2. Configure Sheets for: <span className='font-bold'>{fileName || '...'}</span></p>
                                {!fileName && !selectedFileIndex ? (
                                    <p className="no-sheets-message text-gray-600 italic text-sm">Upload or select a file first.</p>
                                ) : loadingSheets ? (
                                    <div className='flex items-center justify-center p-4'><CircularProgress size={24} /></div>
                                ) : sheets.length === 0 && (fileName || selectedFileIndex !== -1) ? (
                                    <p className="no-sheets-message text-gray-600 italic text-sm">No sheets found in the selected file.</p>
                                ) : sheets.length > 0 ? (
                                    <ul className="sheets-list overflow-y-auto border border-gray-300 rounded p-2 max-h-60">
                                        {sheets.map((sheet, index) => (
                                            <li
                                                key={sheet.name}
                                                className={`sheet-item flex items-center justify-between p-1.5 rounded hover:bg-gray-200 mb-1 last:mb-0 ${sheet.name === currentPreviewSheet ? 'bg-green-100' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={sheet.selected}
                                                    onChange={() => handleSheetSelectionChange(index)}
                                                    className="sheet-checkbox form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-2 flex-shrink-0"
                                                    id={`sheet-check-${index}`}
                                                />
                                                <div className="sheet-details flex-1 flex items-center justify-between overflow-hidden">
                                                    <label htmlFor={`sheet-check-${index}`} className="sheet-name text-sm font-medium text-gray-800 truncate cursor-pointer flex-grow mr-2" title={sheet.name}>
                                                        {sheet.name}
                                                    </label>
                                                    <div className="sheet-actions flex items-center space-x-1 flex-shrink-0">
                                                        <select
                                                            value={sheet.selectedOption}
                                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                                            className="sheet-options-select block appearance-none w-auto bg-white border border-gray-300 hover:border-gray-400 px-2 py-0.5 rounded shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs disabled:opacity-50 disabled:bg-gray-200"
                                                            disabled={!sheet.selected || processing || generating}
                                                            title="Select processing type (UI or Table)"
                                                        >
                                                            {sheet.options.map((option) => (
                                                                <option key={option} value={option}>
                                                                    {option}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => handlePreviewSheet(sheet.name)}
                                                            className="preview-sheet-button bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                                            title="Preview this sheet"
                                                            disabled={processing || generating || loadingSheets}
                                                        >
                                                            Preview
                                                        </button>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>

                            <div className="actions-container mt-auto pt-4 border-t border-gray-300">
                                <p className="section-label text-sm font-medium text-gray-700 mb-2">3. Process & Generate</p>
                                <div className='space-y-2'>
                                    <button
                                        className="process-button w-full bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleProcessSheets}
                                        disabled={!canProcess || processing || generating || projectLoading || loadingSheets}
                                        title={!canProcess ? "Select a file and sheets first" : "Process selected sheets"}
                                    >
                                        {processing ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Processing...</> : 'Process Selected File'}
                                    </button>
                                    {processingResults && !processing && (
                                        <div className="text-xs p-2 bg-green-100 border border-green-300 rounded">
                                            <p className="font-semibold text-green-800">Processing Complete:</p>
                                            <p>{processingResults.status === 'success' ? `File ${processingResults.results ? Object.keys(processingResults.results)[0] : ''} processed.` : `Processing failed.`}</p>
                                        </div>
                                    )}
                                    <button
                                        className="generate-button w-full bg-purple-600 hover:bg-purple-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleGenerateDocuments}
                                        disabled={!canGenerate || generating || processing || projectLoading}
                                        title={!canGenerate ? "Process files first" : "Generate documents from processed data"}
                                    >
                                        {generating ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Generating...</> : 'Generate Documents'}
                                    </button>
                                </div>
                                {!currentProject && <p className="text-red-500 text-xs italic mt-1">Project needed to process/generate.</p>}
                            </div>
                        </div>

                        <div className="w-full md:w-2/3 p-4 bg-white flex flex-col max-h-[75vh] overflow-y-auto">
                            <h2 className="panel-title text-lg font-semibold mb-2 sticky top-0 bg-white z-10">
                                Preview: <span className='font-bold'>{currentPreviewSheet || '...'}</span>
                            </h2>

                            {previewData.length > 0 ? (
                                <div className="table-container overflow-auto shadow-md rounded border border-gray-200 flex-grow">
                                    <table className="preview-table min-w-full leading-normal text-xs">
                                        <thead className='sticky top-0 bg-gray-100 z-10'>
                                            <tr>
                                                {previewHeaders.map((header, index) => (
                                                    <th key={index} className="table-header px-3 py-2 border-b-2 border-gray-200 bg-gray-100 text-left font-semibold text-gray-600 uppercase tracking-wider">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((row, rowIndex) => (
                                                <tr key={rowIndex} className="hover:bg-gray-50">
                                                    {previewHeaders.map((_, cellIndex) => (
                                                        <td key={cellIndex} className="table-cell px-3 py-1.5 border-b border-gray-200 bg-white whitespace-nowrap overflow-hidden text-ellipsis" title={row[cellIndex]?.toString() ?? ''}>
                                                            {row[cellIndex]?.toString() ?? ''}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-preview flex justify-center items-center h-full flex-grow bg-gray-50 rounded">
                                    <p className="empty-message text-gray-500 italic text-center">
                                        {loadingSheets ? <CircularProgress /> :
                                            fileName ? `Select a sheet or click 'Preview' to load data.` :
                                                projectLoading ? 'Loading project...' :
                                                    'Upload or select an Excel file from the list to see preview.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>

                <DialogActions sx={{ justifyContent: 'flex-start', px: 3, py: 2 }}>
                    <Button onClick={handleClose} color="primary" variant="outlined">
                        Close Window
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DocumentsHandlingMenu;
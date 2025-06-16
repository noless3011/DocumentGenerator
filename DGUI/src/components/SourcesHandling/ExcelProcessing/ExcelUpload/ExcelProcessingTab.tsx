import { Box, Typography, Card, CardContent, Alert, CircularProgress } from "@mui/material";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ProjectFile } from "../../../../models/ProjectFile";
import { SheetOption } from "../../../../models/SourceFile";
import { useProjectContext } from "../../../../provider/ProjectProvider";
import { useProjects } from "../../../../provider/ProjectProvider";
import ExcelFilesList from "./ExcelFileList";
import ExcelUploadSection from "./ExcelUploadSection";
import SheetProcessingSection from "./SheetProcessingSection";
import ProcessingResultsSection from "../Processing/ProcessingResultsSection";
import ProcessingActions from "../Processing/ProcessingActions";

interface ExcelProcessingTabProps {
    onError?: (error: string | null) => void;
}

const ExcelProcessingTab: React.FC<ExcelProcessingTabProps> = ({ onError }) => {
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [selectedFileIndex, setSelectedFileIndex] = useState(-1);
    const [sheets, setSheets] = useState<SheetOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSheets, setLoadingSheets] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [processing, setProcessing] = useState(false); const [generating, setGenerating] = useState(false);
    const [previewData, setPreviewData] = useState<any[][]>([]);
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
    const [currentPreviewSheet, setCurrentPreviewSheet] = useState<string>('');
    const [pendingFileToSelect, setPendingFileToSelect] = useState<string | null>(null);

    // Project context
    const { currentProject, loading: projectLoading } = useProjects();
    const { projectFiles, uploadFile, deleteFileFromFolder, getProjectDetails } = useProjectContext();
    const currentProjectRef = useRef(currentProject);

    // Update ref when currentProject changes
    useEffect(() => {
        currentProjectRef.current = currentProject;
    }, [currentProject]);

    // File type configurations
    const excelTypes = ['.xlsx', '.xls'];

    // Filter files by type
    const excelFiles = useMemo(() => {
        return projectFiles.filter(file =>
            excelTypes.some(type => file.name.toLowerCase().endsWith(type))
        );
    }, [projectFiles]);    // Load files when component mounts or project changes
    useEffect(() => {
        if (currentProject) {
            setFiles(excelFiles);
        }
    }, [excelFiles, currentProject]);    // Handle pending file selection after upload
    useEffect(() => {
        if (pendingFileToSelect && files.length > 0) {
            const uploadedFileIndex = files.findIndex(f => f.name === pendingFileToSelect);
            if (uploadedFileIndex !== -1) {
                // Call handleFileSelect directly without dependencies to avoid useEffect issues
                setSelectedFileIndex(uploadedFileIndex);
                const file = files[uploadedFileIndex];
                setLoadingSheets(true);
                setSheets([]);
                setPreviewData([]);
                setPreviewHeaders([]);
                setCurrentPreviewSheet('');
                onError?.(null);

                // Load sheets for the selected file
                (async () => {
                    try {
                        const response = await fetch(`http://localhost:5000/files/get-sheets`, {
                            method: 'POST',
                        });

                        if (!response.ok) {
                            throw new Error('Failed to load sheets');
                        }

                        const data = await response.json();
                        const fileSheets = data.sheets_per_file?.[file.name] || [];
                        const sheetOptions = fileSheets.map((sheetName: string) => ({
                            name: sheetName,
                            selected: false,
                            selectedOption: 'table' as const
                        }));

                        setSheets(sheetOptions);
                    } catch (error) {
                        console.error('Error loading sheets:', error);
                        onError?.('Failed to load Excel sheets');
                    } finally {
                        setLoadingSheets(false);
                    }
                })();

                setPendingFileToSelect(null);
            }
        }
    }, [files, pendingFileToSelect, onError]);
    const handleFileUpload = async (file: File) => {
        if (!currentProject) {
            onError?.('No project selected');
            return;
        }

        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!excelTypes.includes(fileExtension)) {
            onError?.(`File type ${fileExtension} is not supported for Excel processing.`);
            return;
        }

        setLoading(true);
        onError?.(null);

        try {
            // Use unified upload endpoint
            const formData = new FormData();
            formData.append('file', file);
            formData.append('file_type', 'excel');
            formData.append('target_folder', 'input');

            const response = await fetch(`http://localhost:5000/files/upload-unified`, {
                method: 'POST',
                body: formData,
            }); if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Upload failed');
            }            // Refresh project data to get updated file list
            await getProjectDetails();

            // Set the file name to be selected once the files array is updated
            setPendingFileToSelect(file.name);
        } catch (error) {
            console.error('Error uploading Excel file:', error);
            onError?.(`Failed to upload ${file.name}. Please try again.`);
        } finally {
            setLoading(false);
        }
    }; const handleFileSelect = async (index: number) => {
        if (index === selectedFileIndex) return;

        setSelectedFileIndex(index);
        const file = files[index];
        setLoadingSheets(true);
        setSheets([]);
        setPreviewData([]);
        setPreviewHeaders([]);
        setCurrentPreviewSheet('');
        onError?.(null);

        try {
            // Call API to get sheet names
            const response = await fetch(`http://localhost:5000/files/get-sheets`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to load sheets');
            }

            const data = await response.json();

            // Find sheets for the selected file
            const fileSheets = data.sheets_per_file?.[file.name] || [];

            // Convert to SheetOption format
            const sheetOptions: SheetOption[] = fileSheets.map((sheetName: string) => ({
                name: sheetName,
                selected: false,
                selectedOption: 'table' as const
            }));

            setSheets(sheetOptions);
        } catch (error) {
            console.error('Error loading sheets:', error);
            onError?.('Failed to load Excel sheets');
        } finally {
            setLoadingSheets(false);
        }
    }; const handleFileDelete = async (fileName: string) => {
        try {
            const response = await fetch(`http://localhost:5000/files/delete/input/${encodeURIComponent(fileName)}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Delete failed');
            }

            setFiles(prev => prev.filter(f => f.name !== fileName));
            if (selectedFileIndex >= files.length - 1) {
                setSelectedFileIndex(-1);
                setSheets([]);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            onError?.(`Failed to delete ${fileName}. Please try again.`);
        }
    };

    const handleSheetSelectionChange = (index: number) => {
        setSheets(prev => prev.map((sheet, i) =>
            i === index ? { ...sheet, selected: !sheet.selected } : sheet
        ));
    };

    const handleOptionChange = (sheetIndex: number, option: string) => {
        setSheets(prev => prev.map((sheet, i) =>
            i === sheetIndex ? { ...sheet, selectedOption: option as 'table' | 'ui' } : sheet
        ));
    }; const handleSheetPreview = async (sheetName: string) => {
        const targetFilePath = selectedFileIndex >= 0 ? files[selectedFileIndex].path : null;

        if (!targetFilePath) return;

        setPreviewData([]);
        setPreviewHeaders([]);
        setCurrentPreviewSheet(sheetName);
        onError?.(null);

        try {
            // Call API to get sheet preview data
            const response = await fetch(`http://localhost:5000/files/preview-sheet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filePath: targetFilePath,
                    sheetName: sheetName
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to preview sheet');
            }

            const data = await response.json();
            setPreviewHeaders(data.headers || []);
            setPreviewData(data.data || []);
        } catch (error) {
            console.error('Error previewing sheet:', error);
            onError?.('Failed to preview sheet');
        }
    }; const handleProcess = async () => {
        if (!currentProject) return;

        let relevantFilePath: string | null = null;
        if (selectedFileIndex !== -1) {
            relevantFilePath = files[selectedFileIndex].path;
        }

        const fileToProcess = files.find(f => f.path === relevantFilePath);

        if (!fileToProcess) {
            onError?.('No file selected for processing');
            return;
        }

        const selectedSheetTypes = sheets.reduce((acc, sheet) => {
            if (sheet.selected) {
                acc[sheet.name] = sheet.selectedOption;
            }
            return acc;
        }, {} as Record<string, string>);

        if (Object.keys(selectedSheetTypes).length === 0) {
            onError?.('No sheets selected for processing');
            return;
        } const processPayload = {
            files: [{
                path: fileToProcess.path,
                name: fileToProcess.name,
                sheets: selectedSheetTypes
            }]
        };

        try {
            setProcessing(true);
            onError?.(null);
            const response = await fetch(`http://localhost:5000/files/process-excel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(processPayload),
            });

            if (!response.ok) {
                let errorMessage = 'Processing failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const results = await response.json();
            setResults(results);
        } catch (error) {
            console.error('Error processing sheets:', error);
            onError?.(`Failed to process sheets: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    }; const handleStop = () => {
        setProcessing(false);
    };

    const handleGenerateDocuments = async () => {
        if (!currentProject) return;
        if (!results) return;

        try {
            setGenerating(true);
            onError?.(null);

            // Call document generation API
            const response = await fetch(`http://localhost:5000/generate/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_id: currentProject.id,
                    processing_results: results
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Document generation failed');
            }

            const generationResults = await response.json();
            console.log('Document generation completed:', generationResults);
        } catch (error) {
            console.error('Error generating documents:', error);
            onError?.(`Failed to generate documents: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const canProcess = sheets.length > 0 && sheets.some(s => s.selected) && selectedFileIndex !== -1;
    const canGenerate = !!results; return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ExcelUploadSection
                onFileUpload={handleFileUpload}
                disabled={!currentProject || loading}
            />

            <ExcelFilesList
                files={files}
                selectedIndex={selectedFileIndex}
                onFileSelect={handleFileSelect}
                onFileDelete={handleFileDelete}
            />

            {sheets.length > 0 && (
                <SheetProcessingSection
                    sheets={sheets}
                    loading={loadingSheets}
                    onSheetSelectionChange={handleSheetSelectionChange}
                    onOptionChange={handleOptionChange}
                    onSheetPreview={handleSheetPreview}
                    previewData={previewData}
                    previewHeaders={previewHeaders}
                    currentPreviewSheet={currentPreviewSheet}
                />
            )}

            <ProcessingActions
                onProcess={handleProcess}
                onStop={handleStop}
                onGenerate={handleGenerateDocuments}
                isProcessing={processing}
                isGenerating={generating}
                canProcess={canProcess}
                canGenerate={canGenerate}
                disabled={loading}
            />

            <ProcessingResultsSection results={results} />
        </Box>
    );
};

export default ExcelProcessingTab;
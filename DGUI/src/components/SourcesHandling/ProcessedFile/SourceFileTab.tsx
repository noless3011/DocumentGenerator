import { Box, Typography, Alert, CircularProgress, Card, CardContent } from "@mui/material";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SourceFile } from "../../../models/SourceFile";
import { useProjectContext } from "../../../provider/ProjectProvider";
import { useProjects } from "../../../provider/ProjectProvider";
import SourceUploadSection from "./SourceUploadSection";
import SourceFilesList from "./SourceFilesList";
import FilePreviewSection from "../ExcelProcessing/Preview/FilePreviewSection";
import { Car } from "lucide-react/dist/lucide-react";
import { bold } from "@uiw/react-md-editor/lib";
import { get } from "http";

interface SourceFilesTabProps {
    onError?: (error: string | null) => void;
}

const SourceFilesTab: React.FC<SourceFilesTabProps> = ({ onError }) => {
    const [files, setFiles] = useState<SourceFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<SourceFile | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingProcessed, setLoadingProcessed] = useState(false);    // Project context
    const { currentProject, getProcessedFiles } = useProjects();
    const currentProjectRef = useRef(currentProject);
    const onErrorRef = useRef(onError);
    const getProcessedFilesRef = useRef(getProcessedFiles);

    // Update refs when values change
    useEffect(() => {
        currentProjectRef.current = currentProject;
    }, [currentProject]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        getProcessedFilesRef.current = getProcessedFiles;
    }, [getProcessedFiles]);

    // Stable error handler that doesn't cause re-renders
    const stableOnError = useCallback((error: string | null) => {
        onErrorRef.current?.(error);
    }, []); // No dependencies - completely stable

    // File type configurations
    const sourceTypes = ['.txt', '.csv', '.png', '.jpg', '.jpeg']; useEffect(() => {
        const fetchFiles = async () => {
            if (!currentProjectRef.current) return;

            setLoadingProcessed(true);
            stableOnError?.(null);

            try {
                const processedFile = await getProcessedFilesRef.current();
                console.log("Processed files:", processedFile);
                console.log("Project", currentProjectRef.current);
                setFiles(processedFile || []);
            } catch (error) {
                console.error('Error fetching processed files:', error);
                stableOnError?.('Failed to load processed files');
            } finally {
                setLoadingProcessed(false);
            }
        };

        fetchFiles();
    }, [stableOnError]); // Only depend on stableOnError, use refs for the rest

    const handleFilesUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        if (!currentProjectRef.current) {
            stableOnError?.('No project selected');
            return;
        }

        setLoading(true);
        stableOnError?.(null);

        for (const file of Array.from(files)) {
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

            if (!sourceTypes.includes(fileExtension)) {
                stableOnError?.(`File type ${fileExtension} is not supported for source files. Please upload ${sourceTypes.join(', ')} files.`);
                continue;
            }

            try {
                // Use unified upload endpoint
                const formData = new FormData();
                console.log("Uploading file:", file);
                formData.append('file', file);
                formData.append('file_type', 'source');
                formData.append('target_folder', 'processed');

                const response = await fetch(`http://localhost:5000/files/upload-unified`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Upload failed');
                }

            } catch (error) {
                console.error('Error uploading source file:', error);
                stableOnError?.(`Failed to upload ${file.name}. Please try again.`);
            }
        } setLoading(false);        // Refresh the file list after upload
        try {
            const processedFiles = await getProcessedFilesRef.current();
            setFiles(processedFiles || []);
        } catch (error) {
            console.error('Error refreshing file list:', error);
        }

        // Clear input
        if (event.target) {
            event.target.value = '';
        }
    }, []);

    const handleFileSelect = useCallback(async (file: SourceFile) => {
        try {
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            const updatedFile: SourceFile = { ...file };

            // For text files, load content via API
            if (fileExtension === '.txt' || fileExtension === '.csv') {
                try {
                    const response = await fetch(`http://localhost:5000/files/preview-source`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            file_path: file.path || '',
                            file_name: file.name,
                            folder: 'processed'
                        }),
                    });

                    if (response.ok) {
                        const previewData = await response.json();
                        updatedFile.content = previewData.content;
                    }
                } catch (error) {
                    console.error('Error loading file content:', error);
                    updatedFile.content = 'Error loading content';
                }
            }

            setSelectedFile(updatedFile);
        } catch (error) {
            console.error('Error previewing file:', error);
            stableOnError?.('Failed to preview file');
        }
    }, [stableOnError]); const handleFileDelete = useCallback(async (file: SourceFile) => {
        try {
            const response = await fetch(`http://localhost:5000/files/delete/processed/${encodeURIComponent(file.name)}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Delete failed');
            }            // Refresh the file list after successful deletion
            const processedFiles = await getProcessedFilesRef.current();
            setFiles(processedFiles || []);

            if (selectedFile?.name === file.name) {
                setSelectedFile(null);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            stableOnError?.(`Failed to delete ${file.name}. Please try again.`);
        }
    }, [selectedFile, stableOnError]); // Remove getProcessedFiles dependency

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                    Source File Management
                </Typography>

                <SourceUploadSection
                    onFilesUpload={handleFilesUpload}
                    acceptedTypes={sourceTypes}
                    disabled={!currentProject || loading}
                />
            </Box>
            <Card className="w-full h-[675px] flex flex-row">
                <CardContent className="w-1/3 h-full overflow-y-scroll">
                    <SourceFilesList
                        files={files}
                        loading={loadingProcessed}
                        onFileSelect={handleFileSelect}
                        onFileDelete={handleFileDelete}
                    />
                </CardContent>
                <CardContent className="w-2/3 h-full">
                    <FilePreviewSection selectedFile={selectedFile} />
                </CardContent>
            </Card>



        </Box>
    );
};

export default SourceFilesTab;
import React, { useEffect, useState } from 'react';
import { AlertCircle, FileText, RefreshCw, ExternalLink } from 'lucide-react';
import { useProjects } from '../../provider/ProjectProvider';

interface PreviewAppViewProps {
    fileDir?: string;
    setLoading?: (loading: boolean) => void;
}

interface HtmlFile {
    filename: string;
    path: string;
    size: number;
    url: string;
}

interface ProjectFilesResponse {
    project_id: string;
    html_files: HtmlFile[];
    count: number;
}

const PreviewAppView: React.FC<PreviewAppViewProps> = ({ fileDir, setLoading }) => {
    const [htmlFiles, setHtmlFiles] = useState<HtmlFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<HtmlFile | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { currentProject } = useProjects();

    // Extract project ID from fileDir path
    const getProjectId = (filePath: string): string | null => {
        return currentProject?.id || null;
    };

    const projectId = getProjectId(fileDir || '');

    const loadHtmlFiles = async () => {
        if (!projectId) {
            setError("No valid project directory specified");
            return;
        }

        if (setLoading) setLoading(true);
        setError(null);

        try {
            const response = await fetch(`http://localhost:5000/serve/projects/${projectId}/files`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to load HTML files: ${response.statusText}`);
            }

            const data: ProjectFilesResponse = await response.json();
            setHtmlFiles(data.html_files);

            // Auto-select the first HTML file if available
            if (data.html_files.length > 0 && !selectedFile) {
                selectFile(data.html_files[0]);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load HTML files');
            console.error('Error loading HTML files:', err);
        } finally {
            if (setLoading) setLoading(false);
        }
    };

    const selectFile = (file: HtmlFile) => {
        setSelectedFile(file);
        setPreviewUrl(`http://localhost:5000${file.url}?t=${Date.now()}`);
    };

    const refreshFiles = async () => {
        setIsRefreshing(true);
        await loadHtmlFiles();
        setIsRefreshing(false);
    };

    const openInNewTab = () => {
        if (previewUrl) {
            window.open(previewUrl, '_blank');
        }
    };

    useEffect(() => {
        loadHtmlFiles();
    }, [fileDir, projectId]);

    if (error) {
        return (
            <div className="h-[960px] flex flex-col flex-1">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">HTML Preview</h2>
                    <button
                        onClick={refreshFiles}
                        disabled={isRefreshing}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
                <div className="flex-1 border rounded overflow-hidden flex items-center justify-center">
                    <div className="text-center p-4">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                        <div className="text-red-500 mb-2">Error: {error}</div>
                        <button
                            onClick={refreshFiles}
                            disabled={isRefreshing}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[960px] flex flex-col flex-1">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">HTML Preview</h2>
                <div className="flex gap-2">
                    {selectedFile && (
                        <button
                            onClick={openInNewTab}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open in New Tab
                        </button>
                    )}
                    <button
                        onClick={refreshFiles}
                        disabled={isRefreshing}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {htmlFiles.length > 0 && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Select HTML File:</label>
                    <div className="flex flex-wrap gap-2">
                        {htmlFiles.map((file) => (
                            <button
                                key={file.filename}
                                onClick={() => selectFile(file)}
                                className={`px-3 py-2 rounded border flex items-center gap-2 ${selectedFile?.filename === file.filename
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <FileText className="h-4 w-4" />
                                <span>{file.filename}</span>
                                <span className="text-xs opacity-75">
                                    ({Math.round(file.size / 1024)}KB)
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 border rounded overflow-hidden">
                {previewUrl ? (
                    <iframe
                        src={previewUrl}
                        title={selectedFile?.filename || "HTML Preview"}
                        className="w-full h-full"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                ) : htmlFiles.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center p-4">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <div className="text-gray-500 mb-2">No HTML files found</div>
                            <p className="text-sm text-gray-400">
                                Generate some prototypes or documents to see them here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center p-4">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <div className="text-gray-500 mb-2">Select an HTML file to preview</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreviewAppView;
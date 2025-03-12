import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';

interface TabProps {
    label: string;
    children: React.ReactNode;
}

const Tab: React.FC<TabProps> = ({ children }) => {
    return <div className="p-4">{children}</div>;
};

interface FileData {
    name: string;
    type: 'image' | 'markdown' | 'graph' | 'other';
    content: string;
    path?: string;
}

interface ResultsProps {
    fileDirs?: string[];
}

const Results: React.FC<ResultsProps> = ({ fileDirs = [] }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [fileData, setFileData] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);

    // Test tabs for development/preview purposes
    const testFiles: FileData[] = [
        {
            name: "Sample Markdown",
            type: "markdown",
            content: "# Hello World\n\nThis is a **markdown** sample."
        },
        {
            name: "Sample Image",
            type: "image",
            content: "https://via.placeholder.com/300x200"
        },
        {
            name: "Sample Graph",
            type: "graph",
            content: ""
        }
    ];

    useEffect(() => {
        if (fileDirs.length === 0) {
            setFileData(testFiles);
            setLoading(false);
            return;
        }

        const loadFiles = async () => {
            try {
                const loadedFiles = await Promise.all(fileDirs.map(async (path) => {
                    const fileName = path.split(/[\/\\]/).pop() || path;
                    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

                    let fileType: 'image' | 'markdown' | 'other' = 'other';
                    let content = '';

                    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(fileExtension)) {
                        fileType = 'image';
                        // For images, we'll use a placeholder content and store the path
                        // The actual image data will be loaded via IPC when rendering
                        content = ''; // We'll use the path property to store the actual path

                        // We don't need to add file:// protocol as we'll handle this 
                        // differently in the rendering section using our IPC bridge
                        // Just normalize the path separators for consistency
                        path = path.replace(/\\/g, '/');
                    } else if (['md', 'markdown'].includes(fileExtension)) {
                        fileType = 'markdown';
                        try {
                            // Use IPC to read the file through the main process
                            content = await window.myAPI.readFile(path);
                        } catch (error) {
                            console.error(`Error loading markdown file ${path}:`, error);
                            content = `# Error Loading File\n\nFailed to load ${fileName}:\n\n${error}`;
                        }
                    } else {
                        // For other files, just show the path
                        content = `File path: ${path}`;
                    }

                    return {
                        name: fileName,
                        type: fileType,
                        content,
                        path: fileType === 'image' ? content : path
                    };
                }));

                setFileData(loadedFiles);
            } catch (error) {
                console.error("Error loading files:", error);
                setFileData([{
                    name: "Error",
                    type: "markdown",
                    content: `# Error\n\nFailed to load files: ${error instanceof Error ? error.message : String(error)}`
                }]);
            } finally {
                setLoading(false);
            }
        };

        loadFiles();
    }, [fileDirs]);

    const renderFileContent = (file: FileData) => {
        switch (file.type) {
            case 'image':
                return (
                    <ImageWithIPC
                        filePath={file.path || ''}
                        fileName={file.name}
                    />
                );
            case 'markdown':
                return <Markdown>{file.content}</Markdown>;
            default:
                return <div className="text-gray-700">{file.content}</div>;
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Loading files...</div>;
    }

    return (
        <div className="w-full bg-white shadow rounded">
            <div className="flex border-b overflow-x-auto">
                {fileData.map((file: FileData, index: number) => (
                    <button
                        type="button"
                        key={index}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === index
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                        onClick={() => setActiveTab(index)}
                    >
                        {file.name}
                    </button>
                ))}
            </div>
            <div className="p-4">
                {fileData.length > 0 && renderFileContent(fileData[activeTab])}
            </div>
        </div>
    );
};

// Add this new component for IPC image loading
const ImageWithIPC: React.FC<{ filePath: string, fileName: string }> = ({ filePath, fileName }) => {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        const loadImage = async () => {
            try {
                setLoading(true);
                // Call your IPC method to get image as base64
                const base64Image = await window.myAPI.readFile(filePath);
                setImageSrc(`data:image;base64,${base64Image}`);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load image:", err);
                setError(true);
                setLoading(false);
            }
        };

        loadImage();
    }, [filePath]);

    if (loading) {
        return <div className="flex justify-center p-4">Loading image...</div>;
    }

    if (error) {
        return <div className="text-red-500">Failed to load image: {fileName}</div>;
    }

    return (
        <div className="flex flex-col items-center">
            <img
                src={imageSrc}
                alt={fileName}
                className="max-w-full h-auto"
            />
            <p className="text-sm text-gray-500 mt-2">{fileName}</p>
        </div>
    );
};

export { Results, Tab };
export default Results;
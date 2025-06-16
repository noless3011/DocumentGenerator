import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import { Project } from '../models/Project'; // Assuming DocumentType is also in Project or a similar path
import { DocumentType } from './WorkspaceProvider';

interface ProjectContextType {
    projects: Project[];
    currentProject: Project | null;
    loading: boolean;
    error: string | null;
    fetchProjects: () => Promise<void>;
    getProjectById: (id: string) => Project | undefined;
    createProject: (projectData: { project_name: string, base_dir: string }) => Promise<Project>;
    loadProject: (id: string) => Promise<void>;
    closeProject: () => Promise<void>;
    createFile: (fileName: string, fileType: DocumentType, diagram_type?: string) => Promise<void>;
    deleteFile: (fileName: string, fileType: DocumentType) => Promise<void>;
    deleteFileFromFolder: (fileName: string, folder: 'input' | 'processed') => Promise<void>;
    renameFile: (oldFileName: string, newFileName: string, fileType: DocumentType) => Promise<void>;
    getProjectDetails: () => Promise<Project | null>;
    uploadFile: (file: File, folder: 'input' | 'processed') => Promise<void>;
    getProcessedFiles: () => Promise<any[]>;
    projectFiles: any[];
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
    children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [projectFiles, setProjectFiles] = useState<any[]>([]);
    const API_BASE_URL = 'http://localhost:5000/projects';
    const WS_BASE_URL = 'ws://localhost:5000/projects';

    const webSocketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // fetchProjects(); // Original call
        const initializeProjectState = async () => {
            setLoading(true);
            setError(null);
            try {
                const details = await getProjectDetails();

                if (details && details.id) {
                    // A project is already open in the backend
                    setCurrentProject(details);
                    // Optionally, refresh the full list of projects in the background
                    fetchProjects();
                } else {
                    // No project is currently open in the backend
                    setCurrentProject(null);
                    // Fetch all projects to show in the list if the user wants to open one
                    await fetchProjects();
                }
            } catch (err) {
                console.error('[ProjectContext] Error initializing project state:', err);
                // If getProjectDetails fails (e.g. server down, or specific error like "no project open")
                // it might throw an error. We should ensure currentProject is null.
                setCurrentProject(null);
                setError(err instanceof Error ? err.message : 'Failed to check initial project status');
                // Still fetch projects so the user can open one if available
                await fetchProjects();
            } finally {
                setLoading(false);
            }
        };

        initializeProjectState();
    }, []); // Empty dependency array ensures this runs once on mount

    useEffect(() => {
        if (currentProject && currentProject.id) {
            // Check if WebSocket is already connected to prevent duplicates in StrictMode
            if (webSocketRef.current &&
                webSocketRef.current.readyState === WebSocket.OPEN &&
                webSocketRef.current.url.endsWith(`/ws/${currentProject.id}`)) {
                console.log(`[ProjectContext] WebSocket already connected to project: ${currentProject.id}`);
                return;
            }

            // Close any existing connection before creating a new one
            if (webSocketRef.current) {
                webSocketRef.current.close();
                webSocketRef.current = null;
            }

            // Connect Project WebSocket
            const wsUrl = `${WS_BASE_URL}/ws/${currentProject.id}`;
            const ws = new WebSocket(wsUrl);
            webSocketRef.current = ws; ws.onopen = () => {
                console.log(`[ProjectContext] WebSocket_project connected to project: ${currentProject.id}`);
            };
            ws.onmessage = (event) => {
                try {
                    console.log(`[ProjectContext] WebSocket message received for project: ${currentProject?.id}`, event.data);
                    const projectUpdateData = JSON.parse(event.data as string) as Project;
                    if (projectUpdateData) {
                        // Update current project if it matches
                        setCurrentProject(prevProject => {
                            if (prevProject && projectUpdateData.id === prevProject.id) {
                                const newProjectState = { ...prevProject, ...projectUpdateData };
                                return newProjectState as Project;
                            }
                            return prevProject;
                        });

                        // Always update projects list
                        setProjects(prevProjects =>
                            prevProjects.map(p =>
                                p.id === projectUpdateData.id ? { ...p, ...projectUpdateData } : p
                            )
                        );
                    }
                } catch (e) {
                    console.error('[ProjectContext] Error processing WebSocket message:', e);
                }
            }; ws.onerror = (err) => {
                console.error('[ProjectContext] WebSocket error for project:', currentProject?.id, err);
            };

            ws.onclose = (event) => { // Added event parameter
                console.log(`[ProjectContext] WebSocket disconnected from project: ${currentProject?.id}, Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`);
                if (webSocketRef.current === ws) {
                    webSocketRef.current = null;
                }
            };

            return () => {
                if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
                    ws.close();
                }
                if (webSocketRef.current === ws) { // Defensive clear
                    webSocketRef.current = null;
                }
            };
        } else {
            console.log(`[ProjectProvider useEffect] No active project or project ID. Current project state:`, currentProject); // Updated log
            if (webSocketRef.current) {
                webSocketRef.current.close();
                webSocketRef.current = null;
            }
        }
    }, [currentProject?.id]); // REMOVED chatContext from dependencies
    const getProjectById = useCallback((id: string): Project | undefined => {
        return projects.find(project => project.id === id);
    }, [projects]);

    const fetchProjects = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/list`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch projects: ${response.status}`);
            }
            const data = await response.json();
            setProjects(data || []);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
            setError(errorMessage);
            console.error('[ProjectContext] Error fetching projects:', err);
            setProjects([]); // Clear projects on error
        } finally {
            setLoading(false);
        }
    }, []);
    const createProject = useCallback(async (projectInput: { project_name: string, base_dir: string }): Promise<Project> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectInput),
                mode: 'cors',
            });
            if (!response.ok) {
                let errorDetail = `Failed to create project: ${response.status}`;
                try {
                    const errBody = await response.json();
                    errorDetail += errBody.detail ? (typeof errBody.detail === 'string' ? ` - ${errBody.detail}` : ` - ${JSON.stringify(errBody.detail)}`) : '';
                } catch (e) { /* ignore if body isn't json */ }
                throw new Error(errorDetail);
            }

            const newProjectData = await response.json() as Project;
            setCurrentProject(newProjectData);
            // chatContext.connectWebSocket is now handled by ChatProvider's useEffect

            await fetchProjects();
            return newProjectData;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
            setError(errorMessage);
            console.error('[ProjectContext] Error creating project:', err);
            setCurrentProject(null);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchProjects]);
    const loadProject = useCallback(async (id: string): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/load/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',

            });
            if (!response.ok) {
                let errorDetail = `Failed to load project: ${response.status}`;
                try {
                    const errBody = await response.json();
                    errorDetail += errBody.detail ? (typeof errBody.detail === 'string' ? ` - ${errBody.detail}` : ` - ${JSON.stringify(errBody.detail)}`) : '';
                } catch (e) { /* ignore if body isn't json */ }
                throw new Error(errorDetail);
            }
            const projectData = await response.json();
            const loadedProject = projectData as Project;
            setCurrentProject(loadedProject);
            // chatContext.connectWebSocket is now handled by ChatProvider's useEffect

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load project (unknown error)';
            setError(errorMessage);
            console.error('[ProjectContext] Error in loadProject:', err);
            setCurrentProject(null); // Explicitly set to null on any error in the try block
            throw err; // Re-throwing allows calling component to know about the error
        } finally {
            setLoading(false);
        }
    }, []);
    const closeProject = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
            });
            if (!response.ok) {
                let errorDetail = `Failed to close project: ${response.status}`;
                try {
                    const errBody = await response.json();
                    errorDetail += errBody.detail ? (typeof errBody.detail === 'string' ? ` - ${errBody.detail}` : ` - ${JSON.stringify(errBody.detail)}`) : '';
                } catch (e) { /* ignore if body isn't json */ }
                throw new Error(errorDetail);
            }
            setCurrentProject(null);
            // chatContext.disconnectWebSocket is now handled by ChatProvider's useEffect
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to close project';
            setError(errorMessage);
            console.error('[ProjectContext] Error closing project:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);
    const getProjectDetails = useCallback(async (): Promise<Project | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/details`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
            });
            console.log('[ProjectContext] getProjectDetails response:', response);
            if (!response.ok) {
                // For getProjectDetails, if it's a 404 or similar indicating no active project,
                // it might not be a "throwable" error for the initial load, but rather a state.
                if (response.status === 404) {
                    // No project is actively loaded on the backend, which is a valid state.
                    setCurrentProject(null); // Ensure frontend reflects this
                    return null; // Return null instead of null as any
                }
                let errorDetail = `Failed to get project details: ${response.status}`;
                try {
                    const errBody = await response.json();
                    errorDetail += errBody.detail ? (typeof errBody.detail === 'string' ? ` - ${errBody.detail}` : ` - ${JSON.stringify(errBody.detail)}`) : '';
                } catch (e) { /* ignore if body isn't json */ }
                throw new Error(errorDetail);
            }
            const projectDetails = await response.json() as Project;
            if (projectDetails && projectDetails.id) {
                // This means a project is active on the backend.
                // setCurrentProject(projectDetails); // This might cause a loop if called from initializeProjectState's try block without care
            } else {
                // No project active or details are incomplete.
                // setCurrentProject(null);
            }
            return projectDetails;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get project details';
            setError(errorMessage);
            console.error('[ProjectContext] Error getting project details:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);
    const createFile = useCallback(async (fileName: string, fileType: DocumentType, diagram_type?: string) => {
        setLoading(true);
        setError(null);
        try {
            let builtFileName = fileName;
            if (fileType === DocumentType.MARKDOWN) {
                builtFileName += '.md';
            } else if (fileType === DocumentType.DIAGRAM) {
                builtFileName += '.json'; // Assuming .json for diagrams for now
            } else if (fileType === DocumentType.PROTOTYPE) {
                builtFileName += '.html';
            } else {
                console.error('[ProjectContext] Unknown file type, cannot create file:', fileType);
                return;
            }

            let req_body = JSON.stringify({ file_name: builtFileName, file_type: "processed", document_type: fileType });

            if (fileType === DocumentType.DIAGRAM && diagram_type) {
                req_body = JSON.stringify({ file_name: builtFileName, file_type: "processed", document_type: fileType, diagram_type: diagram_type });
            } const response = await fetch(`${API_BASE_URL}/create-output`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: req_body,
                mode: 'cors',
            });
            if (!response.ok) {
                let errorDetail = `Failed to create file: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    errorDetail = errorResult.error || errorResult.detail || JSON.stringify(errorResult);
                } catch (e) {
                    console.error('[ProjectContext] Create File API could not parse error response body:', e);
                }
                throw new Error(errorDetail);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create file';
            setError(errorMessage);
            console.error('[ProjectContext] Error creating file:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);
    const deleteFile = useCallback(async (fileName: string, fileType: DocumentType) => {
        setLoading(true);
        setError(null);
        try {
            let builtFileName = fileName;
            if (fileType === DocumentType.MARKDOWN) {
                builtFileName += '.md';
            } else if (fileType === DocumentType.DIAGRAM) {
                builtFileName += '.json'; // Assuming .json for diagrams for now
            } else if (fileType === DocumentType.PROTOTYPE) {
                builtFileName += '.html';
            } else {
                console.error('[ProjectContext] Unknown file type, cannot delete file:', fileType);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/remove-output`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_name: builtFileName }),
                mode: 'cors',
            });
            if (!response.ok) {
                let errorDetail = `Failed to delete file: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    errorDetail = errorResult.error || errorResult.detail || JSON.stringify(errorResult);
                } catch (e) {
                    console.error('[ProjectContext] Delete File API could not parse error response body:', e);
                }
                throw new Error(errorDetail);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
            setError(errorMessage);
            console.error('[ProjectContext] Error deleting file:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);
    const deleteFileFromFolder = useCallback(async (fileName: string, folder: 'input' | 'processed'): Promise<void> => {
        if (!currentProject) {
            throw new Error('No project is currently loaded');
        }

        setLoading(true);
        setError(null);

        try {
            // Use the existing backend endpoint for deleting files from specific folders
            const endpoint = folder === 'input'
                ? `${API_BASE_URL}/remove-input`
                : `${API_BASE_URL}/remove-processed`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_name: fileName }),
                mode: 'cors',
            });

            if (!response.ok) {
                let errorDetail = `Failed to delete file from ${folder}: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    errorDetail = errorResult.error || errorResult.detail || JSON.stringify(errorResult);
                } catch (e) {
                    console.error(`[ProjectContext] Delete File from ${folder} API could not parse error response body:`, e);
                }
                throw new Error(errorDetail);
            }

            // Update local state to remove the file
            if (currentProject.files && currentProject.files[folder]) {
                const updatedFiles = currentProject.files[folder].filter(file => file.name !== fileName);
                setCurrentProject(prev => prev ? {
                    ...prev,
                    files: {
                        ...prev.files,
                        [folder]: updatedFiles
                    }
                } : null);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : `Failed to delete file from ${folder}`;
            setError(errorMessage);
            console.error(`[ProjectContext] Error deleting file from ${folder}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [currentProject]);

    const renameFile = useCallback(async (oldFileName: string, newFileName: string, fileType: DocumentType) => {
        setLoading(true);
        setError(null);
        try {
            let builtOldFileName = oldFileName;
            let builtNewFileName = newFileName;
            if (fileType === DocumentType.MARKDOWN) {
                builtOldFileName += '.md';
                builtNewFileName += '.md';
            } else if (fileType === DocumentType.DIAGRAM) {
                builtOldFileName += '.json'; // Assuming .json for diagrams for now
                builtNewFileName += '.json';
            } else if (fileType === DocumentType.PROTOTYPE) {
                builtOldFileName += '.html';
                builtNewFileName += '.html';
            } else {
                console.error('[ProjectContext] Unknown file type, cannot rename file:', fileType);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/rename-output`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_file_name: builtOldFileName, new_file_name: builtNewFileName }),
                mode: 'cors',
            });
            if (!response.ok) {
                let errorDetail = `Failed to rename file: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    errorDetail = errorResult.error || errorResult.detail || JSON.stringify(errorResult);
                } catch (e) {
                    console.error('[ProjectContext] Rename File API could not parse error response body:', e);
                }
                throw new Error(errorDetail);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to rename file';
            setError(errorMessage);
            console.error('[ProjectContext] Error renaming file:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []); // Empty dependency array since it doesn't depend on any state/props

    const uploadFile = useCallback(async (file: File, folder: 'input' | 'processed' = 'processed'): Promise<void> => {
        if (!currentProject) {
            throw new Error('No project is currently loaded');
        }

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Determine the correct endpoint based on folder and file type
            let endpoint = 'http://localhost:5000/files/upload-excel';

            // For source files going to processed folder, we might need a different endpoint
            if (folder === 'processed') {
                // Check if it's a source file type (.txt, .csv, .png, .jpg, .jpeg)
                const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
                const sourceTypes = ['.txt', '.csv', '.png', '.jpg', '.jpeg'];

                if (sourceTypes.includes(fileExtension)) {
                    // Use a generic file upload endpoint for source files
                    endpoint = 'http://localhost:5000/files/upload-source';
                }
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                mode: 'cors',
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Failed to upload file: ${response.status}`);
            }

            // Update project files after successful upload
            if (currentProject.files) {
                const updatedFiles = [...(currentProject.files[folder] || [])];
                updatedFiles.push({
                    path: '', // Will be set by backend
                    name: file.name,
                    added_date: new Date().toISOString()
                });

                setCurrentProject(prev => prev ? {
                    ...prev,
                    files: {
                        ...prev.files,
                        [folder]: updatedFiles
                    }
                } : null);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
            setError(errorMessage);
            console.error('[ProjectContext] Error uploading file:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [currentProject]); // Dependencies: currentProject    
    const getProcessedFiles = useCallback(async (): Promise<any[]> => {
        if (!currentProject) {
            return [];
        }

        try {
            // Make API call to fetch the latest processed files from backend
            const response = await fetch('http://localhost:5000/files/list-all', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
            });

            if (!response.ok) {
                console.error('Failed to fetch processed files:', response.status);
                // Fallback to cached data if API fails
                return currentProject.files?.processed || [];
            }

            const data = await response.json();
            console.log('Fetched processed files from API:', data);

            // Return processed files from the API response
            return data.processed_files || [];
        } catch (err) {
            console.error('[ProjectContext] Error getting processed files:', err);
            // Fallback to cached data if API fails
            return currentProject.files?.processed || [];
        }
    }, [currentProject]);

    // Update projectFiles when currentProject changes
    React.useEffect(() => {
        if (currentProject && currentProject.files) {
            const allFiles = [
                ...(currentProject.files.input || []),
                ...(currentProject.files.processed || []),
                ...(currentProject.files.output || [])
            ];
            setProjectFiles(allFiles);
        } else {
            setProjectFiles([]);
        }
    }, [currentProject]);

    const value: ProjectContextType = useMemo(() => ({
        projects,
        currentProject,
        loading,
        error,
        fetchProjects,
        getProjectById,
        createProject,
        loadProject,
        closeProject,
        createFile,
        deleteFile,
        deleteFileFromFolder,
        renameFile,
        getProjectDetails,
        uploadFile,
        getProcessedFiles,
        projectFiles,
    }), [
        projects,
        currentProject,
        loading,
        error,
        fetchProjects,
        getProjectById,
        createProject,
        loadProject,
        closeProject,
        createFile,
        deleteFile,
        deleteFileFromFolder,
        renameFile,
        getProjectDetails,
        uploadFile,
        getProcessedFiles,
        projectFiles,
    ]);

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjects = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};

export const useProjectContext = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjectContext must be used within a ProjectProvider');
    }
    return context;
};
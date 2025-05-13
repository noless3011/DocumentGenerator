import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, use } from 'react';
import { Project } from '../models/Project'; // Assuming this path is correct
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
    createFile: (fileName: string, fileType: DocumentType) => Promise<void>;
    deleteFile: (fileName: string, fileType: DocumentType) => Promise<void>;
    renameFile: (oldFileName: string, newFileName: string, fileType: DocumentType) => Promise<void>;
    getProjectDetails: () => Promise<Project>;
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
    const API_BASE_URL = 'http://localhost:5000/projects';
    const WS_BASE_URL = 'ws://localhost:5000/projects';

    const webSocketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        fetchProjects();
    }, []);


    useEffect(() => {
        console.log('[ProjectContext] Current project changed:', currentProject);
        if (currentProject && currentProject.id) {
            const wsUrl = `${WS_BASE_URL}/ws/${currentProject.id}`;
            console.log('[ProjectContext] Attempting to connect to WebSocket:', wsUrl);
            const ws = new WebSocket(wsUrl);
            webSocketRef.current = ws;

            ws.onopen = () => {
                console.log('[ProjectContext] WebSocket connected for project:', currentProject.id);
            };

            ws.onmessage = (event) => {
                try {
                    const projectUpdateData = JSON.parse(event.data as string) as Project; // Assuming WS sends full Project-like data
                    console.log('[ProjectContext] WebSocket message received:', projectUpdateData);
                    if (projectUpdateData && currentProject && projectUpdateData.id === currentProject.id) {
                        setCurrentProject(prevProject => {
                            // Ensure prevProject is not null before spreading
                            const newProjectState = { ...(prevProject || {}), ...projectUpdateData };
                            console.log('[ProjectContext] Updating currentProject from WebSocket:', newProjectState);
                            return newProjectState as Project;
                        });
                    } else if (projectUpdateData && currentProject && projectUpdateData.id !== currentProject.id) {
                        console.log("[ProjectContext] WebSocket update for a different project, ignoring for currentProject state:", projectUpdateData.id);
                        setProjects(prevProjects => prevProjects.map(p => p.id === projectUpdateData.id ? { ...p, ...projectUpdateData } : p));
                    } else if (projectUpdateData && !currentProject) {
                        // This case is less likely if WS only connects for a currentProject
                        console.log("[ProjectContext] WebSocket update received, but no current project. Updating projects list:", projectUpdateData.id);
                        setProjects(prevProjects => prevProjects.map(p => p.id === projectUpdateData.id ? { ...p, ...projectUpdateData } : p));
                    }
                } catch (e) {
                    console.error('[ProjectContext] Error processing WebSocket message:', e);
                }
            };

            ws.onerror = (err) => {
                console.error('[ProjectContext] WebSocket error for project:', currentProject.id, err);
            };

            ws.onclose = (event) => {
                console.log('[ProjectContext] WebSocket disconnected for project:', currentProject.id, 'Reason:', event.reason, 'Code:', event.code);
                if (webSocketRef.current === ws) {
                    webSocketRef.current = null;
                }
            };

            return () => {
                if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
                    console.log('[ProjectContext] Closing WebSocket connection for project:', currentProject.id);
                    ws.close();
                }
                if (webSocketRef.current === ws) { // Defensive clear
                    webSocketRef.current = null;
                }
            };
        } else {
            if (webSocketRef.current) {
                console.log('[ProjectContext] No current project or project ID, closing existing WebSocket.');
                webSocketRef.current.close();
                webSocketRef.current = null;
            }
        }
    }, [currentProject?.id]); // Re-run if currentProject.id changes


    const getProjectById = (id: string): Project | undefined => {
        return projects.find(project => project.id === id);
    };

    const fetchProjects = async (): Promise<void> => {
        console.log('[ProjectContext] Fetching all projects...');
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
            console.log('[ProjectContext] Fetched projects list:', data);
            setProjects(data || []);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
            setError(errorMessage);
            console.error('[ProjectContext] Error fetching projects:', err);
            setProjects([]); // Clear projects on error
        } finally {
            setLoading(false);
        }
    };

    const createProject = async (projectInput: { project_name: string, base_dir: string }): Promise<Project> => {
        console.log('[ProjectContext] Attempting to create project:', projectInput);
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectInput),
                mode: 'cors',
            });
            console.log(`[ProjectContext] Create API response status: ${response.status}`);
            if (!response.ok) {
                let errorDetail = `Failed to create project: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    errorDetail = errorResult.error || errorResult.detail || JSON.stringify(errorResult);
                    console.error('[ProjectContext] Create API error response body:', errorResult);
                } catch (e) { console.error('[ProjectContext] Create API could not parse error response body:', e); }
                throw new Error(errorDetail);
            }

            // const createdProjectInfo = await response.json() as Project; // Backend returns ProjectInfo
            // console.log('[ProjectContext] Create API success (initial info):', createdProjectInfo);
            // Backend /create sets the project as current, so /details should fetch it.

            console.log('[ProjectContext] Fetching details for newly created project...');
            const newProjectData = await getProjectDetails(); // This will call setCurrentProject
            console.log('[ProjectContext] Successfully created and fetched details for project:', newProjectData);

            await fetchProjects(); // Refresh the list of all projects
            return newProjectData;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
            setError(errorMessage);
            console.error('[ProjectContext] Error creating project:', err);
            setCurrentProject(null); // Explicitly clear current project on error
            throw err; // Re-throw for the calling component to handle
        } finally {
            setLoading(false);
        }
    };

    const loadProject = async (id: string): Promise<void> => {
        console.log(`[ProjectContext] Attempting to load project with ID: ${id}`);
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/load/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',

            });
            const projectData = await response.json();
            const loadedProject = projectData as Project;
            console.log("loadedProject:", loadedProject);
            setCurrentProject(loadedProject);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load project (unknown error)';
            setError(errorMessage);
            console.error('[ProjectContext] Error in loadProject:', err);
            setCurrentProject(null); // Explicitly set to null on any error in the try block
            throw err; // Re-throwing allows calling component to know about the error
        } finally {
            setLoading(false);
            console.log(`[ProjectContext] loadProject for ID ${id} finished.`);
        }
    };

    const closeProject = async (): Promise<void> => {
        console.log('[ProjectContext] Attempting to close current project...');
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
            });
            console.log(`[ProjectContext] Close API response status: ${response.status}`);
            if (!response.ok) {
                let errorDetail = `Failed to close project: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    errorDetail = errorResult.error || errorResult.detail || JSON.stringify(errorResult);
                } catch (e) { /* ignore if error body cannot be parsed */ }
                throw new Error(errorDetail);
            }
            console.log('[ProjectContext] Close API success.');
            setCurrentProject(null); // This will trigger WebSocket cleanup in useEffect
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to close project';
            setError(errorMessage);
            console.error('[ProjectContext] Error closing project:', err);
            // currentProject might still be set if API call failed, but UI might expect it to be null.
            // Depending on desired behavior, you might still setCurrentProject(null) or leave it.
            // For now, only setting null on success.
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getProjectDetails = async (): Promise<Project> => {
        console.log('[ProjectContext] Attempting to get project details...');
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/details`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
            });
            console.log(`[ProjectContext] Get Details API response status: ${response.status}`);
            if (!response.ok) {
                let errorDetail = `Failed to get project details: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    errorDetail = errorResult.error || errorResult.detail || JSON.stringify(errorResult);
                } catch (e) { /* ignore */ }
                throw new Error(errorDetail);
            }
            const projectDetails = await response.json() as Project; // Backend /details returns ProjectInfo
            console.log('[ProjectContext] Get Details API success, data:', projectDetails);

            // If these details are for the project that is (or should be) current, update the state.
            // This is especially useful if getProjectDetails is called after createProject.
            if (projectDetails && projectDetails.id) {
                // Check if it's a new project being set, or an update to the existing current one.
                if (!currentProject || (currentProject && currentProject.id === projectDetails.id)) {
                    console.log('[ProjectContext] Setting/Updating current project from getProjectDetails:', projectDetails);
                    setCurrentProject(projectDetails);
                } else if (currentProject && currentProject.id !== projectDetails.id) {
                    // This case implies /details returned a project different from what frontend thought was current.
                    // This shouldn't happen if /details always returns the backend's actual current project.
                    // Could indicate backend's current project changed unexpectedly.
                    console.warn('[ProjectContext] getProjectDetails returned a project different from current. Updating currentProject.', projectDetails);
                    setCurrentProject(projectDetails);
                }
            } else {
                console.warn('[ProjectContext] getProjectDetails returned invalid data or no ID.');
                // If no project is active on the backend, /details throws an error,
                // so this path (valid response but no projectDetails.id) is less likely.
            }
            return projectDetails;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get project details';
            setError(errorMessage);
            console.error('[ProjectContext] Error getting project details:', err);
            // If getProjectDetails fails, do not change currentProject unless it implies no project is active.
            // The backend /details endpoint itself will raise HTTPException if no active project.
            // So, if we are in catch here, it means the request failed.
            // If currentProject was set, and details for *that* project failed, should we nullify it?
            // Probably not, let the WebSocket handle its state or a specific closeProject call.
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const createFile = async (fileName: string, fileType: DocumentType) => {
        console.log('[ProjectContext] Attempting to create file:', fileName, 'of type:', fileType);
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

            const response = await fetch(`${API_BASE_URL}/create-output`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_name: builtFileName }),
                mode: 'cors',
            });
            console.log(`[ProjectContext] Create File API response status: ${response.status}`);
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
            console.log('[ProjectContext] Create File API success.');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create file';
            setError(errorMessage);
            console.error('[ProjectContext] Error creating file:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }

    const deleteFile = async (fileName: string, fileType: DocumentType) => {
        console.log('[ProjectContext] Attempting to delete file:', fileName, 'of type:', fileType);
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
            console.log(`[ProjectContext] Delete File API response status: ${response.status}`);
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
            console.log('[ProjectContext] Delete File API success.');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
            setError(errorMessage);
            console.error('[ProjectContext] Error deleting file:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }

    const renameFile = async (oldFileName: string, newFileName: string, fileType: DocumentType) => {
        console.log('[ProjectContext] Attempting to rename file:', oldFileName, 'to:', newFileName, 'of type:', fileType);
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
            console.log(`[ProjectContext] Rename File API response status: ${response.status}`);
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
            console.log('[ProjectContext] Rename File API success.');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to rename file';
            setError(errorMessage);
            console.error('[ProjectContext] Error renaming file:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }

    const value: ProjectContextType = {
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
        renameFile,
        getProjectDetails,
    };

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
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project } from '../models/Project';

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

    // Initialize by fetching projects on mount
    useEffect(() => {
        fetchProjects();
    }, []);

    const getProjectById = (id: string): Project | undefined => {
        return projects.find(project => project.id === id);
    };

    const fetchProjects = async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/list`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch projects: ${response.status}`);
            }

            const data = await response.json();
            setProjects(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch projects');
            console.error('Error fetching projects:', err);
        } finally {
            console.log(projects)
            setLoading(false);
        }
    };

    const createProject = async (projectData: { project_name: string, base_dir: string }): Promise<Project> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(projectData),
                mode: 'cors',
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Failed to create project: ${response.status}`);
            }

            const res = await response.json();

            // Update projects list
            await fetchProjects();
            const projectMetadata = await window.myAPI.readFileAsText(res.project_dir + '/project_metadata.json');
            const projectMetadataJson = JSON.parse(projectMetadata);

            const now = new Date().toISOString();

            const newProject: Project = {
                id: projectMetadataJson.id,
                name: projectData.project_name,
                created_date: now,
                modified_date: now,
                description: '',
                directories: {
                    base: projectData.base_dir,
                    project: res.project_dir,
                    input: `${res.project_dir}/input`,
                    processed: `${res.project_dir}/processed`,
                    output: `${res.project_dir}/output`,
                },
                files: {
                    input: [],
                    processed: [],
                    output: []
                },
                processing_history: []
            };

            // Set as current project
            setCurrentProject(newProject);

            return newProject;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
            console.error('Error creating project:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const loadProject = async (id: string): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/load/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Failed to load project: ${response.status}`);
            }

            const res = await response.json();
            const projectDataText = await window.myAPI.readFileAsText(res.project_dir + '/project_metadata.json');
            const projectJson = JSON.parse(projectDataText);

            // Transform API response to match Project interface
            const project: Project = {
                ...projectJson
            };

            setCurrentProject(project);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load project');
            console.error('Error loading project:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const closeProject = async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/close`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Failed to close project: ${response.status}`);
            }

            setCurrentProject(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to close project');
            console.error('Error closing project:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getProjectDetails = async (): Promise<Project> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/details`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Failed to get project details: ${response.status}`);
            }

            const projectDetails = await response.json();
            return projectDetails as Project;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get project details');
            console.error('Error getting project details:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

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
        getProjectDetails,
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

// Custom hook to use the ProjectContext
export const useProjects = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};
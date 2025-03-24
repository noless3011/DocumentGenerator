import React, { useState, useEffect } from 'react';
import { Add as AddIcon, Refresh as RefreshIcon, FolderOpen as FolderIcon } from '@mui/icons-material';
import {
    Button, Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemText,
    TextField, Typography, IconButton, Divider, Box, CircularProgress,
    InputAdornment
} from '@mui/material';

export interface Project {
    id: string;
    name: string;
    base_dir: string;
    project_dir?: string;
    created_date: string; // ISO date string format
    modified_date: string; // ISO date string format
    description?: string;
    tags?: string[];
    files?: {
        input: Array<{ path: string, name: string, added_date: string }>;
        processed: Array<{ path: string, name: string, added_date: string }>;
        output: Array<{ path: string, name: string, added_date: string }>;
    };
    processing_history?: Array<{
        timestamp: string;
        operation: string;
        input_files: string[];
        output_files: string[];
        details: Record<string, any>;
    }>;
}

interface ProjectManagingMenuProps {
    onProjectLoaded?: (project: Project) => void;
}

const ProjectManagingMenu: React.FC<ProjectManagingMenuProps> = ({ onProjectLoaded }) => {
    const [open, setOpen] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [newProjectName, setNewProjectName] = useState('');
    const [baseDir, setBaseDir] = useState('');
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const handleSelectDirectory = async () => {
        try {
            // Call your existing IPC function to open folder dialog
            // Replace this with your actual function call
            const selectedPath = await window.myAPI.selectFolder();

            if (selectedPath) {
                setBaseDir(selectedPath);
            }
        } catch (err) {
            console.error('Error selecting directory:', err);
            setError('Failed to select directory');
        }
    };
    const handleOpen = () => {
        setOpen(true);
        fetchProjects();
    };

    const handleClose = () => {
        setOpen(false);
        setError(null);
    };

    const fetchProjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:5000/list-projects');
            const data = await response.json();
            if (response.ok) {
                setProjects(data.projects || []);
            } else {
                setError(data.error || 'Failed to fetch projects');
            }
        } catch (err) {
            setError('Network error when fetching projects');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentProject = async () => {
        try {
            const response = await fetch('http://localhost:5000/project-details');
            const data = await response.json();
            if (response.ok) {
                setCurrentProject(data);
            } else {
                setCurrentProject(null);
            }
        } catch (err) {
            setCurrentProject(null);
            console.error(err);
        }
    };

    const createProject = async () => {
        if (!newProjectName.trim()) {
            setError('Project name cannot be empty');
            return;
        }

        if (!baseDir.trim()) {
            setError('Base directory cannot be empty');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:5000/create-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_name: newProjectName,
                    base_dir: baseDir
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setNewProjectName('');
                setBaseDir('');
                fetchProjects();
                const project: Project = {
                    id: data.project_id,
                    name: newProjectName,
                    base_dir: baseDir,
                    created_date: data.created_date,
                    modified_date: data.modified_date
                };
                // Update current project from response
                if (onProjectLoaded) {
                    onProjectLoaded(project);
                }
                handleClose();
            } else {
                setError(data.error || 'Failed to create project');
            }
        } catch (err) {
            setError('Network error when creating project');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadProject = async (projectId: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`http://localhost:5000/load-project/${projectId}`, {
                method: 'POST',
            });
            const data = await response.json();
            const project: Project = {
                id: data.project_id,
                name: newProjectName,
                base_dir: baseDir,
                created_date: data.created_date,
                modified_date: data.modified_date
            };
            if (response.ok) {
                fetchCurrentProject();
                if (onProjectLoaded) {
                    onProjectLoaded(project);
                }
                handleClose();
            } else {
                setError(data.error || 'Failed to load project');
            }
        } catch (err) {
            setError('Network error when loading project');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const closeProject = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:5000/close-project', {
                method: 'POST',
            });
            const data = await response.json();
            if (response.ok) {
                setCurrentProject(null);
            } else {
                setError(data.error || 'Failed to close project');
            }
        } catch (err) {
            setError('Network error when closing project');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentProject();
    }, []);

    const formatDate = (timestamp: number) => {
        try {
            return new Date(timestamp * 1000).toLocaleDateString();
        } catch (e) {
            return 'Invalid date';
        }
    };

    return (
        <>
            <Button
                variant="contained"
                color="primary"
                onClick={handleOpen}
                startIcon={<FolderIcon />}
            >
                Project Manager
            </Button>

            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    Project Manager
                    <IconButton
                        style={{ position: 'absolute', right: 8, top: 8 }}
                        onClick={fetchProjects}
                        disabled={loading}
                    >
                        <RefreshIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    {error && (
                        <Typography color="error" variant="body2" gutterBottom>
                            {error}
                        </Typography>
                    )}

                    {currentProject && (
                        <Box mb={3}>
                            <Typography variant="h6">Current Project</Typography>
                            <Typography variant="body1">
                                {currentProject.name} (ID: {currentProject.id})
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Directory: {currentProject.base_dir}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Created: {currentProject.created_date}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                Last modified: {currentProject.modified_date}
                            </Typography>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={closeProject}
                                disabled={loading}
                            >
                                Close Project
                            </Button>
                        </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Box mb={3}>
                        <Typography variant="h6">Create New Project</Typography>
                        <Box mt={1}>
                            <TextField
                                label="Project Name"
                                variant="outlined"
                                fullWidth
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                disabled={loading}
                                margin="normal"
                            />
                            <TextField
                                label="Base Directory Path"
                                variant="outlined"
                                fullWidth
                                value={baseDir}
                                onChange={(e) => setBaseDir(e.target.value)}
                                disabled={loading}
                                margin="normal"
                                helperText="Directory where the project will be stored"
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={handleSelectDirectory}
                                                    disabled={loading}
                                                    edge="end"
                                                    aria-label="select folder"
                                                >
                                                    <FolderIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }
                                }}
                            />
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={createProject}
                                disabled={loading || !newProjectName.trim() || !baseDir.trim()}
                                sx={{ mt: 2 }}
                            >
                                Create
                            </Button>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6">Existing Projects</Typography>
                    {loading ? (
                        <Box display="flex" justifyContent="center" my={3}>
                            <CircularProgress />
                        </Box>
                    ) : projects.length === 0 ? (
                        <Typography variant="body1" color="textSecondary" align="center" my={2}>
                            No projects found
                        </Typography>
                    ) : (
                        <List>
                            {projects.map((project) => (
                                <ListItem
                                    key={project.id}
                                    divider
                                    secondaryAction={
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            onClick={() => loadProject(project.id)}
                                            disabled={loading}
                                        >
                                            Load
                                        </Button>
                                    }
                                >
                                    <ListItemText
                                        primary={project.name}
                                        secondary={
                                            <>
                                                <Typography variant="body2" component="span" display="block">
                                                    Directory: {project.base_dir}
                                                </Typography>
                                                <Typography variant="body2" component="span">
                                                    Created: {project.created_date} | Modified: {project.modified_date}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ProjectManagingMenu;
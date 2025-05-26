import React, { useState } from 'react';
import { Add as AddIcon, Refresh as RefreshIcon, FolderOpen as FolderIcon } from '@mui/icons-material';
import {
    Button, Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemText,
    TextField, Typography, IconButton, Divider, Box, CircularProgress,
    InputAdornment
} from '@mui/material';
import { Project } from '../../models/Project';
import { useProjects } from '../../provider/ProjectProvider';

interface ProjectManagingMenuProps {
    onProjectLoaded?: (project: Project) => void;
}

const ProjectManagingMenu: React.FC<ProjectManagingMenuProps> = ({ onProjectLoaded }) => {
    const [open, setOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [baseDir, setBaseDir] = useState('');
    const {
        projects,
        currentProject,
        loading,
        error,
        fetchProjects,
        createProject,
        loadProject,
        closeProject
    } = useProjects();

    const handleSelectDirectory = async () => {
        try {
            const selectedPath = await window.myAPI.selectFolder();
            if (selectedPath) {
                setBaseDir(selectedPath);
            }
        } catch (err) {
            console.error('Error selecting directory:', err);
        }
    };

    const handleOpen = () => {
        setOpen(true);
        fetchProjects();
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim() || !baseDir.trim()) {
            return;
        }

        try {
            const project = await createProject({
                project_name: newProjectName,
                base_dir: baseDir
            });

            setNewProjectName('');
            setBaseDir('');

            if (onProjectLoaded) {
                onProjectLoaded(project);
            }

            handleClose();
        } catch (err) {
            console.error('Error creating project:', err);
        }
    };

    const handleLoadProject = async (projectId: string) => {
        try {
            await loadProject(projectId);

            if (currentProject && onProjectLoaded) {
                onProjectLoaded(currentProject);
            }

            handleClose();
        } catch (err) {
            console.error('Error loading project:', err);
        }
    };

    const handleCloseProject = async () => {
        try {
            await closeProject();
        } catch (err) {
            console.error('Error closing project:', err);
        }
    };

    return (
        <>
            <Button
                className='bg-transparent hover:bg-gray-200'
                onClick={handleOpen}
                startIcon={<FolderIcon />}
            >
                Project
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
                                Directory: {currentProject.directories.base}
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
                                onClick={handleCloseProject}
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
                                InputProps={{
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
                                }}
                            />
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={handleCreateProject}
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
                            {projects.map((project, index) => (
                                <ListItem
                                    key={index}
                                    divider
                                    secondaryAction={
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            onClick={() => handleLoadProject(project.id)}
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
                                                    Directory: {project.directories?.base || "N/A"}
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

import React, { useState, useEffect } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    List, ListItem, ListItemButton, ListItemText, Typography, Chip,
    TextField, Box
} from '@mui/material';

interface Session {
    session_id: string;
    session_name: string;
    created_at: string;
    ended_at?: string;
    is_active: boolean;
}

interface LoadPreviousSessionDialogProps {
    onSessionSelect: (sessionId: string) => void;
    className?: string;
}

const LoadPreviousSessionDialog: React.FC<LoadPreviousSessionDialogProps> = ({ onSessionSelect, className }) => {
    const [open, setOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/list-prev-sessions');
            const data = await response.json();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchSessions();
        }
    }, [open]);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSessionSelect = (sessionId: string) => {
        onSessionSelect(sessionId);
        setOpen(false);
    };

    const handleCreateDialogOpen = () => {
        setCreateDialogOpen(true);
    };

    const handleCreateDialogClose = () => {
        setCreateDialogOpen(false);
        setNewSessionName('');
    };

    const handleCreateSession = async () => {
        if (!newSessionName.trim()) return;

        try {
            const response = await fetch('http://localhost:5000/start-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ session_name: newSessionName }),
            });

            const data = await response.json();
            if (data.session_id) {
                handleCreateDialogClose();
                fetchSessions();
            }
        } catch (error) {
            console.error('Error creating session:', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <div className={className}>
            <Button variant="contained" color="primary" onClick={handleOpen}>
                Load Previous Session
            </Button>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Select a Session</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2, mt: 1 }}>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleCreateDialogOpen}
                            fullWidth
                        >
                            Create New Session
                        </Button>
                    </Box>
                    {loading ? (
                        <Typography>Loading sessions...</Typography>
                    ) : (
                        <List>
                            {sessions.length > 0 ? (
                                sessions.map((session) => (
                                    <ListItem disablePadding key={session.session_id}>
                                        <ListItemButton onClick={() => handleSessionSelect(session.session_id)}>
                                            <ListItemText
                                                primary={
                                                    <>
                                                        {session.session_name}
                                                        {session.is_active && (
                                                            <Chip
                                                                size="small"
                                                                label="Active"
                                                                color="success"
                                                                sx={{ ml: 1 }}
                                                            />
                                                        )}
                                                    </>
                                                }
                                                secondary={
                                                    <>
                                                        Created: {formatDate(session.created_at)}
                                                        {session.ended_at && <>
                                                            <br />
                                                            Ended: {formatDate(session.ended_at)}
                                                        </>}
                                                    </>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))
                            ) : (
                                <ListItem>
                                    <ListItemText primary="No sessions available" />
                                </ListItem>
                            )}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Create Session Dialog */}
            <Dialog open={createDialogOpen} onClose={handleCreateDialogClose}>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Session Name"
                        type="text"
                        fullWidth
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCreateDialogClose}>Cancel</Button>
                    <Button onClick={handleCreateSession} color="primary">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default LoadPreviousSessionDialog;
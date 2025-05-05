import React, { useState } from 'react';
import { Settings as SettingsIcon } from '@mui/icons-material';
import {

    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Box
} from '@mui/material';

interface AIProviderMenuProps {
    // Add props as needed
}

const AIProviderMenu: React.FC<AIProviderMenuProps> = () => {
    const [open, setOpen] = useState(false);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <>
            <Button
                className='bg-transparent hover:bg-gray-200'
                onClick={handleOpen}
                startIcon={<SettingsIcon />}
            >
                AI Provider
            </Button>

            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    AI Provider Settings
                </DialogTitle>

                <DialogContent>
                    <Box>
                        <Typography variant="h6">Configure AI Providers</Typography>
                    </Box>
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

export default AIProviderMenu;
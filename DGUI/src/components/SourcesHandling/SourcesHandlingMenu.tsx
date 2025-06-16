import {
    Button, Dialog, DialogTitle, DialogContent, Tabs, Tab, Box,
    Typography, IconButton, Alert
} from "@mui/material";
import {
    Folder as FolderIcon, Close as CloseIcon,
    TableChart as TableChartIcon, Source as SourceIcon
} from "@mui/icons-material";
import { useState, useEffect } from "react";
import SourceFilesTab from "./ProcessedFile/SourceFileTab";
import ExcelProcessingTab from "./ExcelProcessing/ExcelUpload/ExcelProcessingTab";


const SourcesHandlingMenu: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleOpen = () => setOpen(true);

    const handleClose = () => {
        setOpen(false);
        setUploadError(null);
    };

    return (
        <>
            <Button
                variant="text"
                color="inherit"
                onClick={handleOpen}
                startIcon={<FolderIcon />}
                sx={{ mr: 1 }}
            >
                Sources Manager
            </Button>

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: { height: '90vh' }
                }}
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h5">Sources Manager</Typography>
                        <IconButton onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                            <Tab
                                label="Excel Documents"
                                icon={<TableChartIcon />}
                                iconPosition="start"
                            />
                            <Tab
                                label="Source Files"
                                icon={<SourceIcon />}
                                iconPosition="start"
                            />
                        </Tabs>
                    </Box>

                    {uploadError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
                            {uploadError}
                        </Alert>
                    )}

                    {activeTab === 0 && <ExcelProcessingTab onError={setUploadError} />}
                    {activeTab === 1 && <SourceFilesTab onError={setUploadError} />}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SourcesHandlingMenu;
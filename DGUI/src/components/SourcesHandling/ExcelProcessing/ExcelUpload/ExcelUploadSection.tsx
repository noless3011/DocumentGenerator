import { Card, CardContent, Typography, Button, Box } from "@mui/material";
import { useRef } from "react";
import { Upload } from "@mui/icons-material";

interface ExcelUploadSectionProps {
    onFileUpload: (file: File) => Promise<void>;
    disabled?: boolean;
}

const ExcelUploadSection: React.FC<ExcelUploadSectionProps> = ({
    onFileUpload,
    disabled
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) onFileUpload(file);
    };

    return (
        <Box>
            <Typography variant="subtitle1">Upload Excel Files</Typography>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
            />
            <Button
                variant="contained"
                startIcon={<Upload />}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
            >
                Upload Excel File
            </Button>
        </Box>
    );
};

export default ExcelUploadSection;
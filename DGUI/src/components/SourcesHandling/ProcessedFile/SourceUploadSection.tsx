import { Box, Typography, Button } from "@mui/material";
import { useRef } from "react";
import { Upload } from "@mui/icons-material";

interface SourceUploadSectionProps {
    onFilesUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    acceptedTypes: string[];
}

const SourceUploadSection: React.FC<SourceUploadSectionProps> = ({
    onFilesUpload,
    disabled,
    acceptedTypes
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <Box>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept={acceptedTypes.join(',')}
                multiple
                onChange={onFilesUpload}
            />
            <Button
                variant="contained"
                startIcon={<Upload />}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
            >
                Upload Source Files
            </Button>
        </Box>
    );
};

export default SourceUploadSection;
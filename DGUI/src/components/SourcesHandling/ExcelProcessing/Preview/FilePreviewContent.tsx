import { Typography, Box } from "@mui/material";
import { Image as ImageIcon } from "@mui/icons-material";
import { SourceFile } from "../../../../models/SourceFile";

interface FilePreviewContentProps {
    file: SourceFile;
}

const FilePreviewContent: React.FC<FilePreviewContentProps> = ({ file }) => {
    const renderPreview = () => {
        switch (file.type.toLowerCase()) {
            case 'txt':
            case 'csv':
                return (
                    <Box
                        component="pre"
                        sx={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            maxHeight: '300px',
                            overflow: 'auto',
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            p: 2,
                            bgcolor: '#f5f5f5'
                        }}
                    >
                        {file.content || 'Content not available'}
                    </Box>
                ); case 'png':
            case 'jpg':
            case 'jpeg':
                const imageUrl = `http://localhost:5000/serve/processed/${encodeURIComponent(file.name)}`;
                return (
                    <Box sx={{ textAlign: 'center' }}>
                        <Box
                            component="img"
                            src={imageUrl}
                            alt={file.name}
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '300px',
                                objectFit: 'contain',
                                border: '1px solid #e0e0e0',
                                borderRadius: 1
                            }}
                            onError={(e) => {
                                console.error('Failed to load image:', imageUrl);
                                // Hide the broken image and show fallback
                                (e.target as HTMLImageElement).style.display = 'none';
                                const fallback = (e.target as HTMLImageElement).nextSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'block';
                            }}
                        />
                        <Box sx={{ display: 'none', mt: 2 }}>
                            <ImageIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                            <Typography variant="body2" color="text.secondary">
                                Image preview not available
                            </Typography>
                        </Box>
                    </Box>
                );
            default:
                return (
                    <Typography color="text.secondary">
                        Preview not available for this file type.
                    </Typography>
                );
        }
    };

    return <Box>{renderPreview()}</Box>;
};

export default FilePreviewContent;

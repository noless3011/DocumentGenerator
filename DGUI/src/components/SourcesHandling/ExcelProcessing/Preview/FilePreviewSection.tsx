import { Card, CardContent, Typography, Box } from "@mui/material";
import { Image as ImageIcon } from "@mui/icons-material";
import { SourceFile } from "../../../../models/SourceFile";

interface FilePreviewSectionProps {
    selectedFile?: SourceFile | null;
}

const FilePreviewSection: React.FC<FilePreviewSectionProps> = ({
    selectedFile
}) => {
    if (!selectedFile) {
        return (
            <Card>
                <CardContent>
                    <Typography variant="subtitle1">File Preview</Typography>
                    <Typography color="text.secondary">
                        Select a file to preview its contents.
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    const renderPreviewContent = () => {
        const fileType = selectedFile.type.toLowerCase();

        if (fileType === 'txt' || fileType === 'csv' || fileType === 'text') {
            return (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedFile.content || 'Content preview not available'}
                    </Typography>
                </Box>
            );
        } else if (['image'].includes(fileType)) {
            const imageUrl = `http://localhost:5000/serve/processed/${encodeURIComponent(selectedFile.name)}`;
            return (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <img
                        src={imageUrl}
                        alt={selectedFile.name}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            objectFit: 'contain'
                        }}
                        onError={(e) => {
                            // Fallback if image can't be loaded
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextSibling as HTMLElement;
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
        } else {
            return (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Preview not available for this file type
                    </Typography>
                </Box>
            );
        }
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="subtitle1">
                    Preview: {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Type: {selectedFile.type.toUpperCase()} | Size: {(selectedFile.size / 1024).toFixed(2)} KB
                </Typography>
                {renderPreviewContent()}
            </CardContent>
        </Card>
    );
};

export default FilePreviewSection;

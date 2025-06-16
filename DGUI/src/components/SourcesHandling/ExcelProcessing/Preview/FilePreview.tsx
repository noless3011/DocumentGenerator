import { Card, CardContent, Typography } from "@mui/material";
import { SourceFile } from "../../../../models/SourceFile";
import FilePreviewContent from "./FilePreviewContent";

interface FilePreviewProps {
    file: SourceFile | null;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
    if (!file) return null;

    return (
        <Card>
            <CardContent>
                <Typography variant="h6">File Preview: {file.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                    Type: {file.type.toUpperCase()} | Size: {(file.size / 1024).toFixed(2)} KB
                </Typography>
                <FilePreviewContent file={file} />
            </CardContent>
        </Card>
    );
};

export default FilePreview;
import { Card, CardContent, Typography, List, ListItem, ListItemText, IconButton, CircularProgress, Box } from "@mui/material";
import { Delete, Visibility } from "@mui/icons-material";
import { SourceFile } from "../../../models/SourceFile";

interface SourceFilesListProps {
    files?: SourceFile[];
    loading?: boolean;
    onFileSelect?: (file: SourceFile) => void;
    onFileDelete?: (file: SourceFile) => void;
}

const SourceFilesList: React.FC<SourceFilesListProps> = ({
    files = [],
    loading = false,
    onFileSelect,
    onFileDelete
}) => {
    return (
        <Card>
            <CardContent>
                <Typography variant="subtitle1">
                    Source Files ({files.length})
                </Typography>
                {loading ? (
                    <CircularProgress />
                ) : files.length === 0 ? (
                    <Typography color="text.secondary">
                        No source files uploaded yet.
                    </Typography>
                ) : (
                    <List>
                        {files.map((file, index) => (
                            <ListItem
                                key={index}
                                divider
                                secondaryAction={
                                    <Box>
                                        <IconButton
                                            size="small"
                                            onClick={() => onFileSelect?.(file)}
                                        >
                                            <Visibility />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => onFileDelete?.(file)}
                                        >
                                            <Delete />
                                        </IconButton>
                                    </Box>
                                }                            >
                                <ListItemText
                                    primary={file.name}
                                    secondary={`Type: ${file.type.toUpperCase()}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </CardContent>
        </Card>
    );
};

export default SourceFilesList;

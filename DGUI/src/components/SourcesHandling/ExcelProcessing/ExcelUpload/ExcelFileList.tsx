import { Card, CardContent, Typography, Stack } from "@mui/material";
import { ProjectFile } from "src/models/ProjectFile";
import ExcelFileCard from "./ExcelFileCard";

interface ExcelFilesListProps {
    files: ProjectFile[];
    selectedIndex: number;
    onFileSelect: (index: number) => void;
    onFileDelete: (fileName: string) => void;
}

const ExcelFilesList: React.FC<ExcelFilesListProps> = ({
    files,
    selectedIndex,
    onFileSelect,
    onFileDelete
}) => {
    return (
        <Card>
            <CardContent>
                <Typography variant="subtitle1">
                    Excel Files ({files.length})
                </Typography>
                {files.length === 0 ? (
                    <Typography color="text.secondary">
                        No Excel files uploaded yet.
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        {files.map((file, index) => (
                            <ExcelFileCard
                                key={index}
                                file={file}
                                isSelected={selectedIndex === index}
                                onSelect={() => onFileSelect(index)}
                                onDelete={() => onFileDelete(file.name)}
                            />
                        ))}
                    </Stack>
                )}
            </CardContent>
        </Card >
    );
};

export default ExcelFilesList;

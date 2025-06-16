import { Card, CardContent, Box, Typography, IconButton } from "@mui/material";
import { Delete } from "@mui/icons-material";
import { ProjectFile } from "src/models/ProjectFile";

interface ExcelFileCardProps {
    file: ProjectFile;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

const ExcelFileCard: React.FC<ExcelFileCardProps> = ({
    file,
    isSelected,
    onSelect,
    onDelete
}) => {
    return (
        <Card
            variant="outlined"
            sx={{
                cursor: 'pointer',
                bgcolor: isSelected ? 'action.selected' : 'background.paper'
            }}
            onClick={onSelect}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="subtitle2" noWrap>
                            {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {file.added_date}
                        </Typography>
                    </Box>
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <Delete />
                    </IconButton>
                </Box>
            </CardContent>
        </Card>
    );
};

export default ExcelFileCard;
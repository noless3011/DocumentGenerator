import { Card, CardContent, FormControlLabel, Checkbox, FormControl, InputLabel, Select, Button, MenuItem, Box } from "@mui/material";
import { Visibility as VisibilityIcon } from "@mui/icons-material";
import { SheetOption } from "../../../../models/SourceFile";

interface SheetConfigCardProps {
    className?: string;
    sheet: SheetOption;
    index: number;
    onSelectionChange: (index: number) => void;
    onOptionChange: (index: number, option: string) => void;
    onPreview: (sheetName: string) => void;
}

const SheetConfigCard: React.FC<SheetConfigCardProps> = ({
    className,
    sheet,
    index,
    onSelectionChange,
    onOptionChange,
    onPreview
}) => {
    return (
        <Card variant="outlined" className={className}>
            <CardContent sx={{ px: 2 }} className="py-1">
                <Box display="flex" alignItems="center" gap={1.5}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={sheet.selected}
                                onChange={() => onSelectionChange(index)}
                                size="small"
                            />
                        }
                        label={sheet.name}
                        sx={{
                            minWidth: 0,
                            flex: 1,
                            '& .MuiFormControlLabel-label': { fontSize: '0.875rem' }
                        }}
                    />
                    {sheet.selected && (
                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel size="small" sx={{ fontSize: '0.75rem' }}>Process as</InputLabel>
                            <Select
                                size="small"
                                value={sheet.selectedOption}
                                onChange={(e) => onOptionChange(index, e.target.value)}
                                label="Process as"
                                sx={{ fontSize: '0.875rem' }}
                            >
                                <MenuItem value="table" sx={{ fontSize: '0.875rem' }}>Table (CSV)</MenuItem>
                                <MenuItem value="ui" sx={{ fontSize: '0.875rem' }}>UI (Image)</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                    <Button
                        size="small"
                        startIcon={<VisibilityIcon fontSize="small" />}
                        onClick={() => onPreview(sheet.name)}
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', py: 0.5 }}
                    >
                        Preview
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default SheetConfigCard;
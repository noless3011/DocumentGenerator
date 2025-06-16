import {
    Card, CardContent, Typography, CircularProgress, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper
} from "@mui/material";
import { SheetOption } from "../../../../models/SourceFile";
import SheetConfigCard from "./SheetConfigCard";

interface SheetProcessingSectionProps {
    sheets: SheetOption[];
    loading: boolean;
    onSheetSelectionChange: (index: number) => void;
    onOptionChange: (sheetIndex: number, option: string) => void;
    onSheetPreview: (sheetName: string) => void;
    previewData?: any[][];
    previewHeaders?: string[];
    currentPreviewSheet?: string;
}

const SheetProcessingSection: React.FC<SheetProcessingSectionProps> = ({
    sheets,
    loading,
    onSheetSelectionChange,
    onOptionChange,
    onSheetPreview,
    previewData = [],
    previewHeaders = [],
    currentPreviewSheet = ''
}) => {
    if (sheets.length === 0) return null;

    return (
        <Card>
            <CardContent>
                <Typography variant="subtitle1">Sheet Processing Options</Typography>
                {loading ? (
                    <CircularProgress />
                ) : (
                    <Card className="w-full flex flex-row ">
                        <CardContent className="w-1/3 h-96 overflow-y-scroll">
                            <Stack spacing={2}
                                className="w-full">
                                {sheets.map((sheet, index) => (
                                    <SheetConfigCard
                                        className=""
                                        key={index}
                                        sheet={sheet}
                                        index={index}
                                        onSelectionChange={onSheetSelectionChange}
                                        onOptionChange={onOptionChange}
                                        onPreview={onSheetPreview}
                                    />
                                ))}
                            </Stack>

                        </CardContent>
                        {currentPreviewSheet && previewHeaders.length > 0 && (
                            <Card sx={{ mt: 2 }} className="w-2/3 h-96">
                                <CardContent>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Preview: {currentPreviewSheet}
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    {previewHeaders.map((header, index) => (
                                                        <TableCell key={index}>{header}</TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {previewData.slice(0, 10).map((row, rowIndex) => (
                                                    <TableRow key={rowIndex}>
                                                        {row.map((cell, cellIndex) => (
                                                            <TableCell key={cellIndex}>
                                                                {String(cell || '')}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    {previewData.length > 10 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            Showing first 10 rows of {previewData.length} total rows
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </Card>
                )}

                {/* Sheet Preview */}

            </CardContent>
        </Card>
    );

}

export default SheetProcessingSection;
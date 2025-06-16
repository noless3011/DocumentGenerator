import { Card, CardContent, Typography, Alert, Box, Chip } from "@mui/material";

interface ProcessingResultsSectionProps {
    results?: any;
}

const ProcessingResultsSection: React.FC<ProcessingResultsSectionProps> = ({ results }) => {
    if (!results) return null;

    return (
        <Card>
            <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                    Processing Results
                </Typography>
                <Alert
                    severity={results.status === 'success' ? 'success' : 'warning'}
                    sx={{ mb: 2 }}
                >
                    Processing completed with status: {results.status}
                </Alert>

                {Object.entries(results.results || {}).map(([fileName, fileResults]) => (
                    <Box key={fileName} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">{fileName}</Typography>
                        {Object.entries(fileResults as any).map(([sheetName, result]: [string, any]) => (
                            <Box key={sheetName} sx={{ ml: 2, mb: 1 }}>
                                <Chip
                                    label={`${sheetName}: ${result.status}`}
                                    color={result.status === 'success' ? 'success' : 'error'}
                                    size="small"
                                    sx={{ mr: 1 }}
                                />
                                {result.output_path && (
                                    <Typography variant="caption" color="text.secondary">
                                        Output: {result.output_path}
                                    </Typography>
                                )}
                                {result.error && (
                                    <Typography variant="caption" color="error">
                                        Error: {result.error}
                                    </Typography>
                                )}
                            </Box>
                        ))}
                    </Box>
                ))}
            </CardContent>
        </Card>
    );
};

export default ProcessingResultsSection;

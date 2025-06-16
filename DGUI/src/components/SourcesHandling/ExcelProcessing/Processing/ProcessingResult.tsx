import { Card, CardContent, Typography, Alert } from "@mui/material";
import ProcessingResultsList from "./ProcessingResultsList";

interface ProcessingResultsProps {
    results: any;
}

const ProcessingResults: React.FC<ProcessingResultsProps> = ({ results }) => {
    if (!results) return null;

    return (
        <Card>
            <CardContent>
                <Typography variant="subtitle1">Processing Results</Typography>
                <Alert severity={results.status === 'success' ? 'success' : 'warning'}>
                    Processing completed with status: {results.status}
                </Alert>
                <ProcessingResultsList results={results.results} />
            </CardContent>
        </Card>
    );
};

export default ProcessingResults;
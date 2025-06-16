import { Card, CardContent, Typography, List, ListItem, ListItemText } from "@mui/material";

interface ProcessingResultsListProps {
    results: any[];
}

const ProcessingResultsList: React.FC<ProcessingResultsListProps> = ({ results }) => {
    if (!results || results.length === 0) {
        return (
            <Typography color="text.secondary">
                No processing results available.
            </Typography>
        );
    }

    return (
        <List>
            {results.map((result, index) => (
                <ListItem key={index}>
                    <ListItemText
                        primary={result.filename || `Result ${index + 1}`}
                        secondary={result.message || result.status}
                    />
                </ListItem>
            ))}
        </List>
    );
};

export default ProcessingResultsList;

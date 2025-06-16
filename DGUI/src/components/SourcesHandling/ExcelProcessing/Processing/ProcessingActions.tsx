import { Card, CardContent, Button, Box, CircularProgress } from "@mui/material";
import { PlayArrow, Stop, GetApp } from "@mui/icons-material";

interface ProcessingActionsProps {
    onProcess?: () => void;
    onStop?: () => void;
    onGenerate?: () => void;
    isProcessing?: boolean;
    isGenerating?: boolean;
    canProcess?: boolean;
    canGenerate?: boolean;
    disabled?: boolean;
}

const ProcessingActions: React.FC<ProcessingActionsProps> = ({
    onProcess,
    onStop,
    onGenerate,
    isProcessing = false,
    isGenerating = false,
    canProcess = false,
    canGenerate = false,
    disabled = false
}) => {
    return (
        <Card>
            <CardContent>                <Box display="flex" gap={2}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={isProcessing ? <CircularProgress size={20} /> : <PlayArrow />}
                    onClick={onProcess}
                    disabled={!canProcess || isProcessing || disabled}
                >
                    {isProcessing ? 'Processing...' : 'Process Sheets'}
                </Button>

                {isProcessing && (
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<Stop />}
                        onClick={onStop}
                    >
                        Stop Processing
                    </Button>
                )}

                <Button
                    variant="contained"
                    color="secondary"
                    startIcon={isGenerating ? <CircularProgress size={20} /> : <GetApp />}
                    onClick={onGenerate}
                    disabled={!canGenerate || isGenerating || disabled}
                >
                    {isGenerating ? 'Generating...' : 'Generate Documents'}
                </Button>
            </Box>
            </CardContent>
        </Card>
    );
};

export default ProcessingActions;

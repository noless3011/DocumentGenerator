import { useCallback, useEffect, useState } from "react";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import MDEditor from "@uiw/react-md-editor";

import {
    Box,
    Button,
    Checkbox,
    Fab,
    FormControlLabel,
    FormGroup,
    Paper,
    Radio,
    RadioGroup,
    Tooltip,
    Typography
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";

interface MarkdownViewProps {
    fileDir: string;
    className?: string;
    setLoading?: (loading: boolean) => void;
}

const MarkdownView: React.FC<MarkdownViewProps> = ({
    fileDir,
    className,
    setLoading
}) => {
    const [markdownContent, setMarkdownContent] = useState<string>("");
    const [snapLeft, setSnapLeft] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [showDragBar, setShowDragBar] = useState(true);
    const [enableHighlight, setEnableHighlight] = useState(true);
    const [enableScroll, setEnableScroll] = useState(true);
    const [showToolBar, setShowToolBar] = useState(true);
    const [topToolBar, setTopToolBar] = useState(true);
    const [overflow, setOverflow] = useState(false);
    const [mode, setMode] = useState<"edit" | "live" | "preview">("edit");

    const loadMarkdown = useCallback(() => {
        if (setLoading) setLoading(true);
        window.myAPI
            .readFileAsText(fileDir)
            .then((data: string) => {
                setMarkdownContent(data);
                if (setLoading) setLoading(false);
            })
            .catch((error) => {
                console.error("Error loading markdown:", error);
                if (setLoading) setLoading(false);
            });
    }, [fileDir, setLoading]);

    useEffect(() => {
        loadMarkdown();

        window.myAPI.watchFile(fileDir);
        const removeFileChangeListener = window.myAPI.onFileChange(
            (changedFilePath: string) => {
                if (changedFilePath === fileDir) {
                    console.log(`Markdown file ${fileDir} changed, reloading.`);
                    loadMarkdown();
                }
            }
        );

        return () => {
            window.myAPI.unwatchFile(fileDir);
            if (removeFileChangeListener) {
                removeFileChangeListener();
            }
        };
    }, [fileDir, loadMarkdown]);

    return (
        <Box
            className={`h-full markdown-view ${className}`}
            sx={{ bgcolor: "transparent", color: "#fff", position: "relative", height: "100%" }}
        >
            <Tooltip title="Settings">
                <Fab
                    color="primary"
                    size="medium"
                    onClick={() => setSettingsOpen(prev => !prev)}
                    sx={{
                        position: "absolute",
                        bottom: 16,
                        right: snapLeft ? "auto" : 16,
                        left: snapLeft ? 16 : "auto",
                        zIndex: 20
                    }}
                >
                    <SettingsIcon />
                </Fab>
            </Tooltip>
            {settingsOpen && (
                <Paper
                    elevation={6}
                    sx={{
                        position: "absolute",
                        bottom: 80,
                        right: snapLeft ? "auto" : 16,
                        left: snapLeft ? 16 : "auto",
                        zIndex: 20,
                        p: 2,
                        width: 300,
                        bgcolor: "transparent",
                        color: "#000"
                    }}
                >


                    <Typography variant="subtitle1" gutterBottom>
                        Editor Settings
                    </Typography>

                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showDragBar}
                                    onChange={() => setShowDragBar(!showDragBar)}
                                />
                            }
                            label="Show Drag Bar"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={enableHighlight}
                                    onChange={() => setEnableHighlight(!enableHighlight)}
                                />
                            }
                            label="Enable highlight"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={enableScroll}
                                    onChange={() => setEnableScroll(!enableScroll)}
                                />
                            }
                            label="Enable Scroll"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showToolBar}
                                    onChange={() => setShowToolBar(!showToolBar)}
                                />
                            }
                            label="Show ToolBar"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={topToolBar}
                                    onChange={() => setTopToolBar(!topToolBar)}
                                />
                            }
                            label="Top ToolBar"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={overflow}
                                    onChange={() => setOverflow(!overflow)}
                                />
                            }
                            label="Overflow"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={snapLeft}
                                    onChange={() => setSnapLeft(!snapLeft)}
                                />
                            }
                            label="Snap to Left"
                        />
                    </FormGroup>

                    <RadioGroup
                        value={mode}
                        onChange={(e) => setMode(e.target.value as "edit" | "live" | "preview")}
                    >
                        <FormControlLabel value="edit" control={<Radio />} label="Edit" />
                        <FormControlLabel value="live" control={<Radio />} label="Live Preview" />
                        <FormControlLabel value="preview" control={<Radio />} label="Preview" />
                    </RadioGroup>
                </Paper>
            )}


            <MDEditor
                value={markdownContent}
                onChange={setMarkdownContent}
                height="100%"
                visibleDragbar={showDragBar}
                preview={mode}
                enableScroll={enableScroll}
                hideToolbar={!showToolBar}
            />
        </Box>
    );
};

export default MarkdownView;

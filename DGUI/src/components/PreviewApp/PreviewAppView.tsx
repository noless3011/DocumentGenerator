import React, { useEffect, useState } from 'react';

interface PreviewAppViewProps {
    fileDir?: string;
    setLoading?: (loading: boolean) => void;
}

const PreviewAppView: React.FC<PreviewAppViewProps> = ({ fileDir, setLoading }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPreviewApp = async () => {
            if (!fileDir) return;

            if (setLoading) setLoading(true);
            setError(null);

            try {
                // First check if preview already exists
                const response = await fetch(`http://localhost:5000/generate/preview`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html',
                    },
                });

                if (response.ok) {
                    // Preview exists, use it
                    setPreviewUrl(`http://localhost:5000/generate/preview`);
                    if (setLoading) setLoading(false);
                    return;
                }

                // If preview doesn't exist, generate one
                console.log("Preview app not found, generating a new one...");

                // Make request to generate preview app
                const generateResponse = await fetch('http://localhost:5000/generate/preview-app', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        projectDir: fileDir
                    }),
                });

                if (!generateResponse.ok) {
                    throw new Error(`Failed to generate preview app: ${generateResponse.statusText}`);
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                // Now try to load the preview again
                setPreviewUrl(`http://localhost:5000/generate/preview`);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load preview app');
                console.error('Error with preview app:', err);
            } finally {
                if (setLoading) setLoading(false);
            }
        };

        loadPreviewApp();
    }, [fileDir, setLoading]);

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="h-[960px] flex flex-col flex-1">
            <h2 className="text-xl font-bold mb-4">Preview App</h2>
            <div className="flex-1 border rounded overflow-hidden">
                {previewUrl ? (
                    <iframe
                        src={previewUrl}
                        title="Preview App"
                        className="w-full h-full"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                ) : (
                    <div>No preview available</div>
                )}
            </div>
        </div>
    );
};

export default PreviewAppView;

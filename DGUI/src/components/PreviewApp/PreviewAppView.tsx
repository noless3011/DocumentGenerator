import React, { useEffect, useState } from 'react';

interface PreviewAppViewProps {
    project: any;
    fileDir?: string;
}

const PreviewAppView: React.FC<PreviewAppViewProps> = ({ project }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadPreviewApp = async () => {
            if (!project) return;

            setLoading(true);
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
                    setLoading(false);
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
                        projectDir: `${project.project_dir}/output`
                    }),
                });

                if (!generateResponse.ok) {
                    throw new Error(`Failed to generate preview app: ${generateResponse.statusText}`);
                }

                // Generation succeeded, now load the preview
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to ensure file is ready

                // Now try to load the preview again
                setPreviewUrl(`http://localhost:5000/generate/preview`);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load preview app');
                console.error('Error with preview app:', err);
            } finally {
                setLoading(false);
            }
        };

        loadPreviewApp();
    }, [project]);

    if (loading) {
        return <div>Loading preview...</div>;
    }

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
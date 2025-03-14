import React, { useState, useEffect } from 'react';

interface ImageViewProps {
    fileDir: string;
}

const ImageView: React.FC<ImageViewProps> = ({ fileDir }) => {
    const [imageData, setImageData] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadImage = async () => {
            if (!fileDir) {
                setImageData(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const base64Data = await window.myAPI.readFileAsBase64(fileDir);

                // Check if the result is an error message
                if (typeof base64Data === 'string' && base64Data.startsWith('Error reading file:')) {
                    throw new Error(base64Data);
                }

                // Determine the image format from file extension
                const fileExtension = fileDir.split('.').pop()?.toLowerCase() || '';
                let mimeType = 'image/jpeg'; // default

                switch (fileExtension) {
                    case 'png': mimeType = 'image/png'; break;
                    case 'gif': mimeType = 'image/gif'; break;
                    case 'svg': mimeType = 'image/svg+xml'; break;
                    case 'webp': mimeType = 'image/webp'; break;
                    case 'bmp': mimeType = 'image/bmp'; break;
                    case 'jpg':
                    case 'jpeg': mimeType = 'image/jpeg'; break;
                }

                setImageData(`data:${mimeType};base64,${base64Data}`);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load image');
            } finally {
                setIsLoading(false);
            }
        };

        loadImage();
    }, [fileDir]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-full">Loading image...</div>;
    }

    if (error) {
        return <div className="text-red-500 p-4">Error: {error}</div>;
    }

    if (!imageData) {
        return <div className="p-4">No image to display</div>;
    }

    return (
        <div className="h-full flex items-center justify-center overflow-auto bg-white rounded-lg shadow p-2">
            <img
                src={imageData}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
            />
        </div>
    );
};

export default ImageView;
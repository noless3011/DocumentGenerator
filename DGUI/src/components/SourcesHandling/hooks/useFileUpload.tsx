import { useState, useCallback } from "react";

export const useFileUpload = () => {
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const uploadFile = useCallback(async (file: File, type: string) => {
        // Upload logic
    }, []);

    return {
        uploadError,
        uploading,
        uploadFile,
        clearError: () => setUploadError(null)
    };
};

export default useFileUpload;
import { useState, useCallback } from "react";
import { SheetOption } from "../../../models/SourceFile";

export const useExcelProcessing = () => {
    const [sheets, setSheets] = useState<SheetOption[]>([]);
    const [selectedFileIndex, setSelectedFileIndex] = useState(-1);
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState(null);
    
    const handleFileSelect = useCallback(async (index: number) => {
      // File selection logic
    }, []);
    
    const processSheets = useCallback(async () => {
      // Processing logic
    }, []);
    
    return {
      sheets,
      selectedFileIndex,
      processing,
      results,
      handleFileSelect,
      processSheets,
      // other methods
    };
  };


export default useExcelProcessing;
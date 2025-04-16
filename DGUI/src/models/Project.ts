export interface Project {
    id: string;
    name: string;
    created_date: string; // ISO date string format
    modified_date: string; // ISO date string format
    description?: string;
    tags?: string[];
    directories: {
        base: string;
        project: string;
        input: string;
        processed: string;
        output: string;
    };
    files?: {
        input: Array<{ path: string, name: string, added_date: string }>;
        processed: Array<{ path: string, name: string, added_date: string }>;
        output: Array<{ path: string, name: string, added_date: string }>;
    };
    processing_history?: Array<{
        timestamp: string;
        operation: string;
        input_files: string[];
        output_files: string[];
        details: Record<string, any>;
    }>;
}
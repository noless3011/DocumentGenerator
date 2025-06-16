export interface SourceFile {
    name: string;
    type: string;
    size: number;
    path: string;
    content?: string;
    lastModified?: number;
}

export interface SheetOption {
    name: string;
    selected: boolean;
    selectedOption: 'table' | 'ui';
}

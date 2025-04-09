import React, { CSSProperties, useCallback } from 'react';
import { EdgeTypes } from './TableEdge';

interface EdgeTypeMenuProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string; // Edge ID
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    onSelectEdgeType: (edgeId: string, type: EdgeTypes) => void;
    onDeleteEdge: (edgeId: string) => void;
}

const EdgeTypeMenu: React.FC<EdgeTypeMenuProps> = ({
    id,
    top,
    left,
    right,
    bottom,
    onSelectEdgeType,
    onDeleteEdge,
    className,
    ...props
}) => {
    const handleTypeSelect = useCallback((type: EdgeTypes) => {
        onSelectEdgeType(id, type);
    }, [id, onSelectEdgeType]);

    const handleDeleteEdge = useCallback(() => {
        onDeleteEdge(id);
    }, [id, onDeleteEdge]);

    const menuStyle: CSSProperties = {
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        zIndex: 1000,
    };

    const combinedClassName = `edge-type-menu bg-white border border-gray-300 rounded shadow-lg p-2 min-w-[150px] ${className || ''}`;

    return (
        <div
            style={menuStyle}
            className={combinedClassName}
            {...props}
        >
            <p className="text-xs text-gray-500 mb-2 border-b pb-1">
                <small>Edge: {id}</small>
            </p>

            <div className="flex flex-col space-y-1">
                {Object.values(EdgeTypes)
                    .filter(value => typeof value === 'string')
                    .map((enumValue) => (
                        <button
                            key={enumValue}
                            className="flex items-center p-2 hover:bg-gray-100 rounded text-left w-full"
                            onClick={() => handleTypeSelect(enumValue as EdgeTypes)}
                        >
                            <span className="text-sm">{enumValue}</span>
                        </button>
                    ))}
                <button
                    className="flex items-center p-2 hover:bg-red-100 rounded text-left w-full text-red-600"
                    onClick={handleDeleteEdge}
                >
                    <span className="text-sm">Delete</span>
                </button>
            </div>
        </div>
    );
};

export default EdgeTypeMenu;
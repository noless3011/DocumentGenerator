import React, { CSSProperties, useCallback } from 'react';
import { RelationshipType } from '../../../models/ClassDiagram';
interface EdgeTypeMenuProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string; // Edge ID
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    onSelectEdgeType: (edgeId: string, type: RelationshipType) => void;
    onDeleteEdge: (edgeId: string) => void;
    onFlipDirection: (edgeId: string) => void;
}

const EdgeTypeMenu: React.FC<EdgeTypeMenuProps> = ({
    id,
    top,
    left,
    right,
    bottom,
    onSelectEdgeType,
    onDeleteEdge,
    onFlipDirection,
    className,
    ...props
}) => {

    const handleTypeSelect = useCallback((type: RelationshipType) => {
        onSelectEdgeType(id, type);
    }, [id, onSelectEdgeType]);

    const handleDeleteEdge = useCallback(() => {
        onDeleteEdge(id);
    }, [id, onDeleteEdge]);

    const handleFlipDirection = useCallback(() => {
        onFlipDirection(id);
    }, [id, onFlipDirection]);

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
                {/* Iterate over enum VALUES directly */}
                {Object.values(RelationshipType)
                    // Filter out the numeric keys if it's a numeric enum
                    .filter(value => typeof value === 'string')
                    .map((enumValue) => (
                        <button
                            key={enumValue} // Use the value as key
                            className="flex items-center p-2 hover:bg-gray-100 rounded text-left w-full" // Added text-left and w-full
                            onClick={() => handleTypeSelect(enumValue as RelationshipType)}
                        >
                            {/* Display the string value */}
                            <span className="text-sm">{enumValue}</span>
                        </button>
                    ))}
                {/* swap direction button */}
                <button
                    className="flex items-center p-2 hover:bg-gray-100 rounded text-left w-full" // Added text-left and w-full
                    onClick={() => handleFlipDirection()}
                >
                    {/* Display the string value */}
                    <span className="text-sm">Flip</span>
                </button>

                {/*delete button */}
                <button
                    className="flex items-center p-2 hover:bg-gray-100 rounded text-left w-full" // Added text-left and w-full
                    onClick={() => handleDeleteEdge()}
                >
                    {/* Display the string value */}
                    <span className="text-sm text-red-600">Delete</span>
                </button>

            </div>
        </div>
    );
};

export default EdgeTypeMenu;
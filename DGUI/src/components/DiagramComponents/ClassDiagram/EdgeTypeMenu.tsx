import React, { CSSProperties, useCallback } from 'react';
import { EdgeTypes } from './ClassEdge';
interface EdgeTypeMenuProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string; // Edge ID
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    onSelectEdgeType: (edgeId: string, type: EdgeTypes) => void;
}

const EdgeTypeMenu: React.FC<EdgeTypeMenuProps> = ({
    id,
    top,
    left,
    right,
    bottom,
    onSelectEdgeType,
    className,
    ...props
}) => {

    const handleTypeSelect = useCallback((type: EdgeTypes) => {
        onSelectEdgeType(id, type);
    }, [id, onSelectEdgeType]);

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
                {Object.entries(EdgeTypes).map(([key, value], index, array) => index < array.length / 2 ? ( // Because enum will create a array with twice the size of the number of values
                    <button
                        key={key}
                        className="flex items-center p-2 hover:bg-gray-100 rounded"
                        onClick={() => handleTypeSelect(value as EdgeTypes)}
                    >
                        <span className="text-sm">{value}</span>
                    </button>
                ) : null)}
            </div>
        </div>
    );
};

export default EdgeTypeMenu;
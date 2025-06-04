import React, { CSSProperties, useCallback } from 'react';
import { RelationshipCardinality } from '../../../models/DatabaseDiagram';

interface EdgeTypeMenuProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string;
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    onSelectCardinality: (edgeId: string, cardinality: RelationshipCardinality) => void;
    onDeleteEdge: (edgeId: string) => void;
    onFlipDirection: (edgeId: string) => void;
}

const EdgeTypeMenu: React.FC<EdgeTypeMenuProps> = ({
    id,
    top,
    left,
    right,
    bottom,
    onSelectCardinality,
    onDeleteEdge,
    onFlipDirection,
    className,
    ...props
}) => {
    const handleCardinalitySelect = useCallback((cardinality: RelationshipCardinality) => {
        onSelectCardinality(id, cardinality);
    }, [id, onSelectCardinality]);

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
                <small>Relationship: {id}</small>
            </p>

            <div className="flex flex-col space-y-1">
                {/* Cardinality options */}
                {Object.values(RelationshipCardinality)
                    .filter(value => typeof value === 'string')
                    .map((enumValue) => (
                        <button
                            key={enumValue}
                            className="flex items-center p-2 hover:bg-gray-100 rounded text-left w-full"
                            onClick={() => handleCardinalitySelect(enumValue as RelationshipCardinality)}
                        >
                            <span className="text-sm">
                                {enumValue === RelationshipCardinality.OneToOne ? 'One-to-One (1:1)' :
                                    enumValue === RelationshipCardinality.OneToMany ? 'One-to-Many (1:N)' :
                                        enumValue === RelationshipCardinality.ManyToOne ? 'Many-to-One (N:1)' :
                                            enumValue === RelationshipCardinality.ManyToMany ? 'Many-to-Many (N:N)' : enumValue}
                            </span>
                        </button>
                    ))}

                {/* Flip direction button */}
                <button
                    className="flex items-center p-2 hover:bg-gray-100 rounded text-left w-full"
                    onClick={() => handleFlipDirection()}
                >
                    <span className="text-sm">Flip Direction</span>
                </button>

                {/* Delete button */}
                <button
                    className="flex items-center p-2 hover:bg-gray-100 rounded text-left w-full"
                    onClick={() => handleDeleteEdge()}
                >
                    <span className="text-sm text-red-600">Delete</span>
                </button>

            </div>
        </div>
    );
};

export default EdgeTypeMenu;
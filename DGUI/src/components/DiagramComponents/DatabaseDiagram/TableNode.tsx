import React, { useState, useEffect } from 'react';
import { NodeProps, Position, Handle, NodeResizer, Node } from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { Table, Column } from "../../../models/DatabaseDiagram";
import { useDatabaseDiagramContext } from '../../../provider/diagram_providers/DatabaseDiagramProvider';

type TableNode = Node<{ table: Table }, 'table'>;

const TableNode = ({ data, selected, id }: NodeProps<TableNode>) => {
    const { updateTable, deleteTableNode, edges, deleteEdge } = useDatabaseDiagramContext();

    const [localTable, setLocalTable] = useState<Table>(data.table);
    const [isColumnsExpanded, setIsColumnsExpanded] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        updateTable(id, localTable);
    }, [id, localTable, updateTable]);

    useEffect(() => {
        if (!selected) {
            setIsExpanded(false);
        }
    }, [selected]);

    const handleTableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalTable(prev => ({ ...prev, name: e.target.value }));
    };

    const handleColumnChange = (index: number, field: keyof Column, value: string | string[]) => {
        setLocalTable(prev => {
            const newColumns = [...prev.columns];
            if (field === 'constraints') {
                newColumns[index] = { ...newColumns[index], [field]: value as string[] };
            } else {
                newColumns[index] = { ...newColumns[index], [field]: value as string };
            }
            return { ...prev, columns: newColumns };
        });
    };

    const handleAddColumn = () => {
        setLocalTable(prev => ({
            ...prev,
            columns: [...prev.columns, { name: '', dataType: '', constraints: [] }]
        }));
    };

    const handleDeleteColumn = (index: number) => {
        setLocalTable(prev => {
            const newColumns = [...prev.columns];
            newColumns.splice(index, 1);
            return { ...prev, columns: newColumns };
        });
    };

    const toggleExpanded = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleDeleteNode = (e: React.MouseEvent) => {
        e.stopPropagation();

        const connectedEdges = edges.filter(edge => edge.source === id || edge.target === id);
        connectedEdges.forEach(edge => {
            deleteEdge(edge.id);
        });
        deleteTableNode(id);
    };

    const isPrimaryKey = (columnName: string) => {
        return localTable.primaryKey?.includes(columnName) || false;
    };

    const togglePrimaryKey = (columnName: string) => {
        setLocalTable(prev => {
            const currentPK = prev.primaryKey || [];
            const newPK = currentPK.includes(columnName)
                ? currentPK.filter(pk => pk !== columnName)
                : [...currentPK, columnName];
            return { ...prev, primaryKey: newPK };
        });
    };

    if (!isExpanded) {
        return (
            <div className="border border-gray-300 rounded bg-blue-50 flex flex-col shadow-md overflow-hidden">
                {/* Handles for connections */}
                <Handle className="w-3 h-3 rounded-full bg-green-500" type="source" position={Position.Top} id="a" />
                <Handle className="w-3 h-3 rounded-full bg-green-500" type="source" position={Position.Right} id="b" />
                <Handle className="w-3 h-3 rounded-full bg-green-500" type="source" position={Position.Bottom} id="c" />
                <Handle className="w-3 h-3 rounded-full bg-green-500" type="source" position={Position.Left} id="d" />

                {/* Header with drag handle and expand button */}
                <div className="relative">
                    <div className="drag-handle_custom h-6 bg-green-500 cursor-move"></div>
                    <button
                        className="nodrag absolute left-1 top-1 bg-green-600 hover:bg-green-700 text-white rounded w-4 h-4 flex items-center justify-center text-xs focus:outline-none"
                        onClick={toggleExpanded}
                        title="Expand node"
                    >
                        ⤢
                    </button>
                    <button
                        className="nodrag absolute right-1 top-1 bg-red-600 hover:bg-red-700 text-white rounded w-4 h-4 flex items-center justify-center text-xs focus:outline-none"
                        onClick={handleDeleteNode}
                        title="Delete node">
                        X
                    </button>
                </div>

                {/* Table name */}
                <div className="bg-green-100 p-2 border-b border-green-200">
                    <div className="font-bold text-center text-lg">{localTable.name || "TableName"}</div>
                </div>

                {/* Compact columns list */}
                {localTable.columns.length > 0 && (
                    <div className="p-2 bg-white">
                        <ul className="list-none text-sm">
                            {localTable.columns.map((col, index) => (
                                <li key={index} className="truncate">
                                    {isPrimaryKey(col.name) && <span className="text-yellow-600">🔑</span>}
                                    <span className="text-blue-700">{col.name}</span>
                                    {col.dataType && <>: <span className="text-green-600">{col.dataType}</span></>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="border border-gray-300 rounded bg-blue-50 flex flex-col h-full shadow-md overflow-hidden">
            <NodeResizer
                isVisible={selected}
                minWidth={200}
                minHeight={120}
                lineStyle={{ border: '2px solid #10b981' }}
            />

            {/* Handles for connections */}
            <Handle className="w-3 h-3 rounded-full bg-green-500" type="source" position={Position.Top} id="a" />
            <Handle className="w-3 h-3 rounded-full bg-green-500" type="source" position={Position.Right} id="b" />
            <Handle className="w-3 h-3 rounded-full bg-green-500" type="source" position={Position.Bottom} id="c" />
            <Handle className="w-3 h-3 rounded-full bg-green-500" type="source" position={Position.Left} id="d" />

            <div className="flex-grow flex flex-col min-w-0 max-h-full overflow-auto">
                {/* Header with drag handle and collapse button */}
                <div className="relative">
                    <div className="drag-handle_custom h-6 bg-green-500 cursor-move"></div>
                    <button
                        className="nodrag absolute left-1 top-1 bg-green-600 hover:bg-green-700 text-white rounded w-4 h-4 flex items-center justify-center text-xs focus:outline-none"
                        onClick={toggleExpanded}
                        title="Collapse node"
                    >
                        ⤡
                    </button>
                    <button
                        className="nodrag absolute right-1 top-1 bg-red-600 hover:bg-red-700 text-white rounded w-4 h-4 flex items-center justify-center text-xs focus:outline-none"
                        onClick={handleDeleteNode}
                        title="Delete node">
                        X
                    </button>
                </div>

                {/* Table name section */}
                <div className="bg-green-100 p-2 border-b border-green-200">
                    <input
                        type="text"
                        value={localTable.name}
                        onChange={handleTableNameChange}
                        className="nodrag w-full text-center font-bold text-lg bg-transparent border border-transparent focus:border-green-300 rounded px-1 py-0.5 focus:outline-none"
                        placeholder="TableName"
                    />
                </div>

                {/* Columns section */}
                <div className="border-b border-gray-200 bg-white">
                    <div
                        className="flex justify-between items-center p-2 bg-gray-50 cursor-pointer"
                        onClick={() => setIsColumnsExpanded(!isColumnsExpanded)}
                    >
                        <h3 className="font-semibold text-gray-700">Columns</h3>
                        <span>{isColumnsExpanded ? '−' : '+'}</span>
                    </div>

                    {isColumnsExpanded && (
                        <div className="p-2 max-h-60 overflow-y-auto">
                            <ul className="list-none space-y-2">
                                {localTable.columns.map((col, index) => (
                                    <li key={index} className="text-sm group border-b border-gray-100 pb-2">
                                        <div className="flex items-center mb-1">
                                            <button
                                                className="nodrag mr-1 text-xs text-yellow-600 hover:text-yellow-800"
                                                onClick={() => togglePrimaryKey(col.name)}
                                                title="Toggle Primary Key"
                                            >
                                                {isPrimaryKey(col.name) ? '🔑' : '○'}
                                            </button>
                                            <input
                                                type="text"
                                                value={col.name}
                                                onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                                                className="nodrag border border-transparent bg-transparent flex-1 min-w-0 focus:border-green-300 rounded px-1 focus:outline-none font-medium"
                                                placeholder="column_name"
                                            />
                                            <button
                                                className="nodrag invisible group-hover:visible ml-1 text-red-500 hover:text-red-700 focus:outline-none w-6 h-6 flex items-center justify-center"
                                                onClick={() => handleDeleteColumn(index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className="ml-6">
                                            <input
                                                type="text"
                                                value={col.dataType}
                                                onChange={(e) => handleColumnChange(index, 'dataType', e.target.value)}
                                                className="nodrag border border-transparent bg-transparent w-full focus:border-green-300 rounded px-1 focus:outline-none text-green-600"
                                                placeholder="DATA_TYPE"
                                            />
                                            {col.description !== undefined && (
                                                <input
                                                    type="text"
                                                    value={col.description}
                                                    onChange={(e) => handleColumnChange(index, 'description', e.target.value)}
                                                    className="nodrag border border-transparent bg-transparent w-full focus:border-green-300 rounded px-1 focus:outline-none text-gray-500 text-xs mt-1"
                                                    placeholder="Description (optional)"
                                                />
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <button
                                className="nodrag mt-2 text-xs text-green-600 hover:text-green-800 flex items-center"
                                onClick={handleAddColumn}
                            >
                                <span className="mr-1">+</span> Add column
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TableNode;
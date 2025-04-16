import React, { useEffect, useState } from 'react';
import { Node, NodeProps, Position, Handle, NodeResizer, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/base.css';

type Column = {
    name: string;
    type: string;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    isNotNull?: boolean;
    isUnique?: boolean;
}

export type TableNodeData = {
    name: string;
    columns: Column[];
}

type TableNode = Node<{ table: TableNodeData }, 'table'>;

const TableNode = ({ data, selected, id }: NodeProps<TableNode>) => {
    const { setNodes } = useReactFlow();

    const [tableName, setTableName] = useState(data.table.name);
    const [columns, setColumns] = useState(data.table.columns);

    useEffect(() => {
        // Update the node data in React Flow whenever the tableName or columns change
        setNodes((nds) =>
            nds.map((node) =>
                node.id === id
                    ? {
                        ...node,
                        data: {
                            ...node.data,
                            table: {
                                name: tableName,
                                columns: columns,
                            },
                        },
                    }
                    : node
            )
        );
    }, [tableName, columns, id, setNodes]);

    const resizeBorderStyle = {
        border: '2px solid aqua',
    };

    const getColumnIcon = (column: Column) => {
        if (column.isPrimaryKey) return '🔑';
        if (column.isForeignKey) return '🔗';
        return '';
    };

    return (
        <div className='border border-gray-300 rounded bg-blue-200 flex flex-col h-full overflow-hidden'>
            <NodeResizer isVisible={selected} minWidth={180} minHeight={100} lineStyle={resizeBorderStyle} />
            <Handle className='w-3 h-3 rounded-full !bg-green-500' type="source" position={Position.Top} id="a" />
            <Handle className='w-3 h-3 rounded-full !bg-green-500' type="source" position={Position.Right} id="b" />
            <Handle className='w-3 h-3 rounded-full !bg-green-500' type="source" position={Position.Bottom} id="c" />
            <Handle className='w-3 h-3 rounded-full !bg-green-500' type="source" position={Position.Left} id="d" />

            <div className="p-2.5 flex-grow flex flex-col min-w-0">
                <div className='drag-handle_custom pb-1 mb-1 h-6 bg-blue-400 rounded-lg'></div>
                <div className='text-center font-bold text-lg border-b-2 border-solid border-gray-800 pb-1 mb-1 bg-blue-300'>
                    <input
                        type="text"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        className="nodrag border-none bg-transparent w-full text-center font-bold focus:outline-none"
                        placeholder="TableName"
                    />
                </div>
                <div className='text-lg min-h-[30px] flex-shrink-0'>
                    <ul className='list-none pl-1 space-y-0.5'>
                        {columns.map((column, index) => (
                            <li key={index} className="flex items-center text-lg border-b border-gray-300 py-1">
                                <div className="mr-1 w-5 text-center">
                                    {getColumnIcon(column)}
                                </div>
                                <input
                                    type="text"
                                    value={column.name}
                                    onChange={(e) => {
                                        const newColumns = [...columns];
                                        newColumns[index].name = e.target.value;
                                        setColumns(newColumns);
                                    }}
                                    className="nodrag border-none bg-transparent flex-1 min-w-0 focus:outline-none focus:bg-white focus:bg-opacity-50 rounded px-0.5"
                                    placeholder="columnName"
                                />
                                <span className="mx-0.5">:</span>
                                <input
                                    type="text"
                                    value={column.type}
                                    onChange={(e) => {
                                        const newColumns = [...columns];
                                        newColumns[index].type = e.target.value;
                                        setColumns(newColumns);
                                    }}
                                    className="nodrag border-none bg-transparent flex-1 min-w-0 focus:outline-none focus:bg-white focus:bg-opacity-50 rounded px-0.5"
                                    placeholder="Type"
                                />
                                <div className="flex ml-1 space-x-1">
                                    <button
                                        className={`nodrag w-6 h-6 text-xs rounded ${column.isPrimaryKey ? 'bg-yellow-400' : 'bg-gray-200'}`}
                                        title="Primary Key"
                                        onClick={() => {
                                            const newColumns = [...columns];
                                            newColumns[index].isPrimaryKey = !newColumns[index].isPrimaryKey;
                                            setColumns(newColumns);
                                        }}
                                    >
                                        PK
                                    </button>
                                    <button
                                        className={`nodrag w-6 h-6 text-xs rounded ${column.isForeignKey ? 'bg-blue-400' : 'bg-gray-200'}`}
                                        title="Foreign Key"
                                        onClick={() => {
                                            const newColumns = [...columns];
                                            newColumns[index].isForeignKey = !newColumns[index].isForeignKey;
                                            setColumns(newColumns);
                                        }}
                                    >
                                        FK
                                    </button>
                                    <button
                                        className={`nodrag w-6 h-6 text-xs rounded ${column.isNotNull ? 'bg-red-400' : 'bg-gray-200'}`}
                                        title="Not Null"
                                        onClick={() => {
                                            const newColumns = [...columns];
                                            newColumns[index].isNotNull = !newColumns[index].isNotNull;
                                            setColumns(newColumns);
                                        }}
                                    >
                                        NN
                                    </button>
                                </div>
                            </li>
                        ))}
                        {/* Placeholder for adding new columns */}
                        <li
                            className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 py-1"
                            onClick={() => {
                                setColumns([...columns, { name: '', type: '' }]);
                            }}
                        >
                            + Add column
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TableNode;
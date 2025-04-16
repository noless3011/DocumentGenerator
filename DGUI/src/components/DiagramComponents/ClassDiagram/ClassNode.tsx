import React, { useState, useEffect } from 'react';
import { NodeProps, Position, Handle, NodeResizer, Node } from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { Class, Attribute, Method } from "../../../models/ClassDiagram";
import { useDiagramContext } from '../../DiagramComponents/ClassDiagram/DiagramProvider';

type ClassNode = Node<{ class: Class }, 'class'>;

const ClassNode = ({ data, selected, id }: NodeProps<ClassNode>) => {
    const { updateClass } = useDiagramContext();

    const [localClass, setLocalClass] = useState<Class>(data.class);
    const [isAttributesExpanded, setIsAttributesExpanded] = useState(true);
    const [isMethodsExpanded, setIsMethodsExpanded] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    // Update the context when local state changes
    useEffect(() => {
        updateClass(id, localClass);
    }, [id, localClass, updateClass]);

    // Expand the node when selected
    useEffect(() => {
        if (!selected) {
            setIsExpanded(false);
        }
    }, [selected]);

    // Handle class name change
    const handleClassNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalClass(prev => ({ ...prev, name: e.target.value }));
    };

    // Handle class type change
    const handleClassTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalClass(prev => ({ ...prev, type: e.target.value }));
    };

    // Handle attribute changes
    const handleAttributeChange = (index: number, field: keyof Attribute, value: string) => {
        setLocalClass(prev => {
            const newAttributes = [...prev.attributes];
            newAttributes[index] = { ...newAttributes[index], [field]: value };
            return { ...prev, attributes: newAttributes };
        });
    };

    // Handle attribute addition
    const handleAddAttribute = () => {
        setLocalClass(prev => ({
            ...prev,
            attributes: [...prev.attributes, { name: '', type: '', visibility: '+' }]
        }));
    };

    // Handle attribute deletion
    const handleDeleteAttribute = (index: number) => {
        setLocalClass(prev => {
            const newAttributes = [...prev.attributes];
            newAttributes.splice(index, 1);
            return { ...prev, attributes: newAttributes };
        });
    };

    // Similar handlers for methods...
    const handleMethodChange = (index: number, field: keyof Omit<Method, 'parameters'>, value: string) => {
        setLocalClass(prev => {
            const newMethods = [...prev.methods];
            newMethods[index] = { ...newMethods[index], [field]: value };
            return { ...prev, methods: newMethods };
        });
    };

    const handleAddMethod = () => {
        setLocalClass(prev => ({
            ...prev,
            methods: [...prev.methods, { name: '', returnType: '', parameters: [], visibility: '+' }]
        }));
    };

    const handleDeleteMethod = (index: number) => {
        setLocalClass(prev => {
            const newMethods = [...prev.methods];
            newMethods.splice(index, 1);
            return { ...prev, methods: newMethods };
        });
    };

    const handleParameterChange = (methodIndex: number, paramIndex: number, field: keyof Method['parameters'][0], value: string) => {
        setLocalClass(prev => {
            const newMethods = [...prev.methods];
            const newParams = [...newMethods[methodIndex].parameters];
            newParams[paramIndex] = { ...newParams[paramIndex], [field]: value };
            newMethods[methodIndex] = { ...newMethods[methodIndex], parameters: newParams };
            return { ...prev, methods: newMethods };
        });
    };

    const handleAddParameter = (methodIndex: number) => {
        setLocalClass(prev => {
            const newMethods = [...prev.methods];
            newMethods[methodIndex] = {
                ...newMethods[methodIndex],
                parameters: [...newMethods[methodIndex].parameters, { name: '', type: '' }]
            };
            return { ...prev, methods: newMethods };
        });
    };

    const handleDeleteParameter = (methodIndex: number, paramIndex: number) => {
        setLocalClass(prev => {
            const newMethods = [...prev.methods];
            const newParams = [...newMethods[methodIndex].parameters];
            newParams.splice(paramIndex, 1);
            newMethods[methodIndex] = { ...newMethods[methodIndex], parameters: newParams };
            return { ...prev, methods: newMethods };
        });
    };

    // Toggle expanded view
    const toggleExpanded = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent node selection when clicking the button
        setIsExpanded(!isExpanded);
    };

    // Render compact view
    if (!isExpanded) {
        return (
            <div className="border border-gray-300 rounded bg-yellow-50 flex flex-col shadow-md overflow-hidden">
                {/* Handles for connections */}
                <Handle className="w-3 h-3 rounded-full bg-blue-500" type="source" position={Position.Top} id="a" />
                <Handle className="w-3 h-3 rounded-full bg-blue-500" type="source" position={Position.Right} id="b" />
                <Handle className="w-3 h-3 rounded-full bg-blue-500" type="source" position={Position.Bottom} id="c" />
                <Handle className="w-3 h-3 rounded-full bg-blue-500" type="source" position={Position.Left} id="d" />

                {/* Header with drag handle and expand button */}
                <div className="relative">
                    <div className="drag-handle_custom h-6 bg-blue-500 cursor-move"></div>
                    <button
                        className="nodrag absolute right-1 top-1 bg-blue-600 hover:bg-blue-700 text-white rounded w-4 h-4 flex items-center justify-center text-xs focus:outline-none"
                        onClick={toggleExpanded}
                        title="Expand node"
                    >
                        ⤢
                    </button>
                </div>

                {/* Class name and type */}
                <div className="bg-blue-100 p-2 border-b border-blue-200">
                    <div className="font-bold text-center text-lg">{localClass.name || "ClassName"}</div>
                    {localClass.type && <div className="text-center text-sm italic">{localClass.type}</div>}
                </div>

                {/* Compact attributes list */}
                {localClass.attributes.length > 0 && (
                    <div className="p-2 border-b border-gray-200 bg-white">
                        <ul className="list-none text-sm">
                            {localClass.attributes.map((attr, index) => (
                                <li key={index} className="truncate">
                                    <span className="text-gray-500">{attr.visibility}</span>{" "}
                                    <span className="text-blue-700">{attr.name}</span>
                                    {attr.type && <>: <span className="text-green-600">{attr.type}</span></>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Compact methods list */}
                {localClass.methods.length > 0 && (
                    <div className="p-2 bg-white">
                        <ul className="list-none text-sm">
                            {localClass.methods.map((method, index) => (
                                <li key={index} className="truncate">
                                    <span className="text-gray-500">{method.visibility}</span>{" "}
                                    <span className="text-purple-700">{method.name}</span>
                                    <span className="text-gray-700">(</span>
                                    {method.parameters.map((p, i) => (
                                        <React.Fragment key={i}>
                                            {i > 0 && <span className="text-gray-700">, </span>}
                                            <span className="text-blue-700">{p.name}</span>
                                            {p.type && <>: <span className="text-green-600">{p.type}</span></>}
                                        </React.Fragment>
                                    ))}
                                    <span className="text-gray-700">)</span>
                                    {method.returnType && <>: <span className="text-green-600">{method.returnType}</span></>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    // Render full editable view
    return (
        <div className="border border-gray-300 rounded bg-yellow-50 flex flex-col h-full shadow-md overflow-hidden">
            <NodeResizer
                isVisible={selected}
                minWidth={180}
                minHeight={100}
                lineStyle={{ border: '2px solid #38bdf8' }}
            />

            {/* Handles for connections */}
            <Handle className="w-3 h-3 rounded-full bg-blue-500" type="source" position={Position.Top} id="a" />
            <Handle className="w-3 h-3 rounded-full bg-blue-500" type="source" position={Position.Right} id="b" />
            <Handle className="w-3 h-3 rounded-full bg-blue-500" type="source" position={Position.Bottom} id="c" />
            <Handle className="w-3 h-3 rounded-full bg-blue-500" type="source" position={Position.Left} id="d" />

            <div className="flex-grow flex flex-col min-w-0 max-h-full overflow-auto">
                {/* Header with drag handle and collapse button */}
                <div className="relative">
                    <div className="drag-handle_custom h-6 bg-blue-500 cursor-move"></div>
                    <button
                        className="nodrag absolute right-1 top-1 bg-blue-600 hover:bg-blue-700 text-white rounded w-4 h-4 flex items-center justify-center text-xs focus:outline-none"
                        onClick={toggleExpanded}
                        title="Collapse node"
                    >
                        ⤡
                    </button>
                </div>

                {/* Class name section */}
                <div className="bg-blue-100 p-2 border-b border-blue-200">
                    <input
                        type="text"
                        value={localClass.name}
                        onChange={handleClassNameChange}
                        className="nodrag w-full text-center font-bold text-lg bg-transparent border border-transparent focus:border-blue-300 rounded px-1 py-0.5 focus:outline-none"
                        placeholder="ClassName"
                    />
                    <input
                        type="text"
                        value={localClass.type}
                        onChange={handleClassTypeChange}
                        className="nodrag w-full text-center text-sm italic bg-transparent border border-transparent focus:border-blue-300 rounded px-1 focus:outline-none"
                        placeholder="class type"
                    />
                </div>

                {/* Attributes section */}
                <div className="border-b border-gray-200 bg-white">
                    <div
                        className="flex justify-between items-center p-2 bg-gray-50 cursor-pointer"
                        onClick={() => setIsAttributesExpanded(!isAttributesExpanded)}
                    >
                        <h3 className="font-semibold text-gray-700">Attributes</h3>
                        <span>{isAttributesExpanded ? '−' : '+'}</span>
                    </div>

                    {isAttributesExpanded && (
                        <div className="p-2 max-h-40 overflow-y-auto">
                            <ul className="list-none space-y-1">
                                {localClass.attributes.map((attr, index) => (
                                    <li key={index} className="flex items-center text-sm group">
                                        <select
                                            value={attr.visibility}
                                            onChange={(e) => handleAttributeChange(index, 'visibility', e.target.value)}
                                            className="nodrag border border-transparent bg-transparent focus:border-blue-300 rounded w-8 focus:outline-none"
                                        >
                                            <option value="+">+</option>
                                            <option value="-">-</option>
                                            <option value="#">#</option>
                                            <option value="~">~</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={attr.name}
                                            onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                                            className="nodrag border border-transparent bg-transparent flex-1 min-w-0 focus:border-blue-300 rounded px-1 focus:outline-none"
                                            placeholder="attributeName"
                                        />
                                        <span className="mx-1">:</span>
                                        <input
                                            type="text"
                                            value={attr.type}
                                            onChange={(e) => handleAttributeChange(index, 'type', e.target.value)}
                                            className="nodrag border border-transparent bg-transparent flex-1 min-w-0 focus:border-blue-300 rounded px-1 focus:outline-none"
                                            placeholder="Type"
                                        />
                                        <button
                                            className="nodrag invisible group-hover:visible ml-1 text-red-500 hover:text-red-700 focus:outline-none w-6 h-6 flex items-center justify-center"
                                            onClick={() => handleDeleteAttribute(index)}
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <button
                                className="nodrag mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                onClick={handleAddAttribute}
                            >
                                <span className="mr-1">+</span> Add attribute
                            </button>
                        </div>
                    )}
                </div>

                {/* Methods section */}
                <div className="bg-white">
                    <div
                        className="flex justify-between items-center p-2 bg-gray-50 cursor-pointer"
                        onClick={() => setIsMethodsExpanded(!isMethodsExpanded)}
                    >
                        <h3 className="font-semibold text-gray-700">Methods</h3>
                        <span>{isMethodsExpanded ? '−' : '+'}</span>
                    </div>

                    {isMethodsExpanded && (
                        <div className="p-2 max-h-60 overflow-y-auto">
                            <ul className="list-none space-y-3">
                                {localClass.methods.map((method, index) => (
                                    <li key={index} className="text-sm group">
                                        <div className="flex items-center">
                                            <select
                                                value={method.visibility}
                                                onChange={(e) => handleMethodChange(index, 'visibility', e.target.value)}
                                                className="nodrag border border-transparent bg-transparent focus:border-blue-300 rounded w-8 focus:outline-none"
                                            >
                                                <option value="+">+</option>
                                                <option value="-">-</option>
                                                <option value="#">#</option>
                                                <option value="~">~</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={method.name}
                                                onChange={(e) => handleMethodChange(index, 'name', e.target.value)}
                                                className="nodrag border border-transparent bg-transparent flex-1 min-w-0 focus:border-blue-300 rounded px-1 focus:outline-none"
                                                placeholder="methodName"
                                            />
                                            <button
                                                className="nodrag invisible group-hover:visible ml-1 text-red-500 hover:text-red-700 focus:outline-none w-6 h-6 flex items-center justify-center"
                                                onClick={() => handleDeleteMethod(index)}
                                            >
                                                ×
                                            </button>
                                        </div>

                                        {/* Parameters section */}
                                        <div className="ml-8 mt-1">
                                            <div className="flex items-center text-xs text-gray-500 mb-1">
                                                <span>Parameters:</span>
                                            </div>

                                            {method.parameters.map((param, paramIndex) => (
                                                <div key={paramIndex} className="flex items-center mb-1 ml-2 text-xs group">
                                                    <input
                                                        type="text"
                                                        value={param.name}
                                                        onChange={(e) => handleParameterChange(index, paramIndex, 'name', e.target.value)}
                                                        className="nodrag border border-transparent bg-transparent w-20 focus:border-blue-300 rounded px-1 focus:outline-none"
                                                        placeholder="param"
                                                    />
                                                    <span className="mx-1">:</span>
                                                    <input
                                                        type="text"
                                                        value={param.type}
                                                        onChange={(e) => handleParameterChange(index, paramIndex, 'type', e.target.value)}
                                                        className="nodrag border border-transparent bg-transparent w-20 focus:border-blue-300 rounded px-1 focus:outline-none"
                                                        placeholder="type"
                                                    />
                                                    <button
                                                        className="nodrag invisible group-hover:visible ml-1 text-red-500 hover:text-red-700 focus:outline-none"
                                                        onClick={() => handleDeleteParameter(index, paramIndex)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                className="nodrag ml-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                                onClick={() => handleAddParameter(index)}
                                            >
                                                <span className="mr-1">+</span> Add parameter
                                            </button>
                                        </div>

                                        {/* Return type */}
                                        <div className="ml-8 mt-1 flex items-center">
                                            <span className="text-xs text-gray-500 mr-2">Return:</span>
                                            <input
                                                type="text"
                                                value={method.returnType}
                                                onChange={(e) => handleMethodChange(index, 'returnType', e.target.value)}
                                                className="nodrag border border-transparent bg-transparent flex-1 min-w-0 focus:border-blue-300 rounded px-1 text-xs focus:outline-none"
                                                placeholder="ReturnType"
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <button
                                className="nodrag mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                onClick={handleAddMethod}
                            >
                                <span className="mr-1">+</span> Add method
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassNode;
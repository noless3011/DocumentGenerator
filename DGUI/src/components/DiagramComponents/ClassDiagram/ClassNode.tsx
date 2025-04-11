import React, { useEffect, useState } from 'react';
import { Node, NodeProps, Position, Handle, NodeResizer, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { Class, Attribute, Method, Parameter } from "../../../models/ClassDiagram";


type ClassNode = Node<{ class: Class }, 'class'>;

const ClassNode = ({ data, selected, id }: NodeProps<ClassNode>) => {
    const { setNodes } = useReactFlow();

    const [className, setClassName] = useState(data.class.name);
    const [classType, setClassType] = useState(data.class.type);
    const [attributes, setAttributes] = useState(data.class.attributes);
    const [methods, setMethods] = useState(data.class.methods);

    useEffect(() => {
        // Update the node data in React Flow whenever the state changes
        setNodes((nds) =>
            nds.map((node) =>
                node.id === id
                    ? {
                        ...node,
                        data: {
                            ...node.data,
                            class: {
                                name: className,
                                type: classType,
                                attributes: attributes,
                                methods: methods,
                            },
                        },
                    }
                    : node
            )
        );
    }, [className, classType, attributes, methods, id, setNodes]);

    const resizeBorderStyle = {
        border: '2px solid aqua',
    };

    return (
        <div className='border border-gray-300 rounded bg-yellow-300 flex flex-col h-full overflow-hidden'>
            <NodeResizer isVisible={selected} minWidth={150} minHeight={100} lineStyle={resizeBorderStyle} />
            <Handle className='w-3 h-3 rounded-full !bg-blue-500' type="source" position={Position.Top} id="a" />
            <Handle className='w-3 h-3 rounded-full !bg-blue-500' type="source" position={Position.Right} id="b" />
            <Handle className='w-3 h-3 rounded-full !bg-blue-500' type="source" position={Position.Bottom} id="c" />
            <Handle className='w-3 h-3 rounded-full !bg-blue-500' type="source" position={Position.Left} id="d" />

            <div className="p-2.5 flex-grow flex flex-col min-w-0">
                <div className='drag-handle_custom pb-1 mb-1 h-6 bg-slate-400 rounded-lg'></div>
                <div className='text-center font-bold text-lg border-b-2 border-solid border-gray-800 pb-1 mb-1'>
                    <input
                        type="text"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        className="nodrag border-none bg-transparent w-full text-center font-bold focus:outline-none"
                        placeholder="ClassName"
                    />
                    <input
                        type="text"
                        value={classType}
                        onChange={(e) => setClassType(e.target.value)}
                        className="nodrag border-none bg-transparent w-full text-center text-sm italic focus:outline-none"
                        placeholder="class type"
                    />
                </div>
                <div className='text-lg border-b-2 border-solid border-gray-800 pb-1 mb-1 min-h-[30px] flex-shrink-0'>
                    <div className='font-semibold mb-0.5'>Attributes</div>
                    <ul className='list-none pl-1 space-y-0.5'>
                        {attributes.map((attr, index) => (
                            <li key={index} className="flex items-center text-lg">
                                <select
                                    value={attr.visibility}
                                    onChange={(e) => {
                                        const newAttributes = [...attributes];
                                        newAttributes[index].visibility = e.target.value;
                                        setAttributes(newAttributes);
                                    }}
                                    className="nodrag border-none bg-transparent focus:outline-none focus:bg-white focus:bg-opacity-50 rounded w-8"
                                >
                                    <option value="+">+</option>
                                    <option value="-">-</option>
                                    <option value="#">#</option>
                                    <option value="~">~</option>
                                </select>
                                <input
                                    type="text"
                                    value={attr.name}
                                    onChange={(e) => {
                                        const newAttributes = [...attributes];
                                        newAttributes[index].name = e.target.value;
                                        setAttributes(newAttributes);
                                    }}
                                    className="nodrag border-none bg-transparent flex-1 min-w-0 focus:outline-none focus:bg-white focus:bg-opacity-50 rounded px-0.5"
                                    placeholder="attributeName"
                                />
                                <span className="mx-0.5">:</span>
                                <input
                                    type="text"
                                    value={attr.type}
                                    onChange={(e) => {
                                        const newAttributes = [...attributes];
                                        newAttributes[index].type = e.target.value;
                                        setAttributes(newAttributes);
                                    }}
                                    className="nodrag border-none bg-transparent flex-1 min-w-0 focus:outline-none focus:bg-white focus:bg-opacity-50 rounded px-0.5"
                                    placeholder="Type"
                                />
                                <button
                                    className="nodrag ml-1 text-red-500 hover:text-red-700 focus:outline-none"
                                    onClick={() => {
                                        const newAttributes = [...attributes];
                                        newAttributes.splice(index, 1);
                                        setAttributes(newAttributes);
                                    }}
                                >
                                    -
                                </button>
                            </li>
                        ))}
                        <li className="text-xs text-gray-400 cursor-pointer hover:text-gray-600"
                            onClick={() => {
                                setAttributes([...attributes, { name: '', type: '', visibility: '+' }]);
                            }}>
                            + Add attribute
                        </li>
                    </ul>
                </div>
                <div className='text-lg min-h-[30px] flex-shrink-0'>
                    <div className='font-semibold mb-0.5'>Methods</div>
                    <ul className='list-none pl-1 space-y-0.5'>
                        {methods.map((method, index) => (
                            <li key={index} className="flex items-center text-lg flex-wrap">
                                <select
                                    value={method.visibility}
                                    onChange={(e) => {
                                        const newMethods = [...methods];
                                        newMethods[index].visibility = e.target.value;
                                        setMethods(newMethods);
                                    }}
                                    className="nodrag border-none bg-transparent focus:outline-none focus:bg-white focus:bg-opacity-50 rounded w-8"
                                >
                                    <option value="+">+</option>
                                    <option value="-">-</option>
                                    <option value="#">#</option>
                                    <option value="~">~</option>
                                </select>
                                <input
                                    type="text"
                                    value={method.name}
                                    onChange={(e) => {
                                        const newMethods = [...methods];
                                        newMethods[index].name = e.target.value;
                                        setMethods(newMethods);
                                    }}
                                    className="nodrag border-none bg-transparent flex-1 min-w-0 focus:outline-none focus:bg-white focus:bg-opacity-50 rounded px-0.5"
                                    placeholder="methodName"
                                />
                                <span className="mx-0.5">(</span>
                                <div className="flex flex-wrap">
                                    {method.parameters.map((param, paramIndex) => (
                                        <div key={paramIndex} className="flex items-center mr-1">
                                            <input
                                                type="text"
                                                value={param.name}
                                                onChange={(e) => {
                                                    const newMethods = [...methods];
                                                    newMethods[index].parameters[paramIndex].name = e.target.value;
                                                    setMethods(newMethods);
                                                }}
                                                className="nodrag border-none bg-transparent w-16 focus:outline-none focus:bg-white focus:bg-opacity-50 rounded px-0.5"
                                                placeholder="param"
                                            />
                                            <span>:</span>
                                            <input
                                                type="text"
                                                value={param.type}
                                                onChange={(e) => {
                                                    const newMethods = [...methods];
                                                    newMethods[index].parameters[paramIndex].type = e.target.value;
                                                    setMethods(newMethods);
                                                }}
                                                className="nodrag border-none bg-transparent w-16 focus:outline-none focus:bg-white focus:bg-opacity-50 rounded px-0.5"
                                                placeholder="type"
                                            />
                                            <button
                                                className="nodrag text-red-500 hover:text-red-700 focus:outline-none ml-0.5"
                                                onClick={() => {
                                                    const newMethods = [...methods];
                                                    newMethods[index].parameters.splice(paramIndex, 1);
                                                    setMethods(newMethods);
                                                }}
                                            >
                                                -
                                            </button>
                                            {paramIndex < method.parameters.length - 1 && <span>,</span>}
                                        </div>
                                    ))}
                                    <button
                                        className="nodrag text-xs text-blue-500 cursor-pointer hover:text-blue-700"
                                        onClick={() => {
                                            const newMethods = [...methods];
                                            newMethods[index].parameters.push({ name: '', type: '' });
                                            setMethods(newMethods);
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                                <span>):</span>
                                <input
                                    type="text"
                                    value={method.returnType}
                                    onChange={(e) => {
                                        const newMethods = [...methods];
                                        newMethods[index].returnType = e.target.value;
                                        setMethods(newMethods);
                                    }}
                                    className="nodrag border-none bg-transparent flex-1 min-w-0 focus:outline-none focus:bg-white focus:bg-opacity-50 rounded px-0.5"
                                    placeholder="ReturnType"
                                />
                                <button
                                    className="nodrag ml-1 text-red-500 hover:text-red-700 focus:outline-none"
                                    onClick={() => {
                                        const newMethods = [...methods];
                                        newMethods.splice(index, 1);
                                        setMethods(newMethods);
                                    }}
                                >
                                    -
                                </button>
                            </li>
                        ))}
                        <li className="text-xs text-gray-400 cursor-pointer hover:text-gray-600"
                            onClick={() => {
                                setMethods([...methods, { name: '', returnType: '', parameters: [], visibility: '+' }]);
                            }}>
                            + Add method
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ClassNode;
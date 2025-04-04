import React, { ChangeEvent, useEffect, useState } from 'react';
import { Node, NodeProps, Position, Handle, NodeResizer, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/base.css';

type Attributes = {
    name: string;
    type: string;
}
type Methods = {
    name: string;
    returnType: string;
}

export type ClassNodeData = {
    name: string;
    attributes: Attributes[];
    methods: Methods[];
}


type ClassNode = Node<{ class: ClassNodeData }, 'class'>;

const ClassNode = ({ data, selected, id }: NodeProps<ClassNode>) => {
    const { setNodes } = useReactFlow();

    const [className, setClassName] = useState(data.class.name);
    const [attributes, setAttributes] = useState(data.class.attributes);
    const [methods, setMethods] = useState(data.class.methods);

    useEffect(() => {
        // Update the node data in React Flow whenever the className, attributes, or methods change
        setNodes((nds) =>
            nds.map((node) =>
                node.id === id
                    ? {
                        ...node,
                        data: {
                            ...node.data,
                            class: {
                                name: className,
                                attributes: attributes,
                                methods: methods,
                            },
                        },
                    }
                    : node
            )
        );
    }, [className, attributes, methods]);
    const resizeBorderStyle = {

        border: '2px solid aqua',
    };
    return (
        <div className='border border-gray-300 rounded bg-yellow-200 flex flex-col h-full overflow-hidden'>
            <NodeResizer isVisible={selected} minWidth={150} minHeight={100} lineStyle={resizeBorderStyle} />
            <Handle className='w-3 h-3 rounded-full !bg-blue-500' type="source" position={Position.Top} id="a" />
            <Handle className='w-3 h-3 rounded-full !bg-blue-500' type="source" position={Position.Right} id="b" />
            <Handle className='w-3 h-3 rounded-full !bg-blue-500' type="source" position={Position.Bottom} id="c" />
            <Handle className='w-3 h-3 rounded-full !bg-blue-500' type="source" position={Position.Left} id="d" />

            <div className="p-2.5 flex-grow flex flex-col min-w-0">
                <div className='drag-handle_custom pb-1 mb-1 h-10 bg-blue-400 rounded-lg'></div>
                <div className='text-center font-bold text-lg border-b-2 border-solid border-gray-800 pb-1 mb-1'>
                    <input
                        type="text"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        className="nodrag border-none bg-transparent w-full text-center font-bold focus:outline-none"
                        placeholder="ClassName"
                    />
                </div>
                <div className='text-sm border-b-2 border-solid border-gray-800 pb-1 mb-1 min-h-[30px] flex-shrink-0'>
                    <div className='font-semibold mb-0.5'>Attributes</div>
                    <ul className='list-none pl-1 space-y-0.5'>
                        {attributes.map((attr, index) => (
                            <li key={index} className="flex items-center text-xs">
                                <span className="mr-1 text-gray-600">+</span>
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
                            </li>
                        ))}
                        {/* Placeholder for adding new attributes */}
                        <li className="text-xs text-gray-400 cursor-pointer hover:text-gray-600"
                            onClick={() => {
                                setAttributes([...attributes, { name: '', type: '' }]);
                            }}>
                            + Add attribute
                        </li>
                    </ul>
                </div>
                <div className='text-sm min-h-[30px] flex-shrink-0'>
                    <div className='font-semibold mb-0.5'>Methods</div>
                    <ul className='list-none pl-1 space-y-0.5'>
                        {methods.map((method, index) => (
                            <li key={index} className="flex items-center text-xs">
                                <span className="mr-1 text-gray-600">+</span>
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
                                <span className="mx-0.5">():</span>
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
                            </li>
                        ))}
                        {/* Placeholder for adding new methods */}
                        <li className="text-xs text-gray-400 cursor-pointer hover:text-gray-600"
                            onClick={() => {
                                setMethods([...methods, { name: '', returnType: '' }]);
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
import React from 'react';
import { Node, NodeProps, Position, Handle } from '@xyflow/react';
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

const ClassNode = ({ data }: NodeProps<ClassNode>) => {
    return (
        <div className='border border-gray-300 p-2.5 rounded bg-yellow-200'>

            <div className="">
                <div className='font-bold text-lg border-b-2 border-solid border-gray-800 cursor-text'>

                    {data.class.name}

                </div>
                <div className='text-base border-b-2 border-solid border-gray-800'>
                    <div className='font-semibold'>Attributes</div>
                    <ul className='list-disc list-inside'>
                        {data.class.attributes.map((attr, index) => (
                            <li key={index}>
                                {attr.name}: {attr.type}
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <div className='font-semibold'>Methods</div>
                    <ul className='list-disc list-inside'>
                        {data.class.methods.map((method, index) => (
                            <li key={index}>
                                {method.name}(): {method.returnType}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <Handle type="source" position={Position.Top} id="a" />
            <Handle type="source" position={Position.Right} id="b" />
            <Handle type="source" position={Position.Bottom} id="c" />
            <Handle type="source" position={Position.Left} id="d" />
        </div>
    );
};

export default ClassNode;
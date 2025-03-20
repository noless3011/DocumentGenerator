import React, { useRef, useEffect, useState, useCallback } from 'react';
import ClassDiagram from '../models/ClassDiagram'; // Fixed import path

interface DiagramViewProps {
    fileDir: string;
}

// Add interfaces for the data structures
interface ClassOption {
    key: string | number;
    name: string;
}

interface NodeData {
    key: string | number;
    name: string;
    // Add other properties as needed
}

const DiagramView: React.FC<DiagramViewProps> = ({ fileDir }) => {
    const diagramRef = useRef<HTMLDivElement>(null);
    const [classDiagramInstance, setClassDiagramInstance] = useState<ClassDiagram | null>(null);
    const [isAddingClassInputVisible, setIsAddingClassInputVisible] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [selectedClassKey, setSelectedClassKey] = useState('');
    const [propertyName, setPropertyName] = useState('');
    const [propertyType, setPropertyType] = useState('');
    const [propertyVisibility, setPropertyVisibility] = useState('public');
    const [methodName, setMethodName] = useState('');
    const [methodReturnType, setMethodReturnType] = useState('');
    const [methodVisibility, setMethodVisibility] = useState('public');
    const [fromClassKey, setFromClassKey] = useState('');
    const [toClassKey, setToClassKey] = useState('');
    const [linkType, setLinkType] = useState('Generalization');


    useEffect(() => {
        const container = diagramRef.current;
        if (container) {
            const diagram = new ClassDiagram(container);
            setClassDiagramInstance(diagram);
            // Initialize diagram with some example data if needed, or fetch from backend here
        }
        return () => { };
    }, []);

    // Function to update class dropdown options
    const updateClassDropdowns = useCallback(() => {
        if (!classDiagramInstance) return [];
        const nodeDataArray = classDiagramInstance.getNodeDataArray();
        const options = nodeDataArray.map((nodeData: NodeData) => ({ key: nodeData.key, name: nodeData.name }));
        console.log("Class Dropdown Options:", options); // ADD THIS LINE
        return options;
    }, [classDiagramInstance]);


    const showAddClassInput = () => {
        setIsAddingClassInputVisible(true);
    };

    const hideAddClassInput = () => {
        setIsAddingClassInputVisible(false);
        setNewClassName('');
    };

    const handleAddClass = () => {
        if (!classDiagramInstance) return;
        if (newClassName.trim() === '') {
            alert("Class name cannot be empty.");
            return;
        }
        classDiagramInstance.addClass(newClassName, 200, 200);
        hideAddClassInput();
    };

    const handleAddProperty = () => {
        if (!classDiagramInstance) return;
        if (!selectedClassKey) return alert("Please select a class first.");
        if (!propertyName.trim()) return alert("Property name is required.");

        classDiagramInstance.addProperty(selectedClassKey, propertyName, propertyType, propertyVisibility);
        setPropertyName('');
        setPropertyType('');
    };

    const handleAddMethod = () => {
        if (!classDiagramInstance) return;
        if (!selectedClassKey) return alert("Please select a class first.");
        if (!methodName.trim()) return alert("Method name is required.");

        classDiagramInstance.addMethod(selectedClassKey, methodName, methodReturnType, methodVisibility);
        setMethodName('');
        setMethodReturnType('');
    };

    const handleAddLink = () => {
        if (!classDiagramInstance) return;
        if (!fromClassKey || !toClassKey) return alert("Please select both 'From Class' and 'To Class'.");
        if (fromClassKey === toClassKey) return alert("Cannot create a link between the same class.");

        classDiagramInstance.addLink(fromClassKey, toClassKey, linkType);
    };

    const handleSelectedClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedClassKey(event.target.value);
    };

    return (
        <div>
            <h1>Class Diagram (GoJS) Editor</h1>

            {/* Add Class Control */}
            <div id="addClassControl">
                {!isAddingClassInputVisible && (
                    <button onClick={showAddClassInput}>Add Class</button>
                )}
            </div>

            {/* Class Name Input */}
            {isAddingClassInputVisible && (
                <div id="classNameInputDiv">
                    <input
                        id="classNameInput"
                        type="text"
                        placeholder="Class Name"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                    />
                    <button onClick={handleAddClass}>Create Class</button>
                    <button onClick={hideAddClassInput}>Cancel</button>
                </div>
            )}

            {/* Class Selection and Properties/Methods Controls */}
            <div id="classProperties">
                <h2>Class Properties and Methods</h2>
                <select
                    id="selectedClass"
                    value={selectedClassKey}
                    onChange={handleSelectedClassChange}
                >
                    <option value="">-- Select Class --</option>
                    {updateClassDropdowns().map((classOption: ClassOption) => (
                        <option key={classOption.key} value={classOption.key}>
                            {classOption.name}
                        </option>
                    ))}
                </select>

                {selectedClassKey && (
                    <>
                        <h3>Add Property</h3>
                        <input
                            type="text"
                            placeholder="Property Name"
                            value={propertyName}
                            onChange={(e) => setPropertyName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Property Type"
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value)}
                        />
                        <select
                            value={propertyVisibility}
                            onChange={(e) => setPropertyVisibility(e.target.value)}
                        >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                            <option value="protected">Protected</option>
                            <option value="package">Package</option>
                        </select>
                        <button onClick={handleAddProperty}>Add Property</button>

                        <h3>Add Method</h3>
                        <input
                            type="text"
                            placeholder="Method Name"
                            value={methodName}
                            onChange={(e) => setMethodName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Return Type"
                            value={methodReturnType}
                            onChange={(e) => setMethodReturnType(e.target.value)}
                        />
                        <select
                            value={methodVisibility}
                            onChange={(e) => setMethodVisibility(e.target.value)}
                        >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                            <option value="protected">Protected</option>
                            <option value="package">Package</option>
                        </select>
                        <button onClick={handleAddMethod}>Add Method</button>
                    </>
                )}
            </div>

            {/* Link Controls */}
            <div id="linkControls">
                <h2>Add Link</h2>
                <select
                    id="fromClass"
                    value={fromClassKey}
                    onChange={(e) => setFromClassKey(e.target.value)}
                >
                    <option value="">-- Select From Class --</option>
                    {updateClassDropdowns().map((classOption: ClassOption) => (
                        <option key={classOption.key} value={classOption.key}>
                            {classOption.name}
                        </option>
                    ))}
                </select>

                <select
                    id="toClass"
                    value={toClassKey}
                    onChange={(e) => setToClassKey(e.target.value)}
                >
                    <option value="">-- Select To Class --</option>
                    {updateClassDropdowns().map((classOption: ClassOption) => (
                        <option key={classOption.key} value={classOption.key}>
                            {classOption.name}
                        </option>
                    ))}
                </select>

                <select
                    id="linkType"
                    value={linkType}
                    onChange={(e) => setLinkType(e.target.value)}
                >
                    <option value="Generalization">Generalization</option>
                    <option value="Association">Association</option>
                    <option value="Realization">Realization</option>
                    <option value="Dependency">Dependency</option>
                    <option value="Composition">Composition</option>
                    <option value="Aggregation">Aggregation</option>
                </select>
                <button onClick={handleAddLink}>Add Link</button>
            </div>

            <div
                ref={diagramRef}
                id="myDiagramDiv"
                className='w-full h-full border-solid border-2 border-gray-300'
                style={{ height: '600px' }}
            />
        </div>
    );
};

export default DiagramView;
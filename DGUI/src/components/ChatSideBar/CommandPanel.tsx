import React, { useState } from 'react';
import { useChat } from '../../provider/ChatProvider';
import { useProjects } from '../../provider/ProjectProvider';

const CommandPanel: React.FC = () => {
    const { sendCommand, isGenerating } = useChat();
    const { currentProject } = useProjects();
    const [selectedCommand, setSelectedCommand] = useState<string>('');
    const [commandParams, setCommandParams] = useState<string>('');
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    const [instructions, setInstructions] = useState<string>('');
    const [selectedDiagramType, setSelectedDiagramType] = useState<string>(''); const availableCommands = [
        {
            name: 'create_text_document',
            label: 'Create Text Document',
            description: 'Generate a markdown document',
            paramLabel: 'Document prompt (optional)',
            paramPlaceholder: 'e.g., "Create a user guide for this project"'
        },
        {
            name: 'edit_document',
            label: 'Edit Document',
            description: 'Edit an existing document',
            paramLabel: 'Document details',
            paramPlaceholder: ''
        },
        {
            name: 'generate_diagram',
            label: 'Generate Diagram',
            description: 'Create a JSON diagram',
            paramLabel: 'Additional details (optional)',
            paramPlaceholder: 'e.g., "Include user authentication flow"'
        },
        {
            name: 'generate_prototype',
            label: 'Generate Prototype',
            description: 'Create an HTML prototype',
            paramLabel: 'Prototype prompt (optional)',
            paramPlaceholder: 'e.g., "Create a simple login page"'
        }
    ];

    const diagramTypes = [
        { value: 'UML Class Diagram', label: 'UML Class Diagram' },
        { value: 'Database Schema', label: 'Database Schema' },
        { value: 'Sequence Diagram', label: 'Sequence Diagram' },
        { value: 'Component Diagram', label: 'Component Diagram' },
        { value: 'Activity Diagram', label: 'Activity Diagram' },
        { value: 'Use Case Diagram', label: 'Use Case Diagram' },
        { value: 'Network Diagram', label: 'Network Diagram' },
        { value: 'System Architecture', label: 'System Architecture' }
    ]; const handleExecuteCommand = () => {
        if (!selectedCommand) return;

        const command = availableCommands.find(cmd => cmd.name === selectedCommand);
        if (!command) return;

        let params: Record<string, any> = {}; if (selectedCommand === 'edit_document') {
            if (!selectedFileName.trim()) {
                alert('Please select a file to edit');
                return;
            }
            params = {
                filename: selectedFileName.trim(),
                instructions: instructions.trim() || 'Make improvements to the document'
            };
        } else if (selectedCommand === 'generate_diagram') {
            if (!selectedDiagramType) {
                alert('Please select a diagram type');
                return;
            }
            params = {
                prompt: selectedDiagramType + (commandParams.trim() ? ` - ${commandParams.trim()}` : '')
            };
        } else {
            if (commandParams.trim()) {
                params = { prompt: commandParams.trim() };
            }
        }

        sendCommand({ name: selectedCommand, params });        // Reset form
        setCommandParams('');
        setSelectedFileName('');
        setInstructions('');
        setSelectedDiagramType('');
    };

    return (
        <div className="p-4 border-t bg-gray-50">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Quick Commands</h3>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Select Command
                    </label>
                    <select
                        value={selectedCommand}
                        onChange={(e) => setSelectedCommand(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                        <option value="">Choose a command...</option>
                        {availableCommands.map((cmd) => (
                            <option key={cmd.name} value={cmd.name}>
                                {cmd.label}
                            </option>
                        ))}
                    </select>
                </div>                {selectedCommand && (
                    <>
                        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                            {availableCommands.find(cmd => cmd.name === selectedCommand)?.description}
                        </div>                        {selectedCommand === 'edit_document' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Select File to Edit *
                                    </label>
                                    {currentProject?.files?.output && currentProject.files.output.length > 0 ? (
                                        <select
                                            value={selectedFileName}
                                            onChange={(e) => setSelectedFileName(e.target.value)}
                                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        >
                                            <option value="">Choose a file...</option>
                                            {currentProject.files.output.map((file) => (
                                                <option key={file.path} value={file.name}>
                                                    {file.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-gray-100 text-gray-500">
                                            No output files available in project
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Instructions
                                    </label>
                                    <textarea
                                        value={instructions}
                                        onChange={(e) => setInstructions(e.target.value)}
                                        placeholder="e.g., Add a conclusion section, Fix formatting issues"
                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        ) : selectedCommand === 'generate_diagram' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Diagram Type *
                                    </label>
                                    <select
                                        value={selectedDiagramType}
                                        onChange={(e) => setSelectedDiagramType(e.target.value)}
                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    >
                                        <option value="">Choose diagram type...</option>
                                        {diagramTypes.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {availableCommands.find(cmd => cmd.name === selectedCommand)?.paramLabel}
                                    </label>
                                    <textarea
                                        value={commandParams}
                                        onChange={(e) => setCommandParams(e.target.value)}
                                        placeholder={availableCommands.find(cmd => cmd.name === selectedCommand)?.paramPlaceholder}
                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    {availableCommands.find(cmd => cmd.name === selectedCommand)?.paramLabel}
                                </label>
                                <textarea
                                    value={commandParams}
                                    onChange={(e) => setCommandParams(e.target.value)}
                                    placeholder={availableCommands.find(cmd => cmd.name === selectedCommand)?.paramPlaceholder}
                                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                                    rows={2}
                                />
                            </div>
                        )}                        <button
                            onClick={handleExecuteCommand}
                            disabled={
                                isGenerating ||
                                (selectedCommand === 'edit_document' && !selectedFileName.trim()) ||
                                (selectedCommand === 'generate_diagram' && !selectedDiagramType)
                            }
                            className="w-full bg-blue-500 text-white text-sm py-2 px-3 rounded hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? 'Generating...' : `Execute ${availableCommands.find(cmd => cmd.name === selectedCommand)?.label}`}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default CommandPanel;

import React, { useState } from 'react';
import { useChat } from '../../provider/ChatProvider';

const CommandPanel: React.FC = () => {
    const { sendCommand } = useChat();
    const [selectedCommand, setSelectedCommand] = useState<string>('');
    const [commandParams, setCommandParams] = useState<string>('');

    const availableCommands = [
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
            paramLabel: 'Filename and instructions (JSON format)',
            paramPlaceholder: '{"filename": "document.md", "instructions": "Add a conclusion section"}'
        },
        {
            name: 'generate_diagram',
            label: 'Generate Diagram',
            description: 'Create a JSON diagram',
            paramLabel: 'Diagram type prompt (optional)',
            paramPlaceholder: 'e.g., "UML Class Diagram" or "Database Schema"'
        },
        {
            name: 'generate_prototype',
            label: 'Generate Prototype',
            description: 'Create an HTML prototype',
            paramLabel: 'Prototype prompt (optional)',
            paramPlaceholder: 'e.g., "Create a simple login page"'
        }
    ];

    const handleExecuteCommand = () => {
        if (!selectedCommand) return;

        const command = availableCommands.find(cmd => cmd.name === selectedCommand);
        if (!command) return;

        let params: Record<string, any> = {};

        if (commandParams.trim()) {
            if (selectedCommand === 'edit_document') {
                try {
                    params = JSON.parse(commandParams);
                } catch (e) {
                    alert('Please provide valid JSON format for edit_document command');
                    return;
                }
            } else {
                params = { prompt: commandParams.trim() };
            }
        }

        sendCommand({ name: selectedCommand, params });
        setCommandParams('');
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
                </div>

                {selectedCommand && (
                    <>
                        <div className="text-xs text-gray-500">
                            {availableCommands.find(cmd => cmd.name === selectedCommand)?.description}
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

                        <button
                            onClick={handleExecuteCommand}
                            className="w-full bg-blue-500 text-white text-sm py-2 px-3 rounded hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
                        >
                            Execute {availableCommands.find(cmd => cmd.name === selectedCommand)?.label}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default CommandPanel;

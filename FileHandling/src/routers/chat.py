import json
import os
import json
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from typing import Annotated, Optional
from pathlib import Path

from utils.WebSocketManager import chat_socket_manager as global_ws_manager # Use the global manager for project updates
from utils.Project import Project
from agents.IAgent import IAgent
from dependencies import get_app_state, get_chat_agent, get_agent_instance, get_current_project
from config import settings # For default model names, etc.

router = APIRouter()

@router.websocket("/ws/chat/{project_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    project_id: str,
    app_state: Annotated[dict, Depends(get_app_state)]
):
    # Ensure the project is the currently loaded one for chat context
    # This is a simplification; a multi-user system might allow chat on non-active-global projects.
    current_project_global: Optional[Project] = app_state.get("current_project")
    if not current_project_global or current_project_global.id != project_id:
        await websocket.accept() # Accept to send error
        await websocket.send_json({"type": "error_message", "text": f"Project {project_id} is not the currently active project or not found."})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Retrieve the ChatAgent for this project
    chat_agent: Optional[IAgent] = get_chat_agent(project_id, app_state) # app_state already passed by Depends
    if not chat_agent:
        await websocket.accept() # Accept to send error
        await websocket.send_json({"type": "error_message", "text": f"Chat agent for project {project_id} not initialized."})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Use the global WebSocket manager for this connection as well
    await global_ws_manager.connect(websocket, project_id)
    print(f"WebSocket chat connection established for project {project_id}")

    try:
        while True:
            try:
                raw_data = await websocket.receive_text() # Expect JSON as a string
                message_data = json.loads(raw_data)
                message_type = message_data.get("type")

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error_message", "text": "Invalid JSON message received."})
                continue
            except WebSocketDisconnect:
                raise # Re-raise to be caught by outer try-except
            except Exception as e:
                await websocket.send_json({"type": "error_message", "text": f"Error processing message: {str(e)}"})
                continue


            if message_type == "chat" and "text" in message_data:
                user_text = message_data["text"]
                # Ensure agent context is current (might be redundant if project updates handle it)
                # chat_agent.update_context(current_project_global) # Already done when project loads

                ai_response_text = chat_agent.generate(current_project_global, prompt=user_text)
                await websocket.send_json({"type": "ai_response", "text": ai_response_text or "Sorry, I couldn't process that."})

            elif message_type == "command":
                command_name = message_data.get("name")
                params = message_data.get("params", {})

                try:
                    # Ensure current_project_global is used for actions
                    if command_name == "create_text_document":
                        doc_prompt = params.get("prompt", "A general document about the project.")
                        # agent_name needs to be pre-registered, e.g. "TextDocAgent"
                        text_agent: IAgent = get_agent_instance(settings.DEFAULT_TEXT_AGENT_NAME)
                        text_agent.update_context(current_project_global) # Crucial: agent uses current project context
                        markdown_content = text_agent.generate(current_project_global, prompt=doc_prompt)

                        if markdown_content:
                            doc_title = markdown_content.split('\n', 1)[0].strip().lstrip('#').strip()
                            filename = f"{doc_title.replace(' ', '_')}.md"
                            # Save to output dir
                            output_file_path = await current_project_global.create_file(filename, "output", markdown_content)
                            if output_file_path:
                                await current_project_global.save_metadata() 
                                await websocket.send_json({"type": "system_message", "text": f"Document '{os.path.basename(output_file_path)}' created."})
                            else:
                                await websocket.send_json({"type": "error_message", "text": f"Failed to save document '{filename}'."})
                        else:
                            await websocket.send_json({"type": "error_message", "text": "Failed to generate document content."})

                    elif command_name == "edit_document":
                        filename = params.get("filename")
                        instructions = params.get("instructions")
                        if not filename or not instructions:
                            await websocket.send_json({"type": "error_message", "text": "Filename and instructions required for edit."})
                            continue

                        file_path_to_edit = None
                        # Look for file in output directory
                        for f_info in current_project_global.files.get("output", []):
                            if f_info["name"] == filename:
                                file_path_to_edit = f_info["path"]
                                break

                        if not file_path_to_edit or not os.path.exists(file_path_to_edit):
                            await websocket.send_json({"type": "error_message", "text": f"File '{filename}' not found in project outputs."})
                            continue

                        with open(file_path_to_edit, 'r', encoding='utf-8') as f:
                            current_content = f.read()

                        # Assuming TextDocumentAgent for .md files. More logic needed for other types.
                        if filename.lower().endswith(".md"):
                            text_agent: IAgent = get_agent_instance(settings.DEFAULT_TEXT_AGENT_NAME)
                            text_agent.update_context(current_project_global)
                            edited_content = text_agent.edit(instructions, current_content, current_project_global)

                            if edited_content:
                                with open(file_path_to_edit, 'w', encoding='utf-8') as f:
                                    f.write(edited_content)
                                await current_project_global.scan_and_update_files() # To update modified date, size etc.
                                await current_project_global.save_metadata()
                                await websocket.send_json({"type": "system_message", "text": f"Document '{filename}' updated."})
                                # Send updated content back for preview?
                                await websocket.send_json({"type": "file_content", "filename": filename, "content": edited_content, "lang": "markdown"})
                            else:
                                await websocket.send_json({"type": "error_message", "text": "Failed to edit document content."})
                        elif filename.lower().endswith(".json"):
                            diagram_agent: IAgent = get_agent_instance(settings.DEFAULT_DIAGRAM_AGENT_NAME)
                            diagram_agent.update_context(current_project_global)
                            edited_content = diagram_agent.edit(instructions, current_content, current_project_global)
                            if edited_content:
                                with open(file_path_to_edit, 'w', encoding='utf-8') as f:
                                    f.write(edited_content)
                                await current_project_global.scan_and_update_files()
                                await current_project_global.save_metadata()
                                await websocket.send_json({"type": "system_message", "text": f"Diagram '{filename}' updated."})
                                await websocket.send_json({"type": "file_content", "filename": filename, "content": edited_content, "lang": "json"})
                            else:
                                await websocket.send_json({"type": "error_message", "text": "Failed to edit diagram content."})
                        elif filename.lower().endswith(".html"):
                            proto_agent: IAgent = get_agent_instance(settings.DEFAULT_PROTOTYPE_AGENT_NAME)
                            proto_agent.update_context(current_project_global)
                            edited_content = proto_agent.edit(instructions, current_content, current_project_global)
                            if edited_content:
                                with open(file_path_to_edit, 'w', encoding='utf-8') as f:
                                    f.write(edited_content)
                                await current_project_global.scan_and_update_files()
                                await current_project_global.save_metadata()
                                await websocket.send_json({"type": "system_message", "text": f"Prototype '{filename}' updated."})
                                await websocket.send_json({"type": "file_content", "filename": filename, "content": edited_content, "lang": "html"})
                            else:
                                await websocket.send_json({"type": "error_message", "text": "Failed to edit prototype content."})
                        else:
                            await websocket.send_json({"type": "error_message", "text": f"Editing for file type of '{filename}' not supported via chat yet."})


                    elif command_name == "generate_diagram":
                        diagram_type_prompt = params.get("prompt", "UML Class Diagram") # Default or from user
                        # agent_name needs to be pre-registered, e.g. "DiagramAgent"
                        diagram_agent: IAgent = get_agent_instance(settings.DEFAULT_DIAGRAM_AGENT_NAME)
                        diagram_agent.update_context(current_project_global)
                        json_diagram_content = diagram_agent.generate(current_project_global, prompt=diagram_type_prompt)

                        if json_diagram_content:
                            diagram_type_cleaned = diagram_type_prompt.replace(" ", "_")
                            filename = f"{current_project_global.name}_{diagram_type_cleaned}_diagram.json"
                            output_file_path = await current_project_global.create_file(filename, "output", json_diagram_content)
                            if output_file_path:
                                await current_project_global.save_metadata()
                                await websocket.send_json({"type": "system_message", "text": f"Diagram '{os.path.basename(output_file_path)}' generated."})
                            else:
                                await websocket.send_json({"type": "error_message", "text": "Failed to save diagram."})
                        else:
                            await websocket.send_json({"type": "error_message", "text": "Failed to generate diagram."})

                    elif command_name == "generate_prototype":
                        proto_prompt = params.get("prompt") # Optional specific prompt for prototype generation
                        # agent_name needs to be pre-registered, e.g. "PrototypeAgent"
                        proto_agent: IAgent = get_agent_instance(settings.DEFAULT_PROTOTYPE_AGENT_NAME)
                        proto_agent.update_context(current_project_global)
                        html_content = proto_agent.generate(current_project_global, prompt=proto_prompt)

                        if html_content:
                            filename = f"{current_project_global.name}_prototype.html"
                            # Prototypes might be better in 'processed' or a dedicated 'prototypes' folder
                            # For now, 'output' is fine.
                            output_file_path = await current_project_global.create_file(filename, "output", html_content)
                            if output_file_path:
                                await current_project_global.save_metadata()
                                await websocket.send_json({"type": "system_message", "text": f"HTML Prototype '{os.path.basename(output_file_path)}' generated."})
                            else:
                                await websocket.send_json({"type": "error_message", "text": "Failed to save HTML prototype."})
                        else:
                            await websocket.send_json({"type": "error_message", "text": "Failed to generate HTML prototype."})                    # Add more commands here...
                    else:
                        await websocket.send_json({"type": "error_message", "text": f"Unknown command: {command_name}"})

                except HTTPException as he: # Catch agent not found or other HTTP-like errors from dependencies
                    await websocket.send_json({"type": "error_message", "text": f"Command error: {he.detail}"})
                except Exception as e:
                    await websocket.send_json({"type": "error_message", "text": f"Error executing command '{command_name}': {str(e)}"})
                    traceback.print_exc() # Log full error on server

            else:
                await websocket.send_json({"type": "error_message", "text": "Invalid message format or type."})

    except WebSocketDisconnect:
        global_ws_manager.disconnect(websocket, project_id)
        print(f"WebSocket chat disconnected for project {project_id}")
    except Exception as e:
        # Catch any other unexpected errors in the main loop
        print(f"Unexpected error in WebSocket chat for project {project_id}: {e}")
        import traceback
        traceback.print_exc()
        global_ws_manager.disconnect(websocket, project_id) # Ensure disconnect
        # Try to send a final error message if the socket is still open
        if not websocket.client_state == websocket.client_state.DISCONNECTED:
            try:
                await websocket.send_json({"type": "error_message", "text": "An unexpected server error occurred. Disconnecting."})
                await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            except: # Ignore errors during cleanup send/close
                pass
            
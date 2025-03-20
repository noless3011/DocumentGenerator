import uuid
from datetime import datetime
import json
import os

class WorkSession:
    """
    A class for managing work sessions with unique identifiers.
    """
    
    def __init__(self, name=None, session_dir=None):
        """
        Initialize a new work session with a unique ID and optional name.
        
        Args:
            name (str, optional): The name of the work session. If not provided,
                                  a timestamp-based name will be created.
        """
        # Generate a unique session ID
        self.session_id = str(uuid.uuid4())
        
        # Set session name or generate a default one
        if name:
            self.session_name = name
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.session_name = f"Session_{timestamp}"
        
        self.created_at = datetime.now()
        self.session_dir = session_dir
        self.is_active = True
    
    def get_session_id(self):
        """
        Get the unique identifier for this session.
        
        Returns:
            str: The session UUID as a string
        """
        return self.session_id
    
    def get_session_name(self):
        """
        Get the name of this session.
        
        Returns:
            str: The session name
        """
        return self.session_name
    
    def set_session_name(self, name):
        """
        Update the session name.
        
        Args:
            name (str): The new session name
        """
        self.session_name = name
    
    def end_session(self):
        """
        Mark the session as inactive.
        """
        self.is_active = False
        self.ended_at = datetime.now()
        # Get the root folder from the location of .env file
        # Save session data to JSON file that contains all sessions
        sessions_file = self.session_dir + "/sessions.json"
        
        # Create a directory for sessions if it doesn't exist
        os.makedirs("sessions", exist_ok=True)
        
        # Create a dict with current session data
        current_session = {
            "session_id": self.session_id,
            "session_name": self.session_name,
            "created_at": self.created_at.isoformat(),
            "ended_at": self.ended_at.isoformat(),
            "is_active": self.is_active
        }
        
        # Load existing sessions or create new sessions list
        if os.path.exists(sessions_file):
            with open(sessions_file, "r") as f:
                try:
                    all_sessions = json.load(f)
                except json.JSONDecodeError:
                    all_sessions = []
        else:
            all_sessions = []
        
        # Add current session to the list
        all_sessions.append(current_session)
        
        # Write all sessions back to the file
        with open(sessions_file, "w") as f:
            json.dump(all_sessions, f, indent=4)
        
    
    def __str__(self):
        """
        Return a string representation of the work session.
        """
        status = "Active" if self.is_active else "Ended"
        return f"WorkSession: {self.session_name} ({self.session_id}) - {status}"
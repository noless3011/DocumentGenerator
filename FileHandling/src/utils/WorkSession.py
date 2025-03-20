import uuid
from datetime import datetime
import json
import os

class WorkSession:
    """
    A class for managing work sessions with unique identifiers.
    """

    def __init__(self, session_id, session_name, created_at, ended_at, is_active, session_dir):
        """
        Initialize a new work session with a unique ID and optional name.

        Args:
            session_id (str): The unique session ID.
            session_name (str): The name of the work session.
            created_at (datetime): The datetime when the session was created.
            ended_at (datetime, optional): The datetime when the session ended, if ended.
            is_active (bool):  Flag indicating if the session is active.
            session_dir (str): The directory where session related files are stored.
        """
        self.session_id = session_id
        self.session_name = session_name
        self.created_at = created_at
        self.ended_at = ended_at
        self.is_active = is_active
        self.session_dir = session_dir

    @classmethod
    def create_new_session(cls, name=None, session_dir=None):
        """
        Class method to create a new WorkSession instance.

        Args:
            name (str, optional): The name of the work session.
            session_dir (str, optional): The directory for session files.

        Returns:
            WorkSession: A new WorkSession instance.
        """
        session_id = str(uuid.uuid4())
        session_name = name if name else f"Session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        created_at = datetime.now()
        return cls(session_id, session_name, created_at, None, True, session_dir)


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
        Mark the session as inactive and save session info.
        """
        if self.is_active: # Prevent re-ending already ended session
            self.is_active = False
            self.ended_at = datetime.now()
            self._save_session_info()

    def _save_session_info(self):
        """
        Save session data to JSON file and update sessions list.
        """
        sessions_file = os.path.join(self.session_dir, "sessions.json") if self.session_dir else "sessions.json"

        # Create a directory for sessions if it doesn't exist (if session_dir is available)
        if self.session_dir:
            os.makedirs(self.session_dir, exist_ok=True)
        else:
            os.makedirs("sessions", exist_ok=True)


        current_session_data = self.to_dict() # Use to_dict method to get serializable data

        # Load existing sessions or create new sessions list
        all_sessions = []
        if os.path.exists(sessions_file):
            with open(sessions_file, "r") as f:
                try:
                    all_sessions = json.load(f)
                except json.JSONDecodeError:
                    all_sessions = []

        # Check if session_id already exists to avoid duplicates (in case of load/save issues)
        session_exists = False
        for existing_session in all_sessions:
            if existing_session.get('session_id') == self.session_id:
                session_exists = True
                break

        if not session_exists:
            all_sessions.append(current_session_data) # Append the dictionary

        # Write all sessions back to the file
        with open(sessions_file, "w") as f:
            json.dump(all_sessions, f, indent=4)


    def to_dict(self):
        """
        Serialize WorkSession object to a dictionary.
        """
        return {
            "session_id": self.session_id,
            "session_name": self.session_name,
            "created_at": self.created_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "is_active": self.is_active,
            "session_dir": self.session_dir # Keep session_dir in serialized data
        }

    @staticmethod
    def from_dict(data):
        """
        Reconstruct WorkSession object from a dictionary.

        Args:
            data (dict): Dictionary representation of WorkSession.

        Returns:
            WorkSession: Reconstructed WorkSession object.
        """
        created_at = datetime.fromisoformat(data['created_at'])
        ended_at = datetime.fromisoformat(data['ended_at']) if data['ended_at'] else None
        return WorkSession(
            session_id=data['session_id'],
            session_name=data['session_name'],
            created_at=created_at,
            ended_at=ended_at,
            is_active=data['is_active'],
            session_dir=data['session_dir'] # Restore session_dir from data
        )


    def __str__(self):
        """
        Return a string representation of the work session.
        """
        status = "Active" if self.is_active else "Ended"
        return f"WorkSession: {self.session_name} ({self.session_id}) - {status}"


if __name__ == '__main__':
    # Example usage and testing serialization/deserialization
    root_dir = "test_sessions" # Example session directory
    session1 = WorkSession.create_new_session(name="Test Session 1", session_dir=root_dir)
    print(f"Created session: {session1}")

    # Serialize to dictionary
    session1_dict = session1.to_dict()
    print(f"\nSerialized to dict: {session1_dict}")

    # Deserialize from dictionary
    session2 = WorkSession.from_dict(session1_dict)
    print(f"\nDeserialized session: {session2}")

    # Verify if objects are the same (attributes should match)
    print(f"\nAre sessions equal? (by ID): {session1.get_session_id() == session2.get_session_id()}")
    print(f"Session 1 name: {session1.get_session_name()}, Session 2 name: {session2.get_session_name()}")
    print(f"Session 1 created_at: {session1.created_at}, Session 2 created_at: {session2.created_at}")

    session1.end_session() # End session 1 and save info

    session3 = WorkSession.create_new_session(name="Another Session", session_dir=root_dir)
    session3_dict = session3.to_dict()
    session4 = WorkSession.from_dict(session3_dict)
    print(f"\nCreated and deserialized session 4: {session4}")
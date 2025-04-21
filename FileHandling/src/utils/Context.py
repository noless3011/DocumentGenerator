from utils.Project import Project

class Context:
    def __init__(self):
        self.context = {}
        self.project = None
    def load_project(self, project: Project):
        """Load a project into the context."""
        self.project = project
        self.context = {
            "project": project,
            "files": project.files,
            "base_dir": project.base_dir,
            "input_dir": project.input_dir,
            "processed_dir": project.processed_dir,
            "output_dir": project.output_dir
        }
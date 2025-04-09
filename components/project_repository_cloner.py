import os
import pandas as pd
from git_repo_inspector import GitRepoInspector


class ProjectRepositoryCloner:
    """
    Manages the cloning and filtering of repositories based on a dataset
    containing metadata such as stars, commits, and lines of code.
    """

    def __init__(
        self,
        base_path: str = "../input/projects/",
        repo_data_path: str = "../input/dataset/NICHE.csv",
    ):
        """
        Initializes the ProjectRepositoryCloner with paths for projects and
        repository metadata.

        Parameters:
        - base_path (str): Base directory where repositories will be cloned.
        - repo_data_path (str): Path to the CSV file containing repository
          metadata.
        """
        self.base_path = base_path
        self.repo_data_path = repo_data_path
        self.git_inspector = GitRepoInspector(base_dir=base_path)

    def get_repo(self, repo_url: str):
        """
        Clones the GitHub repository specified by `repo_url` into the local
        directory.

        Parameters:
        - repo_url (str): The GitHub repository URL
          (e.g., 'username/repository_name').

        Returns:
        - None
        """
        full_url = f"https://github.com/{repo_url}.git"
        self.git_inspector.clone_repo(full_url)

    def get_debug_quick_scan_files(self, commit_depth: int = 1) -> dict:
        """
        Clona solo un piccolo insieme di repository leggeri (debug)
        e restituisce i file Python modificati di recente.

        Parameters:
        - commit_depth (int): Numero di commit recenti da analizzare.

        Returns:
        - dict: {repo_url: [list of modified .py files]}
        """
        df = pd.read_csv(self.repo_data_path)
        df = self.filter_repos(df)
        df = self.debug_filter_repo(df)  # seleziona solo i più piccoli
        result = {}
        for repo_url in df["GitHub_Repo"]:
            try:
                full_url = f"https://github.com/{repo_url}.git"
                local_path = self.git_inspector.clone_repo(full_url)
                modified_files = (self.git_inspector
                                  .get_recently_modified_files(
                                    local_path,
                                    commit_depth))
                result[repo_url] = modified_files
            except Exception as e:
                print(f"Errore con {repo_url}: {e}")

        return result

    def filter_repos(
        self, df: pd.DataFrame, stars: int = 200, commits: int = 100
    ) -> pd.DataFrame:
        """
        Filters the repositories based on stars and commits.

        Parameters:
        - df (pd.DataFrame): The DataFrame containing repository metadata.
        - stars (int): Minimum number of stars a repository should have.
        - commits (int): Minimum number of commits a repository should have.

        Returns:
        - pd.DataFrame: The filtered DataFrame.
        """
        df = df[df["Engineered ML Project"] == "Y"]
        df = df[df["Stars"] > stars]
        df = df[df["Commits"] > commits]
        return df

    def debug_filter_repo(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Filters the repositories for debugging purposes.

        Parameters:
        - df (pd.DataFrame): The DataFrame containing repository metadata.

        Returns:
        - pd.DataFrame: A filtered DataFrame with smaller repositories.
        """
        df = df[df["Lines of Code"] < 10000]
        df = df.head(10)  # Only take the first 10 projects for debugging
        return df

    def get_debug_projects(self):
        """
        Retrieves a small set of repositories for debugging purposes, filters
        them, and clones them locally.

        Returns:
        - None
        """
        df = pd.read_csv(self.repo_data_path)
        df = self.filter_repos(df)
        df = self.debug_filter_repo(df)
        for repo_url in df["GitHub_Repo"]:
            self.get_repo(repo_url)

    def get_projects(self):
        """
        Retrieves all repositories, filters them, and clones them locally.

        Returns:
        - None
        """
        df = pd.read_csv(self.repo_data_path)
        df = self.filter_repos(df)
        for repo_url in df["GitHub_Repo"]:
            self.get_repo(repo_url)

    def clean(self):
        """
        Cleans up the project repositories directory by removing it.

        Returns:
        - None
        """
        projects_path = os.path.join(self.base_path, "projects")
        if os.name == "nt":
            if os.path.exists(projects_path):
                os.system(f"rmdir /s /q {projects_path}")
        else:
            if os.path.exists(projects_path):
                os.system(f"rm -r {projects_path}")

    def setup(self):
        """
        Sets up the projects directory where repositories will be cloned.

        Returns:
        - None
        """
        projects_path = os.path.join(self.base_path, "projects")
        if not os.path.exists(projects_path):
            os.makedirs(projects_path)

    def execute(self):
        """
        Runs the setup, cleanup, and project retrieval processes.

        Returns:
        - None
        """
        self.clean()
        self.setup()
        self.get_projects()

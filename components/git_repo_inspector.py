import os
import shutil
from git import Repo


class GitRepoInspector:
    def __init__(self, base_dir="repos"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def clone_repo(self, git_url: str) -> str:
        repo_name = git_url.rstrip("/").split("/")[-1].replace(".git", "")
        local_path = os.path.join(self.base_dir, repo_name)

        if os.path.exists(local_path):
            print(f"[!] Il repo '{repo_name}' esiste già. Lo rimuovo.")
            shutil.rmtree(local_path)

        print(f"[+] Clono {git_url} in {local_path}")
        Repo.clone_from(git_url, local_path)
        return local_path

    def get_recently_modified_files(self, repo_path: str, commit_depth: int = 1) -> list:
        repo = Repo(repo_path)
        branch = "main" if "main" in repo.heads else "master"
        commits = list(repo.iter_commits(branch, max_count=commit_depth))
        modified_files = set()
        for commit in commits:
            if commit.parents:
                diffs = commit.diff(commit.parents[0])
                for diff in diffs:
                    path = diff.a_path or diff.b_path
                    print(f"[DEBUG] Analizzando diff: {path}")  # Debug print
                    if path and path.endswith(".py"):
                        full_path = os.path.join(repo_path, path)
                        print(f"[DEBUG] File Python modificato trovato: {full_path}")  # Debug print
                        modified_files.add(full_path)

        return list(modified_files)
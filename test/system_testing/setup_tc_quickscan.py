import os
import subprocess
import time
from git import Repo
from pathlib import Path

BASE = Path("")


def init_git_repo(tc_path, branch="main"):
    repo = Repo.init(tc_path)
    if branch and branch != "master":
        if branch not in repo.heads:
            repo.git.checkout(b=branch)
        else:
            repo.git.checkout(branch)
    return repo


def commit_file(repo, path, message="Initial commit"):
    if not path.exists():
        raise FileNotFoundError(f"File {path} non trovato per commit.")
    path = path.resolve()
    with open(path, "a") as f:
        f.write("")
        f.flush()
        os.fsync(f.fileno())
    repo.index.add([str(path)])
    repo.index.commit(message)


def setup_tc22():
    """TC22: Quick Scan su un file modificato"""
    path = BASE / "TC22"
    path.mkdir(parents=True, exist_ok=True)
    repo = init_git_repo(path)

    f = path / "example.py"
    f.write_text("""import pandas as pd

def example_function():
    df = pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]})
    x = df["A"][0]  # chain indexing
    arr = df.values  # dataframe_conversion_api_misused
    return arr
""")
    commit_file(repo, f, "Initial commit with two code smells")


def setup_tc23():
    """TC23: Nessuna modifica recente"""
    path = BASE / "TC23"
    path.mkdir(parents=True, exist_ok=True)
    repo = init_git_repo(path)

    f = path / "clean.py"
    f.write_text("print('clean')\n")
    commit_file(repo, f, "Clean code")


def setup_tc24():
    """TC24: Repo senza branch main/master"""
    path = BASE / "TC24"
    path.mkdir(parents=True, exist_ok=True)

    # Inizializza repo ma non crea branch esplicitamente
    subprocess.run(["git", "-C", str(path), "init"], check=True)

    f = path / "file.py"
    f.write_text("print('no branch')\n")
    subprocess.run(["git", "-C", str(path), "add", "."], check=True)
    subprocess.run(["git", "-C", str(path), "commit", "-m", "orphan commit"], check=True)


def setup_tc25():
    """TC25: Quick Scan su più commit"""
    path = BASE / "TC25"
    path.mkdir(parents=True, exist_ok=True)
    repo = init_git_repo(path)

    f1 = path / "first.py"
    f1.write_text("""import pandas as pd

def example_function():
    df = pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]})
    x = df["A"][0]  # chain indexing
    arr = df.values  # dataframe_conversion_api_misused
    return arr
""")
    commit_file(repo, f1, "Commit 1: dataframe .values misuse")

    time.sleep(1)

    f2 = path / "second.py"
    f2.write_text("""import pandas as pd

def example_function():
    df = pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]})
    x = df["A"][0]  # chain indexing
    arr = df.values  # dataframe_conversion_api_misused
    return arr
""")
    commit_file(repo, f2, "Commit 2: chain indexing")

    time.sleep(1)

    f3 = path / "third.py"
    f3.write_text("print('ok')\n")
    commit_file(repo, f3, "Commit 3: clean file")


def main():
    setup_tc22()
    setup_tc23()
    setup_tc24()
    setup_tc25()
    print("✅ TC22–TC25 (with real smells) generated in test/system_testing/")


if __name__ == "__main__":
    main()
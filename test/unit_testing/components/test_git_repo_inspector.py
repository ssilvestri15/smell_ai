import os
import pytest
from unittest.mock import patch, MagicMock
from components.git_repo_inspector import GitRepoInspector


@pytest.fixture
def mock_repo_dir(tmp_path):
    return str(tmp_path / "mock_repo")


def test_clone_repo_creates_repo_dir(mock_repo_dir):
    inspector = GitRepoInspector(base_dir=mock_repo_dir)

    with patch("components.git_repo_inspector.Repo.clone_from") as mock_clone:
        url = "https://github.com/user/repo.git"
        local_path = inspector.clone_repo(url)

        repo_name = "repo"
        expected_path = os.path.join(mock_repo_dir, repo_name)

        # Controllo che sia stato generato il path corretto
        assert expected_path == local_path
        mock_clone.assert_called_once_with(url, expected_path)


def test_clone_repo_removes_existing_folder(tmp_path):
    base_dir = tmp_path / "repos"
    repo_path = base_dir / "repo"
    repo_path.mkdir(parents=True)
    (repo_path / "dummy.txt").write_text("data")

    inspector = GitRepoInspector(base_dir=str(base_dir))

    with (patch("components.git_repo_inspector.Repo.clone_from")
          as mock_clone,
            patch("shutil.rmtree") as mock_rmtree):

        url = "https://github.com/user/repo.git"
        inspector.clone_repo(url)

        mock_rmtree.assert_called_once_with(os.path.join(base_dir, "repo"))
        mock_clone.assert_called_once()


def test_get_recently_modified_files_returns_py_files(tmp_path):
    repo_path = tmp_path / "repo"
    os.makedirs(repo_path, exist_ok=True)

    # Mock repo & commits
    mock_commit = MagicMock()
    mock_commit.parents = [MagicMock()]
    mock_commit.diff.return_value = [
        MagicMock(a_path="file1.py",
                  b_path=None,
                  new_file=True,
                  deleted_file=False),
        MagicMock(a_path="file2.txt",
                  b_path=None,
                  new_file=True,
                  deleted_file=False),
    ]

    mock_repo = MagicMock()
    mock_repo.iter_commits.return_value = [mock_commit]
    mock_repo.heads = {"main": MagicMock()}
    mock_repo_path = str(repo_path)

    with patch("components.git_repo_inspector.Repo") as mock_repo_class:
        mock_repo_class.return_value = mock_repo

        inspector = GitRepoInspector()
        modified = inspector.get_recently_modified_files(
            mock_repo_path,
            commit_depth=1)

        assert any(f.endswith(".py") for f in modified)
        assert not any(f.endswith(".txt") for f in modified)
        assert len(modified) == 1
        assert modified[0].endswith("file1.py")

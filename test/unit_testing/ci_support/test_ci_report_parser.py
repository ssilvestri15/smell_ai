import pandas as pd
from ci_support.ci_report_parser import CIReportParser


def test_exists_file_found_and_not_empty(tmp_path):
    fake_file = tmp_path / "report.csv"
    fake_file.write_text("col1,col2\nval1,val2")
    parser = CIReportParser(report_path=str(fake_file))
    assert parser.exists() is True


def test_exists_file_missing():
    parser = CIReportParser(report_path="non_existent.csv")
    assert parser.exists() is False


def test_load_reads_csv(tmp_path):
    file_path = tmp_path / "overview.csv"
    df = pd.DataFrame({
        "filename": ["file1.py"],
        "smell_name": ["smellA"],
        "line": [10],
        "commit_hash": ["abc123"]
    })
    df.to_csv(file_path, index=False)
    parser = CIReportParser(report_path=str(file_path))
    loaded_df = parser.load()
    assert loaded_df.equals(df)


def test_to_markdown_empty_df(tmp_path):
    file_path = tmp_path / "overview.csv"
    df = pd.DataFrame(columns=[
        "filename",
        "smell_name",
        "line",
        "commit_hash"])
    df.to_csv(file_path, index=False)
    parser = CIReportParser(report_path=str(file_path))
    assert parser.to_markdown() == "_No code smells found._"


def test_get_smell_count(tmp_path):
    file_path = tmp_path / "overview.csv"
    df = pd.DataFrame({
        "filename": ["a.py", "b.py"],
        "smell_name": ["smell1", "smell2"],
        "line": [1, 2],
        "commit_hash": ["abc", "def"]
    })
    df.to_csv(file_path, index=False)
    parser = CIReportParser(report_path=str(file_path))
    assert parser.get_smell_count() == 2


def test_generate_issue_metadata_contains_expected_keys(tmp_path):
    file_path = tmp_path / "overview.csv"
    df = pd.DataFrame({
        "filename": ["main.py"],
        "smell_name": ["test_smell"],
        "line": [42],
        "commit_hash": ["123456789abcdef"]
    })
    df.to_csv(file_path, index=False)
    parser = CIReportParser(report_path=str(file_path))
    metadata = parser.generate_issue_metadata()
    assert "title" in metadata
    assert "body" in metadata
    assert "[CodeSmile]" in metadata["title"]


def test_generate_summary_with_smells(tmp_path):
    file_path = tmp_path / "overview.csv"
    df = pd.DataFrame({
        "filename": ["main.py", "utils.py"],
        "smell_name": ["bad_smell", "duplicated_logic"],
        "line": [12, 98],
        "commit_hash": ["deadbeef", "deadbeef"]
    })
    df.to_csv(file_path, index=False)
    parser = CIReportParser(report_path=str(file_path))
    summary = parser.generate_summary()

    assert "Summary" in summary
    assert "main.py" in summary
    assert "bad_smell" in summary
    assert "duplicated_logic" in summary


def test_generate_summary_no_smells(tmp_path):
    file_path = tmp_path / "overview.csv"
    df = pd.DataFrame(
        columns=["filename", "smell_name", "line", "commit_hash"]
    )
    df.to_csv(file_path, index=False)
    parser = CIReportParser(report_path=str(file_path))
    summary = parser.generate_summary()

    assert "_No code smells found._" in summary
    assert "Total code smells detected: 0" in summary

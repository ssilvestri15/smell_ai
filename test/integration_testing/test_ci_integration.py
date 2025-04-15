import pandas as pd
from unittest.mock import patch, MagicMock
from ci_support.ci_executor import CIExecutor
from ci_support.ci_report_parser import CIReportParser


@patch("subprocess.run")
def test_ci_executor_run_quick_scan_invokes_cli(mock_run):
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = "Done"
    mock_result.stderr = ""
    mock_run.return_value = mock_result

    CIExecutor.run_quick_scan(
        input_dir="test_in",
        output_dir="test_out",
        commit_depth=2)

    mock_run.assert_called_once()
    args = mock_run.call_args[0][0]
    assert "--input" in args and "test_in" in args
    assert "--output" in args and "test_out" in args
    assert "--commit-depth" in args and "2" in args
    assert "--quick-scan" in args


def test_ci_report_parser_full_flow(tmp_path):
    # 1. Prepara un file CSV finto con dati smell
    report_path = tmp_path / "overview.csv"
    df = pd.DataFrame({
        "filename": ["model.py", "trainer.py"],
        "smell_name": ["memory_not_freed", "forward_misused"],
        "line": [88, 21],
        "commit_hash": ["abc123", "abc123"]
    })
    df.to_csv(report_path, index=False)

    # 2. Inizializza il parser
    parser = CIReportParser(report_path=str(report_path))

    # 3. Testa tutte le funzionalità
    assert parser.exists()
    assert parser.get_smell_count() == 2

    markdown = parser.to_markdown()
    assert "model.py" in markdown
    assert "memory_not_freed" in markdown

    metadata = parser.generate_issue_metadata()
    assert "title" in metadata and "body" in metadata
    assert "[CodeSmile]" in metadata["title"]
    assert "memory_not_freed" in metadata["body"]
    assert "Summary" in metadata["body"]

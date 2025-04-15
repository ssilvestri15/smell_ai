from unittest.mock import patch, MagicMock
from ci_support.ci_executor import CIExecutor
import pandas as pd
from ci_support.ci_report_parser import CIReportParser


def test_run_quick_scan_success():
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = "Scan completed successfully"
    mock_result.stderr = ""

    with patch("subprocess.run", return_value=mock_result) as mock_run:
        with patch("builtins.print") as mock_print:
            CIExecutor.run_quick_scan(
                input_dir="test_input",
                output_dir="test_output",
                commit_depth=3)

            mock_run.assert_called_once_with(
                [
                    "python", "-m", "cli.cli_runner",
                    "--input", "test_input",
                    "--output", "test_output",
                    "--quick-scan",
                    "--commit-depth", "3"
                ],
                capture_output=True,
                text=True
            )

            mock_print.assert_any_call(""
                                       "[CIExecutor] Executing: "
                                       "python -m cli.cli_runner "
                                       "--input test_input "
                                       "--output test_output "
                                       "--quick-scan "
                                       "--commit-depth 3")
            mock_print.assert_any_call(""
                                       "[CIExecutor] "
                                       "Scan completed:\n"
                                       "Scan completed successfully")


def test_run_quick_scan_failure():
    mock_result = MagicMock()
    mock_result.returncode = 1
    mock_result.stdout = ""
    mock_result.stderr = "Some error occurred"

    with patch("subprocess.run", return_value=mock_result):
        with patch("builtins.print") as mock_print:
            CIExecutor.run_quick_scan()

            mock_print.assert_any_call("[CIExecutor] "
                                       "Error occurred:\n"
                                       "Some error occurred")


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
    df = pd.DataFrame(columns=[
        "filename",
        "smell_name",
        "line",
        "commit_hash"])
    df.to_csv(file_path, index=False)
    parser = CIReportParser(report_path=str(file_path))
    summary = parser.generate_summary()

    assert "_No code smells found._" in summary
    assert "Total code smells detected: 0" in summary

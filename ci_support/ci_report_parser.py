import os
import pandas as pd
from datetime import date
from tabulate import tabulate


class CIReportParser:
    """
    Utility class for reading
    and parsing CodeSmile output
    reports in CI pipelines.
    """

    def __init__(self,
                 report_path: str = "./codesmile_output/output/overview.csv"):
        self.report_path = report_path
        self._df = None

    def exists(self) -> bool:
        return (os.path.isfile(self.report_path)
                and os.path.getsize(self.report_path) > 0)

    def load(self) -> pd.DataFrame:
        if not self.exists():
            raise FileNotFoundError(f"Report file "
                                    f"not found: "
                                    f"{self.report_path}")
        self._df = pd.read_csv(self.report_path)
        return self._df

    def to_markdown(self) -> str:
        if self._df is None:
            self.load()
        if self._df.empty:
            return "_No code smells found._"
        return self._df.to_markdown(index=False)

    def get_smell_count(self) -> int:
        if self._df is None:
            self.load()
        return len(self._df)

    def generate_summary(self) -> str:
        if self._df is None:
            self.load()

        summary_lines = [
            "### 📊 Summary",
            f"- Analysis date: {date.today().strftime('%-d/%-m/%Y')}",
            f"- Total code smells detected: {len(self._df)}\n",
            "> ⚠️ It is recommended to review "
            "the indicated files to improve code quality.\n"
        ]

        if self._df.empty:
            summary_lines.append("_No code smells found._")
        else:
            self._df = self._df[
                ['filename', 'smell_name', 'line', 'commit_hash']
            ]
            summary_lines.append(
                tabulate(
                    self._df,
                    headers='keys',
                    tablefmt="github",
                    stralign="left",
                    numalign="left",
                    showindex=False,
                    colalign=["left"] * len(self._df.columns)
                )
            )

        return "\n".join(summary_lines)

    def generate_issue_metadata(self) -> dict:
        if self._df is None:
            self.load()
        commit_hash = self._df['commit_hash'].iloc[0][:7]
        issue_date = date.today().strftime("%-d/%-m/%Y")
        return {
            "title": f"🚨[CodeSmile] "
                     f"[{issue_date} - {commit_hash}]"
                     f" - Code smells detected in modified files",
            "body": self.generate_summary()
        }

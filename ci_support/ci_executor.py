# File: ci_support/ci_executor.py

class CIExecutor:
    """
    CIExecutor provides a wrapper to run CodeSmile in Quick Scan mode,
    for usage within CI/CD pipelines (e.g., GitHub Actions).
    """

    @staticmethod
    def run_quick_scan(
            input_dir: str = ".",
            output_dir: str = "./output",
            commit_depth: int = 1):
        import subprocess

        command = [
            "python", "-m", "cli.cli_runner",
            "--input", input_dir,
            "--output", output_dir,
            "--quick-scan",
            "--commit-depth", str(commit_depth),
        ]

        print(f"[CIExecutor] Executing: {' '.join(command)}")
        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"[CIExecutor] Error occurred:\n{result.stderr}")
        else:
            print(f"[CIExecutor] Scan completed:\n{result.stdout}")

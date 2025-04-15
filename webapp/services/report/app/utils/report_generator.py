import pandas as pd


def generate_report_data(projects: list) -> dict:
    """
    Generate aggregated report data for the given projects.
    Args:
        projects (list): List of project data containing smells and files.
    Returns:
        dict: Aggregated report data for charting.
    """
    combined_smells = []

    for project in projects:
        project_data = project.data

        for smell in project_data.smells:
            if smell:
                combined_smells.append(
                    {
                        "smell_name": smell.smell_name,
                        "filename": smell.file_name,  # ← usa direttamente il campo dello smell
                    }
                )

    # Create a DataFrame for analysis
    df = pd.DataFrame(combined_smells)
    if df.empty:
        return {}

    # Aggregate data for charting
    chart_data = df.groupby("smell_name")["filename"].count().reset_index()
    return {"all_projects_combined": chart_data.to_dict(orient="records")}
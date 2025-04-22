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
    project_health = {}
    top_offenders = {}
    top_functions = {}
    stacked_data = {}
    heatmap_data = {}
    smells_distribution = {}

    for project in projects:
        name = project.name
        smells = project.data.smells
        files = project.data.files

        combined_smells.extend([
            {
                "smell_name": s.smell_name,
                "filename": s.file_name,
            } for s in smells
        ])

        loc_total = sum(f.size for f in files if hasattr(f, 'size'))
        health = 1.0 - (len(smells) / loc_total) if loc_total > 0 else 0.0
        project_health[name] = round(health * 100, 2)

        # top files
        file_smell_counts = {}
        for s in smells:
            file_smell_counts[s.file_name] = (file_smell_counts
                                              .get(s.file_name, 0)
                                              + 1)
        top_offenders[name] = sorted(
            [{
                "filename": fn,
                "smell_count": sc
            } for fn, sc in file_smell_counts.items()
            ],
            key=lambda x: x["smell_count"],
            reverse=True
        )[:5]

        # top functions
        func_smell_counts = {}
        for s in smells:
            key = (s.function_name, s.file_name)
            func_smell_counts[key] = func_smell_counts.get(key, 0) + 1
        top_functions[name] = sorted(
            [{"function_name": fn, "filename": file, "smell_count": sc}
             for (fn, file), sc in func_smell_counts.items()],
            key=lambda x: x["smell_count"],
            reverse=True
        )[:5]

        # stacked bar + heatmap + pie data
        stack = {}
        heat = {}
        dist = {}
        for s in smells:
            key = (s.file_name, s.smell_name)
            stack[key] = stack.get(key, 0) + 1
            heat[key] = heat.get(key, 0) + 1
            dist[s.smell_name] = dist.get(s.smell_name, 0) + 1

        stacked_data[name] = [
            {"filename": fn, "smell_name": sn, "count": count}
            for (fn, sn), count in stack.items()
        ]
        heatmap_data[name] = [
            {"filename": fn, "smell_name": sn, "count": count}
            for (fn, sn), count in heat.items()
        ]
        smells_distribution[name] = [
            {"smell_name": sn, "count": count}
            for sn, count in dist.items()
        ]

    chart_df = pd.DataFrame(combined_smells)
    agg_chart = {}
    if not chart_df.empty:
        chart_data = (chart_df.groupby("smell_name")["filename"]
                      .count()
                      .reset_index())
        agg_chart = {
            "all_projects_combined": chart_data.to_dict(orient="records")
        }

    return {
        "report_data": agg_chart,
        "project_health": project_health,
        "top_offenders": top_offenders,
        "top_functions": top_functions,
        "stacked_data": stacked_data,
        "heatmap_data": heatmap_data,
        "smells_distribution": smells_distribution
    }

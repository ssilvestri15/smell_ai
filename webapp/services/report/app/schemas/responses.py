from pydantic import BaseModel
from typing import Dict, List, Union


class GenerateReportResponse(BaseModel):
    """
    Response model for generating reports
    that returns data for charting and PDF export.
    """

    report_data: Dict[str, List[Dict[str, Union[str, int]]]]
    project_health: Dict[str, float]
    top_offenders: Dict[str, List[Dict[str, Union[str, int]]]]
    top_functions: Dict[str, List[Dict[str, Union[str, int]]]]
    stacked_data: Dict[str, List[Dict[str, Union[str, int]]]]
    heatmap_data: Dict[str, List[Dict[str, Union[str, int]]]]
    smells_distribution: Dict[str, List[Dict[str, Union[str, int]]]]

    class Config:
        schema_extra = {
            "example": {
                "report_data": {
                    "all_projects_combined": [
                        {
                            "smell_name": "Unnecessary DataFrame Operation",
                            "filename": "file1.py",
                            "count": 5,
                        },
                        {
                            "smell_name": "Code Duplication",
                            "filename": "file2.py",
                            "count": 3,
                        },
                    ]
                },
                "project_health": {
                    "Project A": 75.3,
                    "Project B": 68.9
                },
                "top_offenders": {
                    "Project A": [
                        {"filename": "utils.py", "smell_count": 12}
                    ]
                },
                "top_functions": {
                    "Project A": [
                        {
                            "function_name": "process",
                            "filename": "utils.py",
                            "smell_count": 5
                        }
                    ]
                },
                "stacked_data": {
                    "Project A": [
                        {
                            "filename": "data.py",
                            "smell_name": "ChainIndexing",
                            "count": 2
                        }
                    ]
                },
                "heatmap_data": {
                    "Project A": [
                        {
                            "filename": "data.py",
                            "smell_name": "ChainIndexing",
                            "count": 2
                        }
                    ]
                },
                "smells_distribution": {
                    "Project A": [
                        {
                            "smell_name": "ChainIndexing",
                            "count": 4
                        }
                    ]
                }
            }
        }

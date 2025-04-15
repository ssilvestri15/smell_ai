from fastapi.testclient import TestClient
from webapp.gateway import main

# flake8: noqa

# Create the test client
client = TestClient(main.app)


# Test case to check the generate_report endpoint with valid data
def test_generate_report_valid_data():
    payload = {
        "projects": [
            {
                "name": "Project",
                "data": {
                    "files": [
                        {
                            "name": "1.py",
                            "size": 1024,
                            "type": "python",
                            "path": "/project/1.py",
                        }
                    ],
                    "message": "Analysis completed.",
                    "result": "Success",
                    "smells": [
                        {
                            "function_name": "function",
                            "file_name": "1.py",
                            "line": 5,
                            "smell_name": "Unnecessary DataFrame Operation",
                            "description": "Avoid unnecessary operations on DataFrames.",
                            "additional_info": "Consider simplifying the operation.",
                        }
                    ],
                },
            },
        ]
    }

    expected_response = {
        "report_data": {
            "all_projects_combined": [
                {
                    "smell_name": "Unnecessary DataFrame Operation",
                    "filename": "1"
                },
            ]
        },
        "project_health": {
            "Project": 99.9
        },
        "top_offenders": {
            "Project": [
                {
                    "filename": "1.py",
                    "smell_count": "1"
                }
            ]
        },
        "top_functions": {
            "Project": [
                {
                    "function_name": "function",
                    "filename": "1.py",
                    "smell_count": "1"
                }
            ]
        },
        "stacked_data": {
            "Project": [
                {
                    "filename": "1.py",
                    "smell_name": "Unnecessary DataFrame Operation",
                    "count": "1"
                }
            ]
        },
        "heatmap_data": {
            "Project": [
                {
                    "filename": "1.py",
                    "smell_name": "Unnecessary DataFrame Operation",
                    "count": "1"
                }
            ]
        },
        "smells_distribution": {
            "Project": [
                {
                    "smell_name": "Unnecessary DataFrame Operation",
                    "count": "1"
                }
            ]
        }
    }

    response = client.post("/api/generate_report", json=payload)
    print("Actual:", response.json())
    print("Expected:", expected_response)
    assert response.status_code == 200
    assert response.json() == expected_response

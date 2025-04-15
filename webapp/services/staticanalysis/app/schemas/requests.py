from pydantic import BaseModel


class DetectSmellRequest(BaseModel):
    """
    Schema for the request body to detect code smells.
    """

    file_name: str
    code_snippet: str

    class Config :
        schema_extra = {
            "example": {
                "file_name": "example.py",
                "code_snippet": """ 
                def example_function():
                    # This is an example function
                    x = 1
                    y = 2
                    return x + y
                """,
            }
        }
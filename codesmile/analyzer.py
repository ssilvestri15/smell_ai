"""Main analyzer module for CodeSmile."""
import os
import json
import tempfile
from typing import List, Union, Dict, Any
import pandas as pd

from .components.inspector import Inspector
from .utils.file_utils import FileUtils


class CodeSmileAnalyzer:
    """Main analyzer class for detecting ML-specific code smells."""
    
    def __init__(self, debug: bool = False):
        """Initialize the analyzer."""
        self.debug = debug
        self.temp_dir = tempfile.mkdtemp()
        self.inspector = Inspector(
            output_path=self.temp_dir,
            dataframe_dict_path=self._get_resource_path("dataframes.csv"),
            model_dict_path=self._get_resource_path("models.csv"),
            tensor_dict_path=self._get_resource_path("tensors.csv"),
            debug=self.debug
        )
    
    def _get_resource_path(self, filename: str) -> str:
        """Get path to resource file."""
        package_dir = os.path.dirname(__file__)
        return os.path.join(package_dir, "resources", filename)
    
    def analyze(self, paths: Union[str, List[str]]) -> str:
        """
        Analyze Python files for ML-specific code smells.
        
        Args:
            paths: Single path (str) or list of paths to analyze.
                   Can be files (.py) or directories.
        
        Returns:
            JSON string with analysis results
        """
        if isinstance(paths, str):
            paths = [paths]
        
        # Collect all Python files
        python_files = []
        for path in paths:
            if os.path.isfile(path) and path.endswith('.py'):
                python_files.append(path)
            elif os.path.isdir(path):
                python_files.extend(FileUtils.get_python_files(path))
        
        if not python_files:
            return json.dumps({
                "total_smells": 0,
                "smells_by_file": {},
                "smells_by_type": {},
                "detections": []
            }, indent=2)
        
        # Analyze each file
        all_detections = []
        smells_by_file = {}
        smells_by_type = {}
        
        for file_path in python_files:
            try:
                df_result = self.inspector.inspect(file_path)
                
                file_smells = len(df_result)
                if file_smells > 0:
                    smells_by_file[file_path] = file_smells
                    
                    for _, row in df_result.iterrows():
                        detection = {
                            "filename": row['filename'],
                            "function_name": row['function_name'],
                            "smell_name": row['smell_name'],
                            "line": row['line'],
                            "description": row['description'],
                            "additional_info": row['additional_info']
                        }
                        all_detections.append(detection)
                        
                        # Count by type
                        smell_name = row['smell_name']
                        smells_by_type[smell_name] = smells_by_type.get(smell_name, 0) + 1
                        
            except Exception as e:
                if self.debug:
                    print(f"Warning: Error analyzing {file_path}: {e}")
                continue
        
        result = {
            "total_smells": len(all_detections),
            "smells_by_file": smells_by_file,
            "smells_by_type": smells_by_type,
            "detections": all_detections
        }
        
        return json.dumps(result, indent=2)
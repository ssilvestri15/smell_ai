import os
import ast
import pandas as pd
import re
from ..code_extractor.library_extractor import LibraryExtractor
from ..code_extractor.model_extractor import ModelExtractor
from ..code_extractor.dataframe_extractor import DataFrameExtractor
from ..code_extractor.variable_extractor import VariableExtractor
from .rule_checker import RuleChecker


class Inspector:
    """
    Inspects Python code for code smells by extracting relevant information
    and applying detection rules using AST-based analysis.
    """

    def __init__(
        self,
        output_path: str,
        dataframe_dict_path: str = "obj_dictionaries/dataframes.csv",
        model_dict_path: str = "obj_dictionaries/models.csv",
        tensor_dict_path: str = "obj_dictionaries/tensors.csv",
    ):
        """
        Initializes the Inspector with the output path for
        saving detected smells.

        Parameters:
        - output_path (str): Path where detected smells will be saved.
        - dataframe_dict_path (str): Path to the DataFrame dictionary CSV.
        - model_dict_path (str): Path to the model dictionary CSV.
        - tensor_dict_path (str): Path to the tensor operations CSV.
        """
        self.output_path = output_path
        self._setup(dataframe_dict_path, model_dict_path, tensor_dict_path)

    def inspect(self, filename: str) -> pd.DataFrame:
        """
        Inspects a file for code smells by parsing it into an AST and applying
        rules.

        Parameters:
        - filename (str): The name of the file to analyze.

        Returns:
        - pd.DataFrame: A DataFrame containing detected code smells.
        """
        col = [
            "filename",
            "function_name",
            "smell_name",
            "line",
            "description",
            "additional_info",
        ]
        to_save = pd.DataFrame(columns=col)
        file_path = os.path.abspath(filename)

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                source = file.read()

            # Parse the file into an AST with appropriate Python version handling
            tree = self._parse_with_version_detection(source, filename)
            lines = source.splitlines()

            # Step 1: Extract Libraries
            libraries = self.library_extractor.get_library_aliases(
                self.library_extractor.extract_libraries(tree)
            )

            # Step 2: Analyze Functions and Extract Variables
            variables_by_function = {}
            dataframe_variables_by_function = {}
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    function_name = node.name
                    variables_by_function[function_name] = (
                        self.variable_extractor.extract_variable_definitions(
                            node
                        )
                    )
                    dataframe_variables_by_function[function_name] = (
                        self.dataframe_extractor.extract_dataframe_variables(
                            node, alias=libraries.get("pandas", None)
                        )
                    )

            # Step 3: Load Dictionaries (preloaded during setup)
            models = self.model_extractor.model_dict
            tensor_operations = self.model_extractor.tensor_operations_dict
            dataframe_methods = self.dataframe_extractor.df_methods

            # Step 4: Rule Check on Each Function
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    try:
                        function_data = {
                            "libraries": libraries,
                            "variables": variables_by_function[node.name],
                            "lines": {
                                n.lineno: lines[n.lineno - 1]
                                for n in ast.walk(tree)
                                if hasattr(n, "lineno")
                            },
                            "dataframe_methods": dataframe_methods,
                            "dataframe_variables": (
                                dataframe_variables_by_function[node.name]
                            ),
                            "tensor_operations": tensor_operations.get(
                                "operation", []
                            ),
                            "models": {
                                model: models[model] for model in models.keys()
                            },
                            "model_methods": (
                                self.model_extractor.load_model_methods()
                            ),
                        }

                        # Pass data to the Rule Checker
                        to_save = self.rule_checker.rule_check(
                            node, function_data, filename, node.name, to_save
                        )
                    except Exception as e:
                        print(
                            f"Error processing function '{node.name}' in file "
                            f"'{filename}': {e}"
                        )
                        raise e

        except FileNotFoundError as e:
            print(f"Error: File '{filename}' not found. {e}")
            raise FileNotFoundError(f"Error in file {filename}: {e}")
        except SyntaxError as e:
            print(f"Syntax error in file '{filename}': {e}")
            raise SyntaxError(f"Error in file {filename}: {e}")
        except Exception as e:
            print(f"Unexpected error while analyzing file '{filename}': {e}")
            raise e

        return to_save

    def _parse_with_version_detection(self, source: str, filename: str):
        """
        Parse source code with automatic Python version detection.
        
        Parameters:
        - source (str): The source code content
        - filename (str): The filename for context
        
        Returns:
        - ast.AST: The parsed AST tree
        """
        # First, try to determine if this is Python 2 code
        is_python2 = self._detect_python2_code(source, filename)
        
        if is_python2:
            print(f"Detected Python 2 code in {filename}, parsing with Python 2 compatibility")
            
            # Try parsing with Python 2 compatibility mode
            # Note: This converts Python 2 print statements to Python 3 format for AST parsing
            source_converted = self._convert_python2_syntax(source)
            
            try:
                return ast.parse(source_converted, filename=filename)
            except SyntaxError:
                # If conversion failed, try original source with Python 3 parser
                print(f"Python 2 conversion failed for {filename}, trying as Python 3")
                return ast.parse(source, filename=filename)
        else:
            # Parse as Python 3
            return ast.parse(source, filename=filename)

    def _detect_python2_code(self, source: str, filename: str) -> bool:
        """
        Detect if source code is Python 2 based on various indicators.
        
        Parameters:
        - source (str): The source code content
        - filename (str): The filename for additional context
        
        Returns:
        - bool: True if the code appears to be Python 2
        """
        # Check shebang line for python2 indicators
        first_line = source.split('\n')[0] if source else ""
        if re.match(r'#!/.*python2', first_line):
            return True
        
        # Check for definitive Python 2 syntax patterns
        python2_indicators = [
            r'\bprint\s+[^(]',           # print statement without parentheses
            r'\.iteritems\(\)',          # dict.iteritems()
            r'\.iterkeys\(\)',           # dict.iterkeys()  
            r'\.itervalues\(\)',         # dict.itervalues()
            r'\bxrange\s*\(',            # xrange function
            r'from\s+__future__\s+import', # future imports
        ]
        
        # Count matches
        matches = sum(1 for pattern in python2_indicators if re.search(pattern, source))
        
        # Consider it Python 2 if we find 2 or more indicators
        return matches >= 2

    def _convert_python2_syntax(self, source: str) -> str:
        """
        Convert basic Python 2 syntax to Python 3 for AST parsing.
        
        Parameters:
        - source (str): The source code content
        
        Returns:
        - str: Source code with basic Python 2 to 3 conversions
        """
        # Convert print statements to print functions
        # This regex handles: print "hello" -> print("hello")
        #                    print var -> print(var)  
        #                    print func() -> print(func())
        source = re.sub(r'\bprint\s+([^(].*?)(?=\n|$)', r'print(\1)', source, flags=re.MULTILINE)
        
        # Convert xrange to range
        source = source.replace('xrange(', 'range(')
        
        # Convert dict iteration methods
        source = source.replace('.iteritems()', '.items()')
        source = source.replace('.iterkeys()', '.keys()')
        source = source.replace('.itervalues()', '.values()')
        
        # Handle unicode literals - remove u prefix
        source = re.sub(r'\bu["\']', '"', source)
        source = re.sub(r'\bu["\']', "'", source)
        
        return source

    def _setup(
        self,
        dataframe_dict_path: str,
        model_dict_path: str,
        tensor_dict_path: str,
    ) -> None:
        """
        Sets up the necessary components for the Inspector.

        Parameters:
        - dataframe_dict_path (str): Path to the DataFrame dictionary CSV.
        - model_dict_path (str): Path to the model dictionary CSV.
        - tensor_dict_path (str): Path to the tensor operations CSV.
        """
        # Initialize the RuleChecker with smells and extractors
        self.rule_checker = RuleChecker(self.output_path)

        self.variable_extractor = VariableExtractor()
        self.library_extractor = LibraryExtractor()
        self.model_extractor = ModelExtractor(
            models_path=model_dict_path,
            tensors_path=tensor_dict_path,
        )
        self.dataframe_extractor = DataFrameExtractor(
            df_dict_path=dataframe_dict_path,
        )

        # Preload dictionaries to avoid runtime errors
        self.model_extractor.load_model_dict()
        self.model_extractor.load_tensor_operations_dict()
        self.dataframe_extractor.load_dataframe_dict(dataframe_dict_path)
import os
import ast
import pandas as pd
import re
from ..code_extractor.library_extractor import LibraryExtractor
from ..code_extractor.model_extractor import ModelExtractor
from ..code_extractor.dataframe_extractor import DataFrameExtractor
from ..code_extractor.variable_extractor import VariableExtractor
from .rule_checker import RuleChecker

# Import lib2to3 for Python 2 parsing
try:
    from lib2to3 import pygram, pytree
    from lib2to3.pgen2 import driver
    from lib2to3.pgen2.parse import ParseError
    HAS_LIB2TO3 = True
except ImportError:
    HAS_LIB2TO3 = False
    print("Warning: lib2to3 not available")


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
        
        # Initialize Python 2 parser using lib2to3
        if HAS_LIB2TO3:
            self._init_lib2to3_parser()

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

            # Parse the file into an AST with cascading fallback approach
            tree = self._parse_with_cascading_fallback(source, filename)
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

    def _init_lib2to3_parser(self):
        """Initialize the lib2to3 parser for Python 2 code."""
        if HAS_LIB2TO3:
            # Initialize the Python 2 grammar driver
            self.py2_driver = driver.Driver(pygram.python_grammar, convert=pytree.convert)

    def _parse_with_cascading_fallback(self, source: str, filename: str):
        """
        Parse source code with cascading fallback approach:
        1. Try Python 3 (ast.parse)
        2. If fails, try Python 2 (lib2to3)
        3. If fails, use syntax conversion fallback
        
        Parameters:
        - source (str): The source code content
        - filename (str): The filename for context
        
        Returns:
        - ast.AST: The parsed AST tree
        """
        # Step 1: Try Python 3 parsing first
        try:
            print(f"Trying Python 3 parsing for {filename}")
            return ast.parse(source, filename=filename)
        except SyntaxError as py3_error:
            print(f"Python 3 parsing failed for {filename}: {py3_error}")
            
            # Step 2: Try lib2to3 for Python 2
            if HAS_LIB2TO3:
                try:
                    print(f"Trying lib2to3 Python 2 parsing for {filename}")
                    
                    # Parse with lib2to3
                    py2_tree = self.py2_driver.parse_string(source + '\n')
                    
                    # Convert lib2to3 parse tree to Python 3 compatible source
                    python3_source = self._convert_lib2to3_tree_to_python3(py2_tree, source)
                    
                    # Parse the converted source with standard ast
                    print(f"Successfully converted Python 2 to Python 3 for {filename}")
                    return ast.parse(python3_source, filename=filename)
                    
                except ParseError as lib2to3_error:
                    print(f"lib2to3 parsing failed for {filename}: {lib2to3_error}")
                except Exception as lib2to3_error:
                    print(f"lib2to3 conversion failed for {filename}: {lib2to3_error}")
            else:
                print(f"lib2to3 not available for {filename}")
            
            # Step 3: Use syntax conversion fallback
            try:
                print(f"Using syntax conversion fallback for {filename}")
                source_converted = self._convert_python2_syntax(source)
                return ast.parse(source_converted, filename=filename)
            except SyntaxError as fallback_error:
                print(f"All parsing methods failed for {filename}")
                # Re-raise the original Python 3 error for better debugging
                raise py3_error

    def _convert_lib2to3_tree_to_python3(self, py2_tree, original_source: str) -> str:
        """
        Convert lib2to3 parse tree to Python 3 compatible source code.
        
        For now, this is a simplified approach that uses basic regex conversion.
        A full lib2to3 -> Python 3 converter would be quite complex.
        
        Parameters:
        - py2_tree: Parse tree from lib2to3
        - original_source: Original source code
        
        Returns:
        - str: Python 3 compatible source code
        """
        # Since lib2to3 successfully parsed it as Python 2, we know it's valid Python 2
        # Apply our conversion rules with confidence
        return self._convert_python2_syntax(original_source)

    def _convert_python2_syntax(self, source: str) -> str:
        """
        Convert basic Python 2 syntax to Python 3 for AST parsing.
        
        Parameters:
        - source (str): The source code content
        
        Returns:
        - str: Source code with basic Python 2 to 3 conversions
        """
        # Convert print statements to print functions
        # Handle various print statement formats
        source = re.sub(r'\bprint\s+([^(].*?)(?=\n|$)', r'print(\1)', source, flags=re.MULTILINE)
        
        # Convert exception syntax: except Exception, e: -> except Exception as e:
        source = re.sub(r'\bexcept\s+([^,]+),\s*([^:]+):', r'except \1 as \2:', source)
        
        # Convert lambda tuple unpacking - handle the specific case from the file
        # lambda (a, b): b -> lambda item: item[1]
        source = re.sub(r'lambda\s+\(\s*([^,)]+)\s*,\s*([^,)]+)\s*\)\s*:\s*\2\b', 
                       r'lambda item: item[1]', source)
        source = re.sub(r'lambda\s+\(\s*([^,)]+)\s*,\s*([^,)]+)\s*\)\s*:\s*\1\b', 
                       r'lambda item: item[0]', source)
        
        # More general lambda tuple unpacking removal (just remove parentheses)
        source = re.sub(r'lambda\s+\(([^)]+)\)\s*:', r'lambda \1:', source)
        
        # Convert xrange to range
        source = source.replace('xrange(', 'range(')
        
        # Convert dict iteration methods
        source = source.replace('.iteritems()', '.items()')
        source = source.replace('.iterkeys()', '.keys()')
        source = source.replace('.itervalues()', '.values()')
        
        # Handle unicode literals - remove u prefix
        source = re.sub(r'\bu(["\'])', r'\1', source)
        
        # Convert urllib2 to urllib (basic conversion for parsing)
        source = source.replace('import urllib2', 'import urllib.request as urllib2')
        source = source.replace('from urllib2', 'from urllib.request')
        
        # Handle raw_input -> input (though this might not be needed for AST parsing)
        source = source.replace('raw_input(', 'input(')
        
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
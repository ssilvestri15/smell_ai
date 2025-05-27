# CodeSmile: Machine Learning-Specific Code Smell Detection Module

A lightweight Python module for detecting **machine learning-specific code smells** in Python projects. CodeSmile identifies suboptimal implementation patterns that impact the quality, maintainability, and performance of ML code through **Abstract Syntax Tree (AST)** parsing and rule-based analysis.

## Features

- **16 ML-Specific Code Smells Detection**: Comprehensive analysis of common ML coding issues
- **AST-Based Analysis**: Deep code structure analysis without executing code
- **JSON Output**: Structured results for easy integration and processing
- **Multi-Path Support**: Analyze single files, directories, or mixed paths
- **Zero Configuration**: Works out of the box with sensible defaults
- **Lightweight**: Minimal dependencies, focused on core functionality

## Installation

### Option 1: Local Development Installation (Recommended)

```bash
git clone <repository-url>
cd codesmile
pip install -e .
```

### Option 2: Direct Installation

```bash
pip install codesmile
```

## Quick Start

```python
from codesmile import CodeSmileAnalyzer
import json

# Initialize analyzer
analyzer = CodeSmileAnalyzer()

# Analyze a single file
result = analyzer.analyze("my_ml_script.py")
data = json.loads(result)
print(f"Found {data['total_smells']} code smells")

# Analyze multiple paths (files and directories)
result = analyzer.analyze([
    "src/models/neural_network.py",
    "src/data_processing/",
    "notebooks/analysis.py"
])

# Process results
data = json.loads(result)
for detection in data['detections']:
    print(f"{detection['smell_name']} in {detection['filename']}:{detection['line']}")
```

## Detected Code Smells

CodeSmile detects **16 different ML-specific code smells** organized into two categories:

### API-Specific Code Smells

| **Smell Name** | **Description** |
|---|---|
| **Chain Indexing** | Inefficient use of chained indexing in Pandas DataFrames (`df["col"][0]`) |
| **DataFrame Conversion API Misused** | Using deprecated `.values` instead of `.to_numpy()` for DataFrame conversion |
| **Gradients Not Cleared** | Missing `optimizer.zero_grad()` before backward propagation in PyTorch |
| **Matrix Multiplication API Misused** | Misusing NumPy's `np.dot()` for matrix multiplication instead of `@` or `np.matmul()` |
| **PyTorch Call Method Misused** | Direct use of `self.net.forward()` instead of calling `self.net()` in PyTorch |
| **TensorArray Not Used** | Using `tf.constant()` inefficiently in loops instead of `tf.TensorArray()` |

### Generic Code Smells

| **Smell Name** | **Description** |
|---|---|
| **Broadcasting Feature Not Used** | Tensor operations that fail to utilize TensorFlow's broadcasting feature |
| **Columns and DataType Not Explicitly Set** | DataFrames created without explicitly setting column names and data types |
| **Deterministic Algorithm Option Not Used** | Unnecessary use of `torch.use_deterministic_algorithms(True)` |
| **Empty Column Misinitialization** | Initializing DataFrame columns with zeros or empty strings instead of NaN |
| **Hyperparameters Not Explicitly Set** | Missing explicit hyperparameter definitions for ML models |
| **In-Place APIs Misused** | Incorrect assumptions about Pandas in-place operations |
| **Memory Not Freed** | Failing to free memory for ML models declared in loops |
| **Merge API Parameter Not Explicitly Set** | Missing explicit `how` and `on` parameters in Pandas merge operations |
| **NaN Equivalence Comparison Misused** | Incorrect comparison of DataFrame values with `np.nan` |
| **Unnecessary Iteration** | Using explicit loops instead of Pandas vectorized operations |

## Usage Examples

### Basic Analysis

```python
from codesmile import CodeSmileAnalyzer
import json

analyzer = CodeSmileAnalyzer()

# Single file analysis
result = analyzer.analyze("src/model_training.py")
data = json.loads(result)

print(f"📊 Analysis Results:")
print(f"   Total issues: {data['total_smells']}")
print(f"   Files analyzed: {len(data['smells_by_file'])}")
print(f"   Issue types: {len(data['smells_by_type'])}")
```

### Detailed Issue Processing

```python
result = analyzer.analyze("src/")
data = json.loads(result)

# Group issues by type
for smell_type, count in data['smells_by_type'].items():
    print(f"{smell_type}: {count} occurrences")

# Show detailed information for each issue
for detection in data['detections']:
    print(f"""
    📁 File: {detection['filename']}
    🔧 Function: {detection['function_name']}
    ⚠️  Issue: {detection['smell_name']}
    📍 Line: {detection['line']}
    💡 Details: {detection['additional_info']}
    """)
```

### Multi-Path Analysis

```python
# Analyze mixed paths: files and directories
paths = [
    "src/models/",              # Directory
    "notebooks/analysis.py",    # Single file
    "utils/data_processing/",   # Another directory
    "main.py"                   # Root file
]

result = analyzer.analyze(paths)
data = json.loads(result)

# Show results by file
for filename, count in data['smells_by_file'].items():
    print(f"{filename}: {count} issues")
```

## Output Format

The analysis returns a JSON string with the following structure:

```json
{
  "total_smells": 12,
  "smells_by_file": {
    "src/model.py": 5,
    "src/training.py": 3,
    "src/data_loader.py": 4
  },
  "smells_by_type": {
    "hyperparameters_not_explicitly_set": 4,
    "gradients_not_cleared_before_backward_propagation": 2,
    "unnecessary_iteration": 3,
    "Chain_Indexing": 2,
    "memory_not_freed": 1
  },
  "detections": [
    {
      "filename": "src/model.py",
      "function_name": "train_model",
      "smell_name": "hyperparameters_not_explicitly_set",
      "line": 25,
      "description": "Hyperparameters should be explicitly set when defining models to ensure clarity and reproducibility.",
      "additional_info": "Hyperparameters not explicitly set for model 'RandomForestClassifier'. Consider defining key hyperparameters for clarity."
    }
  ]
}
```

## Requirements

- **Python**: 3.8 or higher
- **Dependencies**: 
  - `pandas >= 1.3.0`
  - `numpy >= 1.20.0`

## Architecture

CodeSmile follows a modular architecture:

```
codesmile/
├── analyzer.py              # Main API interface
├── components/
│   ├── inspector.py         # Core AST analysis engine
│   └── rule_checker.py      # Rule application logic
├── code_extractor/          # AST information extractors
│   ├── library_extractor.py
│   ├── model_extractor.py
│   ├── dataframe_extractor.py
│   └── variable_extractor.py
├── detection_rules/         # Smell detection implementations
│   ├── api_specific/        # Framework-specific rules
│   └── generic/             # General ML code rules
└── resources/               # Configuration files
    ├── models.csv
    ├── dataframes.csv
    └── tensors.csv
```

## Contributing

This project builds on the research presented in:
**"When Code Smells Meet ML: On the Lifecycle of ML-Specific Code Smells in ML-Enabled Systems"**

- **Original Authors**: *Gilberto Recupito, Giammaria Giordano, Filomena Ferrucci, Dario Di Nucci, Fabio Palomba*
- **Forked Version Authors**: Matteo Ercolino, Simone Silvestri
- **Paper**: [arXiv:2403.08311](https://arxiv.org/abs/2403.08311)
- **Appendix**: [Figshare](https://figshare.com/articles/online_resource/When_Code_Smells_Meet_ML_On_the_Lifecycle_of_ML-specific_Code_Smells_in_ML-enabled_Systems_-_Appendix/25231817?file=44582128)

Light version by **Simone Silvestri**.

## License

MIT License - see LICENSE file for details.

## Changelog

### Version 1.0.0
- ✅ Lightweight module version extracted from full CLI tool
- ✅ 16 ML-specific code smell detectors
- ✅ JSON output format for easy integration
- ✅ Multi-path analysis support
- ✅ Zero-configuration setup
- ✅ Comprehensive documentation and examples

---

**CodeSmile** helps you maintain high-quality machine learning code by automatically detecting and reporting common ML-specific antipatterns. Happy coding! 🚀

--

Made with ❤️ by **Simone Silvestri**
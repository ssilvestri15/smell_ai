from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="codesmile",
    version="1.0.0",
    author="Lighy by Simone Silvestri",
    description="A module for detecting ML-specific code smells in Python",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(),
    python_requires=">=3.11.10",
    install_requires=[
        "pandas>=2.0.0",
        "numpy>=1.24.0",
        "GitPython>=3.1.31",
        "matplotlib>=3.6.0",
        "openpyxl>=3.1.0",
    ],
    include_package_data=True,
    package_data={
        "codesmile": ["resources/*.csv"],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Software Development :: Quality Assurance",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
)
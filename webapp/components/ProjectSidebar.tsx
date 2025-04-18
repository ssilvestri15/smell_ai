import { motion } from "framer-motion";
import { ProjectType } from "@/types/types";
import { useState, useRef } from "react";
import { detectAi, detectStatic } from "../utils/api";
import { toast } from "react-toastify";
import Modal from "./Modal"; // You'll need to create this or use an existing modal component

interface ProjectSidebarProps {
  projects: ProjectType[];
  selectedProject: ProjectType | null;
  onSelectProject: (project: ProjectType) => void;
  updateProject: (index: number, updatedData: Partial<ProjectType>) => void;
}

export default function ProjectSidebar({
  projects,
  selectedProject,
  onSelectProject,
  updateProject
}: ProjectSidebarProps) {
  const [showModal, setShowModal] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<"AI" | "Static">("Static");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddProject = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleFolderSelect = () => {
    if (fileInputRef.current) {
      (fileInputRef.current as HTMLInputElement).webkitdirectory = true;
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = fileList ? Array.from(fileList) : [];
    const filteredFiles = files.filter((file) => file.name.endsWith(".py") && file.name !== "__init__.py");

    if (!filteredFiles || filteredFiles.length == 0) return;
    const folderName = filteredFiles[0].webkitRelativePath.split("/")[0];
    // Create a new project with the selected files
    const newProjectIndex = projects.length;
    const projectName = (!folderName) ? `Project ${newProjectIndex + 1}` : folderName;

    // Close the modal
    setShowModal(false);

    // Create new project and set it to loading state
    updateProject(newProjectIndex, {
      name: projectName,
      files: Array.from(filteredFiles),
      isLoading: true,
      data: {
        files: null,
        message: "Uploading and analyzing the project...",
        result: null,
        smells: []
      }
    });

    // Begin analysis
    await analyzeProject(newProjectIndex, Array.from(filteredFiles));
  };

  const analyzeProject = async (projectIndex: number, pythonFiles: File[]) => {
    try {

      if (pythonFiles.length === 0) {
        updateProject(projectIndex, {
          isLoading: false,
          data: {
            files: null,
            message: "No valid files found for analysis.",
            result: null,
            smells: []
          }
        });
        toast.warning("No valid files found for analysis.");
        return;
      }

      // Prepare code snippets for analysis
      const resolvedSnippets = await Promise.all(
        pythonFiles.map(async (file) => {
          const content = await file.text();
          return { file, content };
        })
      );

      // Analyze code snippets based on selected mode
      const results = await Promise.all(
        resolvedSnippets.map(async (snippet) => {
          try {
            const result = analysisMode === "AI"
              ? await detectAi(snippet.content)
              : await detectStatic(snippet.file.name, snippet.content);

            if (result?.success === false) {
              toast.error(`Analysis failed for file: ${snippet.file.name}`);
            }
            return result;
          } catch (error: any) {
            toast.error(`Error analyzing file: ${snippet.file.name}`);
            return { smells: [] };
          }
        })
      );

      // Process results and update project
      const resultString = generateResultString(results, pythonFiles);

      updateProject(projectIndex, {
        files: pythonFiles,
        isLoading: false,
        data: {
          files: pythonFiles.map(file => file.name),
          message: "Project successfully analyzed!",
          result: resultString,
          smells: results.flatMap(result => result.smells || []),
        }
      });

      toast.success("Project analysis completed!");
    } catch (error) {
      toast.error("Error during project analysis");

      updateProject(projectIndex, {
        isLoading: false,
        data: {
          files: null,
          message: "Error analyzing project.",
          result: null,
          smells: [],
        }
      });
    }
  };

  const generateResultString = (projectResults: any[], projectFiles: File[]) => {
    return projectResults
      .map((res, fileIndex) => {
        const fileName = projectFiles[fileIndex].name;
        const smells = Array.isArray(res.smells) ? res.smells : [];
        return `File: ${fileName}\n` + smells
          .map((smell: { function_name: any; file_name: any; line: any; smell_name: any; description: any; additional_info: any; }) => {
            let result = "";
            if (smell.function_name) result += `Function: ${smell.function_name}\n`;
            if (smell.file_name) result += `File: ${smell.file_name}\n`;
            if (smell.line) result += `Line: ${smell.line}\n`;
            if (smell.smell_name) result += `Smell: ${smell.smell_name}\n`;
            if (smell.description) result += `Description: ${smell.description}\n`;
            if (smell.additional_info) result += `Additional Info: ${smell.additional_info}\n`;
            return result.trim();
          })
          .join("\n\n");
      })
      .join("\n\n");
  };

  return (
    <aside className="bg-white w-64 p-6 border-r border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Projects</h2>

      {/* Add Project Button
      <motion.button
        className="w-full mb-4 py-2 px-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
        onClick={handleAddProject}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Project
      </motion.button>
       */}

      {/* Projects List */}
      <ul className="space-y-2">
        {projects.map((project, index) => (
          <motion.li
            key={index}
            className={`py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-between ${selectedProject?.name === project.name
              ? "font-semibold text-blue-600 bg-blue-50"
              : "text-gray-700 hover:text-blue-500 hover:bg-gray-100"
              }`}
            whileHover={{ x: project.isLoading ? 0 : 3 }}
          >
            {/* Project name with click handler (disabled during loading) */}
            <div
              className="flex-grow cursor-pointer"
              onClick={() => !project.isLoading && onSelectProject(project)}
              style={{ cursor: project.isLoading ? "not-allowed" : "pointer" }}
            >
              {project.name || `Project ${index + 1}`}
            </div>

            {/* Loading indicator */}
            {project.isLoading && (
              <div className="flex-shrink-0 w-5 h-5">
                <CircularProgress />
              </div>
            )}
          </motion.li>
        ))}
      </ul>

      {/* Hidden file input for directory selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        multiple
      />

      {/* Modal for analysis options */}
      {showModal && (
        <Modal onClose={handleCloseModal}>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">Project Analysis Options</h3>

            {/* Analysis Mode Toggle */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Select Analysis Mode:</p>
              <div className="flex space-x-2">
                <button
                  className={`px-4 py-2 rounded-md ${analysisMode === "AI"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800"
                    }`}
                  onClick={() => setAnalysisMode("AI")}
                >
                  AI Analysis
                </button>
                <button
                  className={`px-4 py-2 rounded-md ${analysisMode === "Static"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800"
                    }`}
                  onClick={() => setAnalysisMode("Static")}
                >
                  Static Analysis
                </button>
              </div>
            </div>

            {/* Select folder button */}
            <motion.button
              className="w-full py-2 px-3 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 transition-colors duration-200 flex items-center justify-center"
              onClick={handleFolderSelect}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Select Project Folder
            </motion.button>
          </div>
        </Modal>
      )}
    </aside>
  );
}

// Simple CircularProgress component
function CircularProgress() {
  return (
    <motion.div
      className="w-5 h-5 rounded-full border-2 border-t-transparent border-blue-600"
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
}
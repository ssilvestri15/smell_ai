"use client";
import { useState, useCallback, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import Header from "../../components/HeaderComponent";
import Footer from "../../components/FooterComponent";
import { generateReport } from "../../utils/api";
import { useProjectContext } from "../../context/ProjectContext";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  ContextSmell,
  ProjectType,
} from "@/types/types";
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
});

// Chart data types
type SmellDistribution = { smell_name: string; count: number };
type TopOffender = { filename: string; smell_count: number };
type TopFunction = { function_name: string; filename: string; smell_count: number };
type HeatmapDataItem = { filename: string; smell_name: string; count: number };
type StackedDataItem = { filename: string; smell_name: string; count: number };

// Report response type definition
export type GenerateReportResponse = {
  report_data?: {
    all_projects_combined?: { smell_name: string; filename: string }[];
  };
  project_health?: Record<string, number>;
  top_offenders?: Record<string, TopOffender[]>;
  top_functions?: Record<string, TopFunction[]>;
  stacked_data?: Record<string, StackedDataItem[]>;
  heatmap_data?: Record<string, HeatmapDataItem[]>;
  smells_distribution?: Record<string, SmellDistribution[]>;
};

export default function ReportGeneratorPage() {
  const { projects } = useProjectContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [reportResponse, setReportResponse] = useState<GenerateReportResponse | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);

  // Format smell data
  const formatSmells = useCallback((smells: ContextSmell[] | null | undefined): ContextSmell[] => {
    if (!smells || !Array.isArray(smells)) return [];

    return smells.filter(smell =>
      typeof smell !== "string" && smell?.smell_name
    ).map(smell => ({
      smell_name: smell.smell_name,
      file_name: smell.file_name || "N/A",
      description: smell.description || "No description provided",
      function_name: smell.function_name || "N/A",
      line: smell.line || -1,
      additional_info: smell.additional_info || "N/A",
    }));
  }, []);

  // Format project data
  const formatProjectsData = useCallback((projects: ProjectType[]) => {
    return projects.map((project) => ({
      name: project.name || "Unnamed Project",
      data: {
        files: project.files?.map((file: File) => ({
          name: file.name,
          size: file.size.toString(),
          type: file.type || "unknown",
          path: file.webkitRelativePath || "",
        })) || [],
        message: project.data?.message || "No message provided",
        result: project.data?.result || "No result available",
        smells: formatSmells(project.data?.smells),
      },
    }));
  }, [formatSmells]);

  // Generate report
  const generateReportData = useCallback(async () => {
    if (projects.length === 0) {
      toast.info("No projects available.");
      setReportResponse(null);
      return;
    }

    setLoading(true);

    try {
      const formattedProjects = formatProjectsData(projects);
      const result = await generateReport(formattedProjects) as GenerateReportResponse;
      setReportResponse(result);

      // Auto-select first project if none is selected
      if (!selectedProject && projects.length > 0) {
        setSelectedProject(projects[0]);
      }
    } catch (error) {
      console.error("Error generating reports:", error);
      toast.error("An error occurred while generating reports.");
      setReportResponse(null);
    } finally {
      setLoading(false);
    }
  }, [projects, formatProjectsData, selectedProject]);

  // Auto-generate report when projects change
  useEffect(() => {
    generateReportData();
  }, [generateReportData]);

  // Handle PDF download
  const handleDownloadPDF = useCallback(async () => {
    if (!reportResponse?.report_data || !selectedProject) {
      toast.error("No data available for PDF report.");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Code Smell Analysis Report", 14, 20);

      let currentY = 30;

      // Add project details
      const projectTitle = selectedProject.name || "Unnamed Project";
      doc.setFontSize(14);
      doc.text(`Project: ${projectTitle}`, 14, currentY);
      currentY += 10;

      const smells = selectedProject.data?.smells;
      if (smells && smells.length > 0) {
        const tableData = smells.map((smell: ContextSmell) => [
          smell.smell_name,
          smell.function_name,
          smell.file_name,
          smell.line,
          smell.description,
        ]);

        autoTable(doc, {
          head: [
            ["Smell Name", "Function Name", "File Name", "Line", "Description"],
          ],
          body: tableData.slice(0, 15),
          startY: currentY,
          showHead: "firstPage",
          pageBreak: "auto",
        });
        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 10;
      } else {
        doc.text("No smells detected for this project.", 14, currentY);
        currentY += 10;
      }

      doc.save(`smell_analysis_${projectTitle.replace(/\s+/g, '_')}.pdf`);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("An error occurred during PDF generation. Please try again.");
    }
  }, [selectedProject, reportResponse]);

  // Extract chart data helpers
  const extractChartData = useCallback(<T extends unknown>(
    data: Record<string, T[]> | undefined,
    projectName: string | undefined
  ): T[] => {
    if (!data || !projectName || !data[projectName]) return [];
    return data[projectName];
  }, []);

  // Get chart data for selected project
  const selectedProjectName = selectedProject?.name;
  const smellDistributionData = extractChartData(
    reportResponse?.smells_distribution,
    selectedProjectName
  );
  const topOffendersData = extractChartData(
    reportResponse?.top_offenders,
    selectedProjectName
  );
  const topFunctionsData = extractChartData(
    reportResponse?.top_functions,
    selectedProjectName
  );
  const heatmapData = extractChartData(
    reportResponse?.heatmap_data,
    selectedProjectName
  );
  const stackedData = extractChartData(
    reportResponse?.stacked_data,
    selectedProjectName
  );

  // Calculate smell density (smells per file)
  const calculateSmellDensity = useCallback(() => {
    if (!selectedProject?.data?.smells || !selectedProject?.data?.files) {
      return 0;
    }

    const smellCount = selectedProject.data.smells.length;
    const fileCount = Array.isArray(selectedProject.data.files)
      ? selectedProject.data.files.length
      : (selectedProject.files?.length || 1);  // Fallback to project.files if data.files is not available

    // Prevent division by zero
    if (fileCount === 0) return 0;

    // Calculate smells per file (with one decimal place)
    const density = smellCount / fileCount;
    return Math.round(density * 10) / 10;
  }, [selectedProject]);

  // Empty plot component for when data is not available
  const EmptyPlot = <Plot data={[{}]} layout={{}} style={{ width: "100%", height: "300px" }} />;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex flex-grow" style={{ paddingTop: "45px" }}>
        {/* Project sidebar */}
        <aside className="bg-white w-64 p-6 border-r border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Projects</h2>
          <ul className="space-y-2">
            {projects.map((project, index) => (
              <li
                key={index}
                className={`py-2 px-3 rounded-md cursor-pointer transition-colors duration-200 ${selectedProject?.name === project.name
                    ? "font-semibold text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:text-blue-500 hover:bg-gray-100"
                  }`}
                onClick={() => setSelectedProject(project)}
              >
                {project.name || `Project ${index + 1}`}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 bg-gray-50">
          <motion.h1
            className="text-3xl font-semibold text-gray-800 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Dashboard Report - {selectedProject?.name || "Select a Project"}
          </motion.h1>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <ClipLoader size={36} color="#4A5568" />
            </div>
          ) : !reportResponse?.report_data ? (
            <div className="text-gray-600">No report data available.</div>
          ) : !selectedProject ? (
            <div className="text-gray-600">Select a project to view the report.</div>
          ) : (
            <div>
              {/* PDF Download Button */}
              <div className="mb-6">
                <motion.button
                  onClick={handleDownloadPDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Download as PDF
                </motion.button>
              </div>

              {/* Dashboard Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Smell Density Card */}
                <motion.div
                  className="bg-white shadow-sm rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Smell Density
                  </h3>
                  <p className="text-4xl font-bold text-blue-600 mb-1">
                    {calculateSmellDensity()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Average smells per file
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Total: {selectedProject?.data?.smells?.length || 0} smells in {selectedProject?.data?.files?.length || selectedProject?.files?.length || 0} files
                  </p>
                </motion.div>

                {/* Bar Chart - Smells by Category */}
                <motion.div
                  className="bg-white shadow-sm rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Smells by Category
                  </h3>
                  {smellDistributionData.length > 0 ? (
                    <Plot
                      data={[
                        {
                          x: smellDistributionData.map((item: SmellDistribution) => item.smell_name),
                          y: smellDistributionData.map((item: SmellDistribution) => item.count),
                          type: "bar",
                          marker: { color: "#007aff" },
                        },
                      ]}
                      layout={{
                        title: { text: "Smell Distribution", font: { size: 16 } },
                        margin: { t: 30, l: 50, b: 50, r: 30 }
                      }}
                      style={{ width: "100%", height: "300px" }}
                    />
                  ) : EmptyPlot}
                </motion.div>

                {/* Top Offenders (Files with most Smells) */}
                <motion.div
                  className="bg-white shadow-sm rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Top Offenders (Files)
                  </h3>
                  {topOffendersData.length > 0 ? (
                    <Plot
                      data={[
                        {
                          x: topOffendersData.map((item: TopOffender) => item.filename),
                          y: topOffendersData.map((item: TopOffender) =>
                            typeof item.smell_count === 'number' ? item.smell_count : parseInt(String(item.smell_count), 10)),
                          type: "bar",
                          marker: { color: "#ff9500" },
                        },
                      ]}
                      layout={{
                        title: { text: "Files with Most Smells", font: { size: 16 } },
                        margin: { t: 30, l: 50, b: 50, r: 30 }
                      }}
                      style={{ width: "100%", height: "300px" }}
                    />
                  ) : EmptyPlot}
                </motion.div>

                {/* Top Functions (Functions with most Smells) */}
                <motion.div
                  className="bg-white shadow-sm rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Top Functions
                  </h3>
                  {topFunctionsData.length > 0 ? (
                    <Plot
                      data={[
                        {
                          x: topFunctionsData.map((item: TopFunction) => item.function_name),
                          y: topFunctionsData.map((item: TopFunction) =>
                            typeof item.smell_count === 'number' ? item.smell_count : parseInt(String(item.smell_count), 10)),
                          type: "bar",
                          marker: { color: "#4cd964" },
                        },
                      ]}
                      layout={{
                        title: { text: "Functions with Most Smells", font: { size: 16 } },
                        margin: { t: 30, l: 50, b: 50, r: 30 }
                      }}
                      style={{ width: "100%", height: "300px" }}
                    />
                  ) : EmptyPlot}
                </motion.div>

                {/* Heatmap */}
                <motion.div
                  className="bg-white shadow-sm rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Smell Heatmap
                  </h3>
                  {heatmapData.length > 0 ? (
                    <Plot
                      data={[
                        {
                          z: heatmapData.map((item: HeatmapDataItem) =>
                            typeof item.count === 'number' ? item.count : parseInt(String(item.count), 10)),
                          x: [...new Set(heatmapData.map((item: HeatmapDataItem) => item.filename))],
                          y: [...new Set(heatmapData.map((item: HeatmapDataItem) => item.smell_name))],
                          type: "heatmap",
                          colorscale: "Viridis",
                        },
                      ]}
                      layout={{
                        title: { text: "Smell Heatmap by File", font: { size: 16 } },
                        margin: { t: 30, l: 50, b: 50, r: 30 }
                      }}
                      style={{ width: "100%", height: "400px" }}
                    />
                  ) : EmptyPlot}
                </motion.div>

                {/* Stacked Bar Chart */}
                <motion.div
                  className="bg-white shadow-sm rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Smell Distribution by File
                  </h3>
                  {stackedData.length > 0 ? (
                    <Plot
                      data={(() => {
                        // Process and group data by filename and smell_name
                        const grouped = stackedData.reduce((acc: Record<string, Record<string, number>>, item) => {
                          if (!acc[item.filename]) acc[item.filename] = {};

                          acc[item.filename][item.smell_name] = (acc[item.filename][item.smell_name] || 0) +
                            (typeof item.count === 'number' ? item.count : parseInt(String(item.count), 10));

                          return acc;
                        }, {});

                        // Convert to Plotly format
                        return Object.entries(grouped).map(([filename, smells]) => ({
                          x: Object.keys(smells),
                          y: Object.values(smells),
                          type: "bar",
                          name: filename,
                          stackgroup: "files",
                        }));
                      })()}
                      layout={{
                        title: { text: "Smell Distribution by File", font: { size: 16 } },
                        barmode: "stack",
                        yaxis: { title: { text: "Smell Count", font: { size: 12 } } },
                        xaxis: { title: { text: "Smell Type", font: { size: 12 } } },
                        margin: { t: 30, l: 50, b: 50, r: 30 },
                      }}
                      style={{ width: "100%", height: "400px" }}
                    />
                  ) : EmptyPlot}
                </motion.div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
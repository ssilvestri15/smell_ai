// ReportGeneratorPage.tsx
"use client";
import { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import Header from "../../components/HeaderComponent";
import { useProjectContext } from "../../context/ProjectContext";
import { motion } from "framer-motion";
import {
  ProjectType,
  SmellDistribution,
  TopOffender,
  TopFunction,
  HeatmapDataItem,
  StackedDataItem
} from "@/types/types";
import ProjectSidebar from "../../components/ProjectSidebar";
import ChartContainer from "../../components/ChartContainer";
import SmellDensityCard from "../../components/SmellDensityCard";
import dynamic from 'next/dynamic';
import { useReportData } from "../../hooks/useReportData";
import PDFDownloadButton from "../../components/PDFDownloadButton";

// Lazy load Plot component
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-48"><ClipLoader size={36} color="#4A5568" /></div>
});

export default function ReportGeneratorPage() {
  const { projects, updateProject, addProject } = useProjectContext();
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);

  const {
    loading,
    reportResponse,
    generateReportData,
    smellDistributionData,
    topOffendersData,
    topFunctionsData,
    heatmapData,
    stackedData
  } = useReportData(projects, selectedProject);

  // Auto-select first project when projects load
  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0]);
    }
  }, [projects, selectedProject]);

  // Auto-generate report when projects or selected project changes
  useEffect(() => {
    generateReportData();
  }, [generateReportData]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex flex-grow" style={{ paddingTop: "45px" }}>
        {/* Project sidebar */}
        <ProjectSidebar
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
          updateProject={updateProject}
        />

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
          ) : selectedProject.isLoading ? (<div className="flex justify-center items-center h-48">
            <ClipLoader size={36} color="#4A5568" />
          </div>) : (
            <div>
              {/* PDF Download Button */}
              <div className="mb-6">
                <PDFDownloadButton
                  reportResponse={reportResponse}
                  selectedProject={selectedProject}
                />
              </div>

              {/* Dashboard Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Smell Density Card */}
                <SmellDensityCard selectedProject={selectedProject} />

                {/* Bar Chart - Smells by Category */}
                <ChartContainer
                  title="Smells by Category"
                  delay={0.2}
                  data={smellDistributionData}
                  render={(data: SmellDistribution[]) => (
                    <Plot
                      data={[{
                        x: data.map(item => item.smell_name),
                        y: data.map(item => item.count),
                        type: "bar",
                        marker: { color: "#007aff" }
                      }]}
                      layout={{
                        title: { text: "Smell Distribution", font: { size: 16 } },
                        margin: { t: 30, l: 50, b: 50, r: 30 }
                      }}
                      style={{ width: "100%", height: "300px" }}
                    />
                  )}
                />

                {/* Top Offenders (Files with most Smells) */}
                <ChartContainer
                  title="Top Offenders (Files)"
                  delay={0.3}
                  data={topOffendersData}
                  render={(data: TopOffender[]) => (
                    <Plot
                      data={[{
                        x: data.map(item => item.filename),
                        y: data.map(item => typeof item.smell_count === 'number' ?
                          item.smell_count : parseInt(String(item.smell_count), 10)),
                        type: "bar",
                        marker: { color: "#ff9500" }
                      }]}
                      layout={{
                        title: { text: "Files with Most Smells", font: { size: 16 } },
                        margin: { t: 30, l: 50, b: 50, r: 30 }
                      }}
                      style={{ width: "100%", height: "300px" }}
                    />
                  )}
                />

                {/* Top Functions (Functions with most Smells) */}
                <ChartContainer
                  title="Top Functions"
                  delay={0.4}
                  data={topFunctionsData}
                  render={(data: TopFunction[]) => (
                    <Plot
                      data={[{
                        x: data.map(item => item.function_name),
                        y: data.map(item => typeof item.smell_count === 'number' ?
                          item.smell_count : parseInt(String(item.smell_count), 10)),
                        type: "bar",
                        marker: { color: "#4cd964" }
                      }]}
                      layout={{
                        title: { text: "Functions with Most Smells", font: { size: 16 } },
                        margin: { t: 30, l: 50, b: 50, r: 30 }
                      }}
                      style={{ width: "100%", height: "300px" }}
                    />
                  )}
                />

                {/* Heatmap */}
                <ChartContainer
                  title="Smell Heatmap"
                  delay={0.5}
                  data={heatmapData}
                  render={(data: HeatmapDataItem[]) => (
                    <Plot
                      data={[{
                        z: data.map(item => typeof item.count === 'number' ?
                          item.count : parseInt(String(item.count), 10)),
                        x: [...new Set(data.map(item => item.filename))],
                        y: [...new Set(data.map(item => item.smell_name))],
                        type: "heatmap",
                        colorscale: "Viridis"
                      }]}
                      layout={{
                        title: { text: "Smell Heatmap by File", font: { size: 16 } },
                        margin: { t: 30, l: 50, b: 50, r: 30 }
                      }}
                      style={{ width: "100%", height: "400px" }}
                    />
                  )}
                />

                {/* Stacked Bar Chart */}
                <ChartContainer
                  title="Smell Distribution by File"
                  delay={0.6}
                  data={stackedData}
                  render={(data: StackedDataItem[]) => {
                    // Process and group data by filename and smell_name
                    const grouped = data.reduce((acc: Record<string, Record<string, number>>, item) => {
                      if (!acc[item.filename]) acc[item.filename] = {};

                      acc[item.filename][item.smell_name] = (acc[item.filename][item.smell_name] || 0) +
                        (typeof item.count === 'number' ? item.count : parseInt(String(item.count), 10));

                      return acc;
                    }, {});

                    // Convert to Plotly format
                    const plotData: Plotly.Data[] = Object.entries(grouped).map(([filename, smells]) => ({
                      x: Object.keys(smells),
                      y: Object.values(smells),
                      type: "bar",
                      name: filename,
                      stackgroup: "files"
                    }));

                    return (
                      <Plot
                        data={plotData}
                        layout={{
                          title: { text: "Smell Distribution by File", font: { size: 16 } },
                          barmode: "stack",
                          yaxis: { title: { text: "Smell Count", font: { size: 12 } } },
                          xaxis: { title: { text: "Smell Type", font: { size: 12 } } },
                          margin: { t: 30, l: 50, b: 50, r: 30 }
                        }}
                        style={{ width: "100%", height: "400px" }}
                      />
                    );
                  }}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
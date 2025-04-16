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

// Tipi per i dati dei grafici
type SmellDistribution = { smell_name: string; count: number };
type TopOffender = { filename: string; smell_count: number };
type TopFunction = { function_name: string; filename: string; smell_count: number };
type HeatmapDataItem = { filename: string; smell_name: string; count: number };
type StackedDataItem = { filename: string; smell_name: string; count: number };

// Definizione del tipo GenerateReportResponse basato sulla struttura fornita
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

  // Funzione per formattare gli smell
  const formatSmells = useCallback(
    (smells: ContextSmell[] | null | undefined): ContextSmell[] => {
      return (
        smells?.reduce<ContextSmell[]>((acc, smell) => {
          if (
            typeof smell === "string" &&
            smell === "Static analysis returned no data"
          ) {
            return acc;
          }
          if (smell && smell.smell_name) {
            acc.push({
              smell_name: smell.smell_name,
              file_name: smell.file_name || "N/A",
              description: smell.description || "No description provided",
              function_name: smell.function_name || "N/A",
              line: smell.line || -1,
              additional_info: smell.additional_info || "N/A",
            });
          }
          return acc;
        }, []) || []
      );
    },
    []
  );

  // Funzione per formattare i dati dei progetti
  const formatProjectsData = useCallback(
    (projects: ProjectType[]) => {
      return projects.map((project) => ({
        name: project.name || "Unnamed Project",
        data: {
          files:
            project.files?.map((file: File) => ({
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
    },
    [formatSmells]
  );

  // Funzione per generare il report
  const generateReportData = useCallback(async () => {
    if (projects.length === 0) {
      toast.info("Nessun progetto disponibile.");
      setReportResponse(null);
      return;
    }

    setLoading(true);

    try {
      const formattedProjects = formatProjectsData(projects);
      const result = await generateReport(formattedProjects) as GenerateReportResponse;
      setReportResponse(result);
    } catch (error) {
      console.error("Errore durante la generazione dei report:", error);
      toast.error(
        "Si è verificato un errore durante la generazione dei report."
      );
      setReportResponse(null);
    } finally {
      setLoading(false);
    }
  }, [projects, formatProjectsData]);

  // Effetto per generare il report automaticamente
  useEffect(() => {
    generateReportData();
  }, [projects, generateReportData]);

  const handleDownloadPDF = useCallback(async () => {
    if (!reportResponse?.report_data) {
      toast.error("Nessun dato disponibile per il report PDF.");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Rapporto di Analisi degli Smell", 14, 20);

      let currentY = 30;

      for (const project of projects) {
        const projectTitle = project.name || "Progetto Senza Nome";
        doc.setFontSize(14);
        doc.text(`Progetto: ${projectTitle}`, 14, currentY);
        currentY += 10;

        const smells = project.data?.smells;
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
              ["Nome Smell", "Nome Funzione", "Nome File", "Linea", "Descrizione"],
            ],
            body: tableData.slice(0, 15),
            startY: currentY,
            showHead: "firstPage",
            pageBreak: "auto",
          });
          // @ts-ignore
          currentY = doc.lastAutoTable.finalY + 10;
        } else {
          doc.text("Nessun smell rilevato per questo progetto.", 14, currentY);
          currentY += 10;
        }
      }

      doc.save("smell_analysis_report.pdf");
    } catch (error) {
      console.error("Errore durante la generazione del PDF:", error);
      toast.error(
        "Si è verificato un errore durante la generazione del PDF. Riprova."
      );
    }
  }, [projects, reportResponse]);

  // Funzioni per estrarre i dati per i grafici (ora specifiche per progetto)
  const extractSmellDistribution = useCallback(
    (data: GenerateReportResponse | null, projectName: string | undefined): SmellDistribution[] => {
      if (!data?.smells_distribution || !projectName || !data.smells_distribution[projectName]) return [];
      const distribution: { [key: string]: number } = {};
      data.smells_distribution[projectName].forEach((item: { smell_name: string }) => {
        distribution[item.smell_name] = (distribution[item.smell_name] || 0) + 1;
      });
      return Object.entries(distribution).map(([smell_name, count]) => ({
        smell_name,
        count,
      }));
    },
    []
  );

  const extractTopOffenders = useCallback(
    (data: GenerateReportResponse | null, projectName: string | undefined): TopOffender[] => {
      if (!data?.top_offenders || !projectName || !data.top_offenders[projectName]) return [];
      return data.top_offenders[projectName];
    },
    []
  );

  const extractTopFunctions = useCallback(
    (data: GenerateReportResponse | null, projectName: string | undefined): TopFunction[] => {
      if (!data?.top_functions || !projectName || !data.top_functions[projectName]) return [];
      return data.top_functions[projectName];
    },
    []
  );

  const extractHeatmapData = useCallback(
    (data: GenerateReportResponse | null, projectName: string | undefined): HeatmapDataItem[] => {
      if (!data?.heatmap_data || !projectName || !data.heatmap_data[projectName]) return [];
      return data.heatmap_data[projectName];
    },
    []
  );

  const extractStackedData = useCallback(
    (data: GenerateReportResponse | null, projectName: string | undefined): StackedDataItem[] => {
      if (!data?.stacked_data || !projectName || !data.stacked_data[projectName]) return [];
      return data.stacked_data[projectName];
    },
    []
  );

  // Dati per i grafici (ora dipendenti dal progetto selezionato)
  const selectedProjectName = selectedProject?.name;
  const smellDistributionData = extractSmellDistribution(reportResponse, selectedProjectName);
  const topOffendersData = extractTopOffenders(reportResponse, selectedProjectName);
  const topFunctionsData = extractTopFunctions(reportResponse, selectedProjectName);
  const heatmapData = extractHeatmapData(reportResponse, selectedProjectName);
  const stackedData = extractStackedData(reportResponse, selectedProjectName);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex flex-grow" style={{ paddingTop: "45px" }}>
        <aside className="bg-white w-64 p-6 border-r border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Progetti</h2>
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
                {project.name || `Progetto ${index + 1}`}
              </li>
            ))}
          </ul>
        </aside>
        <main className="flex-1 p-8 bg-gray-50">
          <motion.h1
            className="text-3xl font-semibold text-gray-800 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Dashboard Report - {selectedProject?.name || "Seleziona un Progetto"}
          </motion.h1>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <ClipLoader size={36} color="#4A5568" />
            </div>
          ) : !reportResponse?.report_data ? (
            <div className="text-gray-600">Nessun dato del report disponibile.</div>
          ) : !selectedProject ? (
            <div className="text-gray-600">Seleziona un progetto per visualizzare il report.</div>
          ) : (
            <div>
              <div className="mb-6">
                <motion.button
                  onClick={handleDownloadPDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Scarica come PDF
                </motion.button>
              </div>

              {/* Cards con i grafici */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Smell Density */}
                <motion.div
                  className="bg-white shadow-sm rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Densità degli Smell
                  </h3>
                  <p className="text-4xl font-bold text-blue-600 mb-1">
                    {reportResponse?.report_data?.all_projects_combined?.filter(
                      (item: { filename: string }) => {
                        const selectedProjectData = projects.find((p) => p.name === selectedProjectName)?.data;
                        if (selectedProjectData?.files) {
                          return selectedProjectData.files.some(
                            (f: { name: string } | string) => typeof f !== 'string' && (f as { name: string }).name === item.filename
                          );
                        }
                        return false;
                      }
                    )?.length || 0}
                  </p>
                  <p className="text-sm text-gray-500">
                    Totale smell rilevati nel progetto
                  </p>
                  {/* Qui andrebbe il grafico della densità (es. un numero grande) */}
                </motion.div>

                {/* Bar Chart - Numero di Smell per Categoria */}
                <motion.div
                  className="bg-white shadow-sm rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Smell per Categoria
                  </h3>
                  {smellDistributionData.length > 0 ? (
                    <Plot
                      data={[
                        {
                          x: smellDistributionData.map((item) => item.smell_name),
                          y: smellDistributionData.map((item) => item.count),
                          type: "bar",
                          marker: { color: "#007aff" },
                        },
                      ]}
                      layout={{ title: { text: "Distribuzione degli Smell", font: { size: 16 } }, margin: { t: 30, l: 50, b: 50, r: 30 } }}
                      style={{ width: "100%", height: "300px" }}
                    />
                  ) : (
                    <Plot data={[{}]} layout={{}} style={{ width: "100%", height: "300px" }} />
                  )}
                </motion.div>

                {/* Top Offenders (Files con più Smell) */}
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
                          x: topOffendersData.map((item) => item.filename),
                          y: topOffendersData.map((item) => parseInt(item.smell_count + '', 10)),
                          type: "bar",
                          marker: { color: "#ff9500" },
                        },
                      ]}
                      layout={{ title: { text: "Files con più Smell", font: { size: 16 } }, margin: { t: 30, l: 50, b: 50, r: 30 } }}
                      style={{ width: "100%", height: "300px" }}
                    />
                  ) : (
                    <Plot data={[{}]} layout={{}} style={{ width: "100%", height: "300px" }} />
                  )}
                </motion.div>

                {/* Top Functions (Funzioni con più Smell) */}
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
                          x: topFunctionsData.map((item) => item.function_name),
                          y: topFunctionsData.map((item) => parseInt(item.smell_count + '', 10)),
                          type: "bar",
                          marker: { color: "#4cd964" },
                        },
                      ]}
                      layout={{ title: { text: "Funzioni con più Smell", font: { size: 16 } }, margin: { t: 30, l: 50, b: 50, r: 30 } }}
                      style={{ width: "100%", height: "300px" }}
                    />
                  ) : (
                    <Plot data={[{}]} layout={{}} style={{ width: "100%", height: "300px" }} />
                  )}
                </motion.div>

                {/* Heatmap */}
                <motion.div
                  className="bg-white shadow-sm rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Heatmap degli Smell
                  </h3>
                  {heatmapData.length > 0 ? (
                    <Plot
                      data={[
                        {
                          z: heatmapData.map((item) => parseInt(item.count + '', 10)),
                          x: [...new Set(heatmapData.map((item) => item.filename))],
                          y: [...new Set(heatmapData.map((item) => item.smell_name))],
                          type: "heatmap",
                          colorscale: "Viridis",
                        },
                      ]}
                      layout={{ title: { text: "Heatmap degli Smell per File", font: { size: 16 } }, margin: { t: 30, l: 50, b: 50, r: 30 } }}
                      style={{ width: "100%", height: "400px" }}
                    />
                  ) : (
                    <Plot data={[{}]} layout={{}} style={{ width: "100%", height: "400px" }} />
                  )}
                </motion.div>

                {/* Stacked Bar Chart */}
                <motion.div
                  className="bg-white shadow-sm rounded-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Distribuzione Smell per File
                  </h3>
                  {stackedData.length > 0 ? (
                    <Plot
                      data={Object.entries(
                        stackedData.reduce((acc: Record<string, Record<string, number>>, item) => {
                          acc[item.filename] = acc[item.filename] || {};
                          acc[item.filename][item.smell_name] =
                            (acc[item.filename][item.smell_name] || 0) +
                            parseInt(item.count + '', 10);
                          return acc;
                        }, {})
                      ).map(([filename, smells]) => ({
                        x: Object.keys(smells),
                        y: Object.values(smells).map(value => parseInt(value + '', 10)),
                        type: "bar",
                        name: filename,
                        stackgroup: "files",
                      }))}
                      layout={{
                        title: { text: "Distribuzione degli Smell per File", font: { size: 16 } },
                        barmode: "stack",
                        yaxis: { title: { text: "Numero di Smell", font: { size: 12 } } },
                        xaxis: { title: { text: "Tipo di Smell", font: { size: 12 } } },
                        margin: { t: 30, l: 50, b: 50, r: 30 },
                      }}
                      style={{ width: "100%", height: "400px" }}
                    />
                  ) : (
                    <Plot data={[{}]} layout={{}} style={{ width: "100%", height: "400px" }} />
                  )}
                </motion.div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
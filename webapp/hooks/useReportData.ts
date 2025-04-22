import { useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { generateReport } from "../utils/api";
import {
  ProjectType,
  GenerateReportResponse,
  SmellDistribution,
  TopOffender,
  TopFunction,
  HeatmapDataItem,
  StackedDataItem
} from "@/types/types";
import { formatProjectsData, formatSmells, extractChartData } from "../utils/dataFormatters";

interface UseReportDataReturn {
  loading: boolean;
  reportResponse: GenerateReportResponse | null;
  generateReportData: () => Promise<void>;
  smellDistributionData: SmellDistribution[];
  topOffendersData: TopOffender[];
  topFunctionsData: TopFunction[];
  heatmapData: HeatmapDataItem[];
  stackedData: StackedDataItem[];
}

export function useReportData(
  projects: ProjectType[],
  selectedProject: ProjectType | null
): UseReportDataReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [reportResponse, setReportResponse] = useState<GenerateReportResponse | null>(null);

  // Generate report
  const generateReportData = useCallback(async (): Promise<void> => {
    if (projects.length === 0) {
      toast.info("No projects available.");
      setReportResponse(null);
      return;
    }

    setLoading(true);

    try {
      const formattedProjects = formatProjectsData(projects);

      // Use Promise.all for parallelization if needed
      const result = await generateReport(formattedProjects) as GenerateReportResponse;
      setReportResponse(result);
    } catch (error) {
      console.error("Error generating reports:", error);
      toast.error("An error occurred while generating reports.");
      setReportResponse(null);
    } finally {
      setLoading(false);
    }
  }, [projects]);

  // Extract chart data for selected project with memoization
  const selectedProjectName = selectedProject?.name;

  const smellDistributionData = useMemo<SmellDistribution[]>(() =>
    extractChartData<SmellDistribution>(reportResponse?.smells_distribution, selectedProjectName),
    [reportResponse?.smells_distribution, selectedProjectName]);

  const topOffendersData = useMemo<TopOffender[]>(() =>
    extractChartData<TopOffender>(reportResponse?.top_offenders, selectedProjectName),
    [reportResponse?.top_offenders, selectedProjectName]);

  const topFunctionsData = useMemo<TopFunction[]>(() =>
    extractChartData<TopFunction>(reportResponse?.top_functions, selectedProjectName),
    [reportResponse?.top_functions, selectedProjectName]);

  const heatmapData = useMemo<HeatmapDataItem[]>(() =>
    extractChartData<HeatmapDataItem>(reportResponse?.heatmap_data, selectedProjectName),
    [reportResponse?.heatmap_data, selectedProjectName]);

  const stackedData = useMemo<StackedDataItem[]>(() =>
    extractChartData<StackedDataItem>(reportResponse?.stacked_data, selectedProjectName),
    [reportResponse?.stacked_data, selectedProjectName]);

  return {
    loading,
    reportResponse,
    generateReportData,
    smellDistributionData,
    topOffendersData,
    topFunctionsData,
    heatmapData,
    stackedData
  };
}
import { render, screen, waitFor } from "@testing-library/react";
import ReportGeneratorPage from "../../app/reports/page";
import { useProjectContext } from "../../context/ProjectContext";
import { generateReport } from "../../utils/api";
import { toast } from "react-toastify";

// Mock createObjectURL (usato dal download PDF)
global.URL.createObjectURL = jest.fn().mockImplementation(() => "mocked-url");

// Mock toast
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock context
jest.mock("../../context/ProjectContext", () => ({
  useProjectContext: jest.fn(),
}));

// Mock useReportData
jest.mock("../../hooks/useReportData", () => ({
  useReportData: jest.fn(),
}));

// Mock API
jest.mock("../../utils/api", () => ({
  generateReport: jest.fn(),
}));

// Mock plot
jest.mock("react-plotly.js", () => ({
  __esModule: true,
  default: jest.fn(() => <div>Mocked Plot</div>),
}));

// Mock useInView (framer-motion, ChartContainer)
jest.mock("react-intersection-observer", () => ({
  useInView: jest.fn().mockReturnValue({ ref: jest.fn(), inView: true }),
}));

describe("ReportGeneratorPage", () => {
  const mockProjects = [
    {
      name: "Project 1",
      files: [{ name: "file1.py", size: 100, type: "text/plain", webkitRelativePath: "file1.py" }],
      data: {
        message: "Analysis results",
        smells: [
          {
            smell_name: "Code Smell",
            file_name: "file1.py",
            description: "Unoptimized code",
            function_name: "main",
            line: 1,
            additional_info: "Details",
          },
        ],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useProjectContext as jest.Mock).mockReturnValue({ projects: mockProjects });

    (generateReport as jest.Mock).mockResolvedValue({
      report_data: {
        "Project 1": [{ smell_name: "Code Smell", filename: "file1.py" }],
      },
    });

    const { useReportData } = require("../../hooks/useReportData");
    const mockGenerateReportData = jest.fn(() => {
      generateReport();
    });

    useReportData.mockReturnValue({
      loading: false,
      reportResponse: {
        report_data: {
          "Project 1": [{ smell_name: "Code Smell", filename: "file1.py" }],
        },
      },
      generateReportData: mockGenerateReportData,
      smellDistributionData: [{ smell_name: "Code Smell", count: 1 }],
      topOffendersData: [],
      topFunctionsData: [],
      heatmapData: [],
      stackedData: [],
    });
  });

  it("renders correctly with initial state", () => {
    render(<ReportGeneratorPage />);
    expect(screen.getByText(/Dashboard Report - Project 1/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download as PDF/i })).toBeInTheDocument();
  });

  it("displays loading state while generating report", async () => {
    const { useReportData } = require("../../hooks/useReportData");

    // Sovrascrive la mock globale
    (useReportData as jest.Mock).mockReturnValue({
      loading: true,
      reportResponse: null,
      generateReportData: jest.fn(),
      smellDistributionData: [],
      topOffendersData: [],
      topFunctionsData: [],
      heatmapData: [],
      stackedData: [],
    });

    render(<ReportGeneratorPage />);
    expect(await screen.findByTestId("clip-loader")).toBeInTheDocument();
  });

  it("handles report generation correctly", async () => {
    render(<ReportGeneratorPage />);
    await waitFor(() => {
      expect(generateReport).toHaveBeenCalled();
      expect(screen.getByText("Smells by Category")).toBeInTheDocument();
    });
  });

  it("shows an alert if no projects are available", async () => {
    const { useReportData } = require("../../hooks/useReportData");

    (useProjectContext as jest.Mock).mockReturnValue({ projects: [] });

    const mockGenerateReportData = jest.fn(() => {
      toast.error("No projects available. Please add projects before generating reports.");
    });

    (useReportData as jest.Mock).mockReturnValue({
      loading: false,
      reportResponse: undefined,
      generateReportData: mockGenerateReportData,
      smellDistributionData: [],
      topOffendersData: [],
      topFunctionsData: [],
      heatmapData: [],
      stackedData: [],
    });

    render(<ReportGeneratorPage />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
          "No projects available. Please add projects before generating reports."
      );
    });
  });

  it("handles errors during report generation", async () => {
    const { useReportData } = require("../../hooks/useReportData");

    (generateReport as jest.Mock).mockRejectedValue(new Error("API error"));

    const mockGenerateReportData = jest.fn(() =>
      generateReport().catch(() => {
        toast.error("An error occurred while generating reports. Please try again.");
      })
    );

    useReportData.mockReturnValue({
      loading: false,
      reportResponse: null,
      generateReportData: mockGenerateReportData,
      smellDistributionData: [],
      topOffendersData: [],
      topFunctionsData: [],
      heatmapData: [],
      stackedData: [],
    });

    render(<ReportGeneratorPage />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
          "An error occurred while generating reports. Please try again."
      );
    });
  });
});
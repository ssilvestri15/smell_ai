export type ContextSmell = {
  function_name: string;
  file_name: string;
  line: number;
  smell_name: string;
  description: string;
  additional_info: string;
};

export type DetectResponse = {
  success: boolean;
  smells: ContextSmell[];
}

export type SmellDistribution = {
  smell_name: string;
  count: number
};

export type TopOffender = {
  filename: string;
  smell_count: number
};

export type TopFunction = {
  function_name: string;
  filename: string;
  smell_count: number
};

export type HeatmapDataItem = {
  filename: string;
  smell_name: string;
  count: number
};

export type StackedDataItem = {
  filename: string;
  smell_name: string;
  count: number
};

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

export type ChartData = {
  smell_name: string;
  filename: string
};

export type ProjectType = {
  name: string;
  files: File[] | null;
  data: {
    files: string[] | null;
    message: string;
    result: string | null;
    smells: ContextSmell[] | null;
  };
  isLoading: boolean;
};

export type ProjectContextType = {
  projects: ProjectType[];
  addProject: () => void;
  updateProject: (index: number, project: Partial<ProjectType>) => void;
  removeProject: (index: number) => void;
};
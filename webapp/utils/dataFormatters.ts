import {
    ContextSmell,
    ProjectType,
    SmellDistribution,
    TopOffender,
    TopFunction,
    HeatmapDataItem,
    StackedDataItem
} from "@/types/types";

// Format smell data
export const formatSmells = (smells: ContextSmell[] | null | undefined): ContextSmell[] => {
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
};

// Format project data for API
export const formatProjectsData = (projects: ProjectType[]): any[] => {
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
};

// Extract specific chart data for selected project
export function extractChartData<T>(
    data: Record<string, T[]> | undefined,
    projectName: string | undefined
): T[] {
    if (!data || !projectName || !data[projectName]) return [];
    return data[projectName];
}

// Calculate smell density (smells per file)
export const calculateSmellDensity = (project: ProjectType | null): number => {
    if (!project?.data?.smells || (!project?.data?.files && !project?.files)) {
        return 0;
    }

    const smellCount = project.data.smells.length;
    const fileCount = Array.isArray(project.data.files)
        ? project.data.files.length
        : (project.files?.length || 1);  // Fallback to project.files if data.files is not available

    // Prevent division by zero
    if (fileCount === 0) return 0;

    // Calculate smells per file (with one decimal place)
    const density = smellCount / fileCount;
    return Math.round(density * 10) / 10;
};
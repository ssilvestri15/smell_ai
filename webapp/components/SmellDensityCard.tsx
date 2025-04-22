import { motion } from "framer-motion";
import { useMemo } from "react";
import { calculateSmellDensity } from "../utils/dataFormatters";
import { ProjectType } from "@/types/types";

interface SmellDensityCardProps {
    selectedProject: ProjectType;
}

export default function SmellDensityCard({
    selectedProject
}: SmellDensityCardProps) {
    const density = useMemo(() => calculateSmellDensity(selectedProject), [selectedProject]);
    const totalSmells = selectedProject?.data?.smells?.length || 0;
    const totalFiles = selectedProject?.data?.files?.length ||
        selectedProject?.files?.length || 0;

    return (
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
                {density}
            </p>
            <p className="text-sm text-gray-500">
                Average smells per file
            </p>
            <p className="text-xs text-gray-400 mt-2">
                Total: {totalSmells} smells in {totalFiles} files
            </p>
        </motion.div>
    );
}

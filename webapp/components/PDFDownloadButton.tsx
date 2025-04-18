import { useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { GenerateReportResponse, ProjectType, ContextSmell } from "@/types/types";

interface PDFDownloadButtonProps {
    reportResponse: GenerateReportResponse;
    selectedProject: ProjectType;
}

export default function PDFDownloadButton({
    reportResponse,
    selectedProject
}: PDFDownloadButtonProps) {
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
                // @ts-ignore - Type issue with jspdf-autotable
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

    return (
        <motion.button
            onClick={handleDownloadPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            Download as PDF
        </motion.button>
    );
}
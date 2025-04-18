import { motion } from "framer-motion";
import { useMemo, ReactNode } from "react";
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
});

interface ChartContainerProps<T> {
    title: string;
    delay: number;
    data: T[];
    render: (data: T[]) => ReactNode;
}

export default function ChartContainer<T>({
    title,
    delay,
    data,
    render
}: ChartContainerProps<T>) {
    // Empty plot component for when data is not available
    const EmptyPlot = useMemo(() => (
        <Plot data={[{}]} layout={{}} style={{ width: "100%", height: "300px" }} />
    ), []);

    return (
        <motion.div
            className="bg-white shadow-sm rounded-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
                {title}
            </h3>
            {data.length > 0 ? render(data) : EmptyPlot}
        </motion.div>
    );
}

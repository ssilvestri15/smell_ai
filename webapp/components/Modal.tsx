import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ModalProps {
    children: ReactNode;
    onClose: () => void;
}

export default function Modal({ children, onClose }: ModalProps) {
    const handleModalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" // Increased opacity slightly for a stronger dimming effect without blur
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.2, ease: "easeOut" }}
        >
            <motion.div
                className="bg-white rounded-[14px] shadow-xl max-w-md w-full mx-4 border border-gray-200" // Removed backdrop-blur, adjusted border radius and shadow for a cleaner look
                initial={{ scale: 0.98, opacity: 0, y: 10 }} // Slightly adjusted initial animation
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.98, opacity: 0, y: 10 }} // Slightly adjusted exit animation
                onClick={handleModalClick}
                transition={{
                    type: "spring",
                    stiffness: 300, // Slightly adjusted stiffness
                    damping: 25, // Slightly adjusted damping
                    mass: 0.5
                }}
            >
                <div className="flex justify-end p-[10px]"> {/* Adjusted padding */}
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100/80 active:bg-gray-200/50 rounded-full transition-all duration-200 ease-out"
                        aria-label="Close"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-[18px] w-[18px] text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="px-6 pb-6 pt-1 font-sans text-[15px] leading-[1.5] text-gray-800"> {/* Adjusted bottom padding */}
                    {children}
                </div>
            </motion.div>
        </motion.div>
    );
}
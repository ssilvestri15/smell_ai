import { render, screen } from "@testing-library/react";
import SmellDensityCard from "../../components/SmellDensityCard"; // Adjust the import path as needed
import { calculateSmellDensity } from "../../utils/dataFormatters"; // Adjust the import path as needed
import { ProjectType } from "@/types/types"; // Adjust the import path as needed

// Mock the calculateSmellDensity function
jest.mock("../../utils/dataFormatters", () => ({
    calculateSmellDensity: jest.fn(),
}));

describe("SmellDensityCard", () => {
    it("renders the smell density information correctly", () => {
        const mockProject: ProjectType = {
            name: 'Test Project',
            files: null,
            data: {
                files: ['file1.js', 'file2.js', 'file3.js'],
                message: 'Success',
                result: 'Some result',
                smells: [{}, {}], // Two smells
            },
            isLoading: false,
        };

        // Mock the return value of calculateSmellDensity
        (calculateSmellDensity as jest.Mock).mockReturnValue(0.7);

        render(<SmellDensityCard selectedProject={mockProject} />);

        // Check that the title is rendered
        expect(screen.getByText("Smell Density")).toBeInTheDocument();

        // Check that the calculated density is rendered
        expect(screen.getByText("0.7")).toBeInTheDocument();

        // Check that the description is rendered
        expect(screen.getByText("Average smells per file")).toBeInTheDocument();

        // Check that the total smells and files are rendered
        expect(screen.getByText("Total: 2 smells in 3 files")).toBeInTheDocument();

        // Optionally, you can also check if calculateSmellDensity was called with the correct project
        expect(calculateSmellDensity).toHaveBeenCalledWith(mockProject);
    });
});
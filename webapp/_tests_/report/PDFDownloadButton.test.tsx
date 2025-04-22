import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PDFDownloadButton from '../../components/PDFDownloadButton'; // Adjust the import path as needed
import { GenerateReportResponse, ProjectType, ContextSmell } from '@/types/types'; // Adjust the import path as needed
import { toast } from 'react-toastify';

// Mock react-toastify
jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock jspdf and jspdf-autotable using dynamic imports
// We need to create mock instances and functions to check calls on them.
const mockDocSave = jest.fn();
const mockDocSetFontSize = jest.fn();
const mockDocText = jest.fn();
// Mock lastAutoTable property if needed by autoTable or subsequent logic
const mockDocLastAutoTable = { finalY: 100 }; // Example value
const mockJsPDF = jest.fn(() => ({
    setFontSize: mockDocSetFontSize,
    text: mockDocText,
    save: mockDocSave,
    lastAutoTable: mockDocLastAutoTable,
    // Add other methods used by autoTable if necessary for the mock
}));

const mockAutoTable = jest.fn();

// Mock the dynamic imports
// This structure matches what `await import("jspdf")` and `await import("jspdf-autotable")` return
jest.mock('jspdf', () => ({
    __esModule: true, // Needed for default exports or mixed modules
    jsPDF: mockJsPDF,
}));

jest.mock('jspdf-autotable', () => ({
    __esModule: true, // Needed for default exports or mixed modules
    default: mockAutoTable,
}));

// Mock console.error to check if it's called during error handling
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });


describe('PDFDownloadButton', () => {
    // Define common mock data
    const mockSmells: ContextSmell[] = [
        {
            smell_name: 'Long Method',
            function_name: 'calculateSomethingComplex',
            file_name: 'utils.py',
            line: 50,
            description: 'Method has too many lines.',
            additional_info: '',
        },
        {
            smell_name: 'Duplicate Code',
            function_name: 'processData',
            file_name: 'data_processor.js',
            line: 10,
            description: 'This block of code is repeated elsewhere.',
            additional_info: '',
        },
    ];

    const mockSelectedProjectWithSmells: ProjectType = {
        name: 'Test Project',
        files: null,
        data: {
            files: ['file1.py', 'file2.js'],
            message: 'Analysis complete',
            result: 'success',
            smells: mockSmells,
        },
        isLoading: false,
    };

    const mockSelectedProjectNoSmells: ProjectType = {
        name: 'Clean Project',
        files: null,
        data: {
            files: ['file3.ts'],
            message: 'Analysis complete',
            result: 'success',
            smells: [], // Empty smells array
        },
        isLoading: false,
    };

    const mockSelectedProjectNullSmells: ProjectType = {
        name: 'Another Project',
        files: null,
        data: {
            files: ['file4.go'],
            message: 'Analysis complete',
            result: 'success',
            smells: null, // Null smells
        },
        isLoading: false,
    };


    const mockReportResponse: GenerateReportResponse = {
        report_data: {
            // This specific structure isn't heavily used in this component's logic,
            // just its presence is checked initially.
            all_projects_combined: [],
        },
        // Other report data properties are not used by this component's logic
    };

    beforeEach(() => {
        // Clear all mock calls before each test
        jest.clearAllMocks();
        // Reset the console.error spy implementation if needed, though mockImplementation should handle it
        consoleErrorSpy.mockClear();

        // Reset mockJsPDF and mockAutoTable implementations for dynamic imports if necessary
        // In this setup, the top-level mocks using jest.mock should persist,
        // so just clearing calls is sufficient.
    });

    // Test Case 1: Renders the download button.
    it('should render the download button', () => {
        render(
            <PDFDownloadButton
                reportResponse={mockReportResponse}
                selectedProject={mockSelectedProjectWithSmells}
            />
        );

        const downloadButton = screen.getByRole('button', { name: /download as pdf/i });
        expect(downloadButton).toBeInTheDocument();
    });

    // Test Case 2: Shows error toast when reportResponse.report_data is missing.
    it('should show error toast when reportResponse.report_data is missing', async () => {
        const invalidReportResponse: GenerateReportResponse = { report_data: undefined };

        render(
            <PDFDownloadButton
                reportResponse={invalidReportResponse}
                selectedProject={mockSelectedProjectWithSmells}
            />
        );

        const downloadButton = screen.getByRole('button', { name: /download as pdf/i });
        fireEvent.click(downloadButton);

        // Wait for the async handler to potentially run (though it should return early)
        // A small timeout can help ensure async operations complete before assertions
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(toast.error).toHaveBeenCalledWith('No data available for PDF report.');
        expect(mockJsPDF).not.toHaveBeenCalled();
        expect(mockAutoTable).not.toHaveBeenCalled();
        expect(mockDocSave).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    // Test Case 3: Shows error toast when selectedProject is missing.
    it('should show error toast when selectedProject is missing', async () => {
        render(
            <PDFDownloadButton
                reportResponse={mockReportResponse}
                selectedProject={null as any} // Explicitly pass null for testing
            />
        );

        const downloadButton = screen.getByRole('button', { name: /download as pdf/i });
        fireEvent.click(downloadButton);

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(toast.error).toHaveBeenCalledWith('No data available for PDF report.');
        expect(mockJsPDF).not.toHaveBeenCalled();
        expect(mockAutoTable).not.toHaveBeenCalled();
        expect(mockDocSave).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    // Test Case 4: Successfully generates and downloads PDF with smells data.
    it('should generate and download PDF with smells data', async () => {
        render(
            <PDFDownloadButton
                reportResponse={mockReportResponse}
                selectedProject={mockSelectedProjectWithSmells}
            />
        );

        const downloadButton = screen.getByRole('button', { name: /download as pdf/i });
        fireEvent.click(downloadButton);

        // Wait for the async operations (dynamic imports, PDF generation)
        await new Promise(resolve => setTimeout(resolve, 10)); // Give time for async imports and operations

        expect(mockJsPDF).toHaveBeenCalledTimes(1);
        expect(mockDocSetFontSize).toHaveBeenCalledWith(18);
        expect(mockDocText).toHaveBeenCalledWith('Code Smell Analysis Report', 14, 20);
        expect(mockDocSetFontSize).toHaveBeenCalledWith(14); // For project name
        expect(mockDocText).toHaveBeenCalledWith(`Project: ${mockSelectedProjectWithSmells.name}`, 14, expect.any(Number)); // Check project name text
        expect(mockAutoTable).toHaveBeenCalledTimes(1);
        const expectedTableBody = mockSmells.map(smell => [
            smell.smell_name,
            smell.function_name,
            smell.file_name,
            smell.line,
            smell.description,
        ]);
        expect(mockAutoTable).toHaveBeenCalledWith(
            expect.any(Object), // jspdf instance
            {
                head: [["Smell Name", "Function Name", "File Name", "Line", "Description"]],
                body: expectedTableBody,
                startY: expect.any(Number), // Starting Y position after text
                showHead: "firstPage",
                pageBreak: "auto",
            }
        );
        expect(mockDocSave).toHaveBeenCalledWith(`smell_analysis_${mockSelectedProjectWithSmells.name.replace(/\s+/g, '_')}.pdf`);
        expect(toast.success).toHaveBeenCalledWith('PDF generated successfully');
        expect(toast.error).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    // Test Case 5: Successfully generates and downloads PDF when project has no smells.
    it('should generate and download PDF when project has no smells (empty array)', async () => {
        render(
            <PDFDownloadButton
                reportResponse={mockReportResponse}
                selectedProject={mockSelectedProjectNoSmells}
            />
        );

        const downloadButton = screen.getByRole('button', { name: /download as pdf/i });
        fireEvent.click(downloadButton);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockJsPDF).toHaveBeenCalledTimes(1);
        expect(mockDocSetFontSize).toHaveBeenCalledWith(18);
        expect(mockDocText).toHaveBeenCalledWith('Code Smell Analysis Report', 14, 20);
        expect(mockDocSetFontSize).toHaveBeenCalledWith(14);
        expect(mockDocText).toHaveBeenCalledWith(`Project: ${mockSelectedProjectNoSmells.name}`, 14, expect.any(Number));
        expect(mockDocText).toHaveBeenCalledWith('No smells detected for this project.', 14, expect.any(Number)); // Check 'no smells' text
        expect(mockAutoTable).not.toHaveBeenCalled(); // autoTable should NOT be called
        expect(mockDocSave).toHaveBeenCalledWith(`smell_analysis_${mockSelectedProjectNoSmells.name.replace(/\s+/g, '_')}.pdf`);
        expect(toast.success).toHaveBeenCalledWith('PDF generated successfully');
        expect(toast.error).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should generate and download PDF when project smells is null', async () => {
        render(
            <PDFDownloadButton
                reportResponse={mockReportResponse}
                selectedProject={mockSelectedProjectNullSmells}
            />
        );

        const downloadButton = screen.getByRole('button', { name: /download as pdf/i });
        fireEvent.click(downloadButton);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockJsPDF).toHaveBeenCalledTimes(1);
        expect(mockDocSetFontSize).toHaveBeenCalledWith(18);
        expect(mockDocText).toHaveBeenCalledWith('Code Smell Analysis Report', 14, 20);
        expect(mockDocSetFontSize).toHaveBeenCalledWith(14);
        expect(mockDocText).toHaveBeenCalledWith(`Project: ${mockSelectedProjectNullSmells.name}`, 14, expect.any(Number));
        expect(mockDocText).toHaveBeenCalledWith('No smells detected for this project.', 14, expect.any(Number)); // Check 'no smells' text
        expect(mockAutoTable).not.toHaveBeenCalled(); // autoTable should NOT be called
        expect(mockDocSave).toHaveBeenCalledWith(`smell_analysis_${mockSelectedProjectNullSmells.name.replace(/\s+/g, '_')}.pdf`);
        expect(toast.success).toHaveBeenCalledWith('PDF generated successfully');
        expect(toast.error).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });


    // Test Case 6: Shows error toast and logs error when PDF generation fails.
    it('should show error toast and log error when PDF generation fails', async () => {
        // Simulate an error during PDF generation, e.g., jspdf throws
        const pdfGenerationError = new Error('Mock PDF error');
        mockJsPDF.mockImplementationOnce(() => {
            throw pdfGenerationError;
        });

        render(
            <PDFDownloadButton
                reportResponse={mockReportResponse}
                selectedProject={mockSelectedProjectWithSmells}
            />
        );

        const downloadButton = screen.getByRole('button', { name: /download as pdf/i });
        fireEvent.click(downloadButton);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockJsPDF).toHaveBeenCalledTimes(1); // Constructor might still be called before it throws
        // Depending on where the error is thrown, other mocks might or might not be called.
        // The key assertions are the error handling.
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating PDF:', pdfGenerationError);
        expect(toast.error).toHaveBeenCalledWith('An error occurred during PDF generation. Please try again.');
        expect(mockDocSave).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
    });


    // Test Case 7: Handles project name with spaces for filename.
    it('should generate filename with underscores for project name with spaces', async () => {
        const projectWithSpaces: ProjectType = {
            ...mockSelectedProjectWithSmells,
            name: 'My Awesome Project',
        };

        render(
            <PDFDownloadButton
                reportResponse={mockReportResponse}
                selectedProject={projectWithSpaces}
            />
        );

        const downloadButton = screen.getByRole('button', { name: /download as pdf/i });
        fireEvent.click(downloadButton);

        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert that doc.save was called with the corrected filename
        expect(mockDocSave).toHaveBeenCalledWith('smell_analysis_My_Awesome_Project.pdf');
        expect(toast.success).toHaveBeenCalled(); // Should still succeed if save is called
        expect(toast.error).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should use "Unnamed Project" in filename if project name is missing', async () => {
        const projectNoName: ProjectType = {
            ...mockSelectedProjectWithSmells,
            name: undefined as any, // Simulate missing name
        };

        render(
            <PDFDownloadButton
                reportResponse={mockReportResponse}
                selectedProject={projectNoName}
            />
        );

        const downloadButton = screen.getByRole('button', { name: /download as pdf/i });
        fireEvent.click(downloadButton);

        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert that doc.save was called with the corrected filename
        expect(mockDocSave).toHaveBeenCalledWith('smell_analysis_Unnamed_Project.pdf');
        expect(toast.success).toHaveBeenCalled(); // Should still succeed if save is called
        expect(toast.error).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });


});
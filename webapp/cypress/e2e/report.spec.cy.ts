import { ProjectType } from '@/types/types';
import 'cypress-file-upload';

Cypress.config('defaultCommandTimeout', 10000);

declare global {
    namespace Cypress {
        interface CustomWindow extends Window {
            __REACT_CONTEXT__?: {
                projects: ProjectType[];
                updateProject: (index: number, project: Partial<ProjectType>) => void;
                addProject: () => void;
            };
        }
    }
}

describe('Dashboard Report Page - E2E Tests', () => {
    beforeEach(() => {
        cy.visit('http://localhost:3000/reports');
    });

    it('should show loading spinner initially and "No report data" when no project is selected', () => {
        cy.contains('No report data available.').should('exist');
    });

    it('should allow selecting a project and display the charts once data is ready', () => {
        cy.window().then((win: Cypress.CustomWindow) => {
            const context = win.__REACT_CONTEXT__;
            if (context) {
                context.addProject();
                context.updateProject(0, {
                    name: 'example_project',
                    isLoading: false,
                    data: {
                        message: 'Analysis complete',
                        files: ['example.py'],
                        result: 'Analysis complete',
                        smells: [
                            { smell_name: 'In-Place API Misuse', function_name: 'train_model', file_name: "example.py",  line: 12, description: '', additional_info: '' },
                            { smell_name: 'In-Place API Misuse', function_name: 'train_model', file_name: "example.py", line: 45, description: '', additional_info: '' },
                            { smell_name: 'Unnecessary Iteration', function_name: 'load_data', file_name: "example.py", line: 7, description: '', additional_info: '' },
                        ],
                    },
                });
            }
        });

        cy.contains('Dashboard Report - example_project', { timeout: 10000 }).should('exist');

        cy.contains('Smells by Category').should('exist');
        cy.contains('Top Offenders (Files)').should('exist');
        cy.contains('Top Functions').should('exist');
        cy.contains('Smell Heatmap').should('exist');
        cy.contains('Smell Distribution by File').should('exist');
    });

    it('should allow downloading PDF when report data is available', () => {
        cy.window().then((win: Cypress.CustomWindow) => {
            const context = win.__REACT_CONTEXT__;
            if (context) {
                context.addProject();
                context.updateProject(0, {
                    name: 'pdf_test_project',
                    isLoading: false,
                    data: {
                        message: 'Analysis complete',
                        files: ['file1.py'],
                        result: 'Analysis complete',
                        smells: [
                            { smell_name: 'Memory Not Freed', function_name: 'build_model', file_name: "file1.py", line: 20, description: '', additional_info: '' },
                        ],
                    },
                });
            }
        });

        cy.contains('Download as PDF').click();
        cy.wait(2000); // time to trigger download
    });

    it('should display message when selected project has no smell data', () => {
        cy.window().then((win: Cypress.CustomWindow) => {
            const context = win.__REACT_CONTEXT__;
            if (context) {
                context.addProject();
                context.updateProject(0, {
                    name: 'empty_project',
                    isLoading: false,
                    data: {
                        message: 'No smells detected',
                        files: ['clean.py'],
                        result: 'No smells detected',
                        smells: [],
                    },
                });
            }
        });

        cy.contains('No report data available.').should('not.exist');
        cy.get('.plotly-graph-div').should('have.length', 0);
    });
});
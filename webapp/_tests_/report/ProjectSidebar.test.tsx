import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProjectSidebar from "../../components/ProjectSidebar"; // Adjust the import path as needed
import { ProjectType } from "@/types/types"; // Adjust the import path as needed

describe("ProjectSidebar", () => {
    const mockProjects: ProjectType[] = [
        { name: "Project A", files: null, data: { files: null, message: "", result: null, smells: null }, isLoading: false },
        { name: "Project B", files: null, data: { files: null, message: "", result: null, smells: null }, isLoading: false },
        { name: "Project C", files: null, data: { files: null, message: "", result: null, smells: null }, isLoading: false },
    ];

    const onSelectProjectMock = jest.fn();
    const updateProjectMock = jest.fn();
    it("renders the list of projects", () => {
        render(
            <ProjectSidebar
                projects={mockProjects}
                selectedProject={null}
                onSelectProject={onSelectProjectMock}
                updateProject={updateProjectMock}
            />
        );

        expect(screen.getByText("Projects")).toBeInTheDocument();
        expect(screen.getByText("Project A")).toBeInTheDocument();
        expect(screen.getByText("Project B")).toBeInTheDocument();
        expect(screen.getByText("Project C")).toBeInTheDocument();
    });

    it("highlights the selected project", () => {
        const selectedProject = mockProjects[1]; // Project B

        render(
            <ProjectSidebar
                projects={mockProjects}
                selectedProject={selectedProject}
                onSelectProject={onSelectProjectMock}
            />
        );

        const selectedProjectListItem = screen.getByText("Project B").closest("li");
        expect(selectedProjectListItem).toHaveClass("font-semibold");
        expect(selectedProjectListItem).toHaveClass("text-blue-600");
        expect(selectedProjectListItem).toHaveClass("bg-blue-50");

        // Ensure other projects are not highlighted
        const projectAListItem = screen.getByText("Project A").closest("li");
        expect(projectAListItem).not.toHaveClass("font-semibold");
        expect(projectAListItem).not.toHaveClass("text-blue-600");
        expect(projectAListItem).not.toHaveClass("bg-blue-50");
    });

    it("calls onSelectProject when a project is clicked", () => {
        render(
            <ProjectSidebar
                projects={mockProjects}
                selectedProject={null}
                onSelectProject={onSelectProjectMock}
            />
        );

        // Click on "Project B"
        fireEvent.click(screen.getByText("Project B"));

        // Expect the onSelectProject mock function to have been called with the correct project
        expect(onSelectProjectMock).toHaveBeenCalledTimes(1);
        expect(onSelectProjectMock).toHaveBeenCalledWith(mockProjects[1]);
    });

    it("renders default project name if project.name is missing", () => {
        const projectsWithMissingName: ProjectType[] = [
            { name: "", files: null, data: { files: null, message: "", result: null, smells: null }, isLoading: false },
        ];

        render(
            <ProjectSidebar
                projects={projectsWithMissingName}
                selectedProject={null}
                onSelectProject={onSelectProjectMock}
            />
        );

        expect(screen.getByText("Project 1")).toBeInTheDocument();
    });

    it("renders the correct number of projects", () => {
        render(
            <ProjectSidebar
                projects={mockProjects}
                selectedProject={null}
                onSelectProject={onSelectProjectMock}
            />
        );

        const projectListItems = screen.getAllByRole("listitem");
        expect(projectListItems).toHaveLength(mockProjects.length);
    });
});
import React from "react";
import { render, screen } from "@testing-library/react";
import ChartContainer from "../../components/ChartContainer"; // Adjust the import path as needed

// Mock the dynamic import of Plot
jest.mock("next/dynamic", () => (cb: () => Promise<any>, options: any) => {
    const Plot = jest.fn(() => <div data-testid="mocked-plot">Mocked Plot</div>);
    Plot.displayName = "Plot"; // Optional: Set a display name for easier debugging
    return Plot;
});

describe("ChartContainer", () => {
    const mockTitle = "Test Chart";
    const mockDelay = 0.2;

    it("renders the title", () => {
        render(
            <ChartContainer
                title={mockTitle}
                delay={mockDelay}
                data={[]}
                render={() => <div />}
            />
        );
        expect(screen.getByText(mockTitle)).toBeInTheDocument();
    });

    it("renders the EmptyPlot when data is empty", () => {
        render(
            <ChartContainer
                title={mockTitle}
                delay={mockDelay}
                data={[]}
                render={() => <div />}
            />
        );
        expect(screen.getByTestId("mocked-plot")).toBeInTheDocument();
    });

    it("does not render the EmptyPlot and calls the render function when data is not empty", () => {
        const mockData = [1, 2, 3];
        const mockRender = jest.fn(() => <div data-testid="rendered-chart">Rendered Chart</div>);

        render(
            <ChartContainer
                title={mockTitle}
                delay={mockDelay}
                data={mockData}
                render={mockRender}
            />
        );

        expect(screen.getByTestId("rendered-chart")).toBeInTheDocument();
        expect(screen.queryByTestId("mocked-plot")).toBeNull();
        expect(mockRender).toHaveBeenCalledTimes(1);
        expect(mockRender).toHaveBeenCalledWith(mockData);
    });

    it("renders the output of the render function correctly", () => {
        const mockData = [{ x: [1, 2], y: [3, 4], type: 'scatter' }];
        const mockRender = jest.fn((data) => (
            <div data-testid="custom-rendered-chart">
                {data.map((item, index) => (
                    <div key={index}>{JSON.stringify(item)}</div>
                ))}
            </div>
        ));

        render(
            <ChartContainer
                title={mockTitle}
                delay={mockDelay}
                data={mockData}
                render={mockRender}
            />
        );

        expect(screen.getByTestId("custom-rendered-chart")).toBeInTheDocument();
        expect(screen.getByText(JSON.stringify(mockData[0]))).toBeInTheDocument();
    });
});
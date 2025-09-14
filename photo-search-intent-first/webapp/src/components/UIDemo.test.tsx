import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UIDemo } from "./UIDemo";

describe("UIDemo", () => {
  it("renders without crashing", () => {
    render(<UIDemo />);
    
    // Check that the main heading is rendered
    expect(screen.getByText("shadcn/ui Component Demo")).toBeInTheDocument();
    
    // Check that buttons with different variants are rendered
    expect(screen.getByText("Destructive")).toBeInTheDocument();
    expect(screen.getByText("Outline")).toBeInTheDocument();
    
    // Check that form elements are rendered
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Role")).toBeInTheDocument();
    
    // Check that dialog trigger is rendered
    expect(screen.getByText("Open Dialog")).toBeInTheDocument();
  });
});

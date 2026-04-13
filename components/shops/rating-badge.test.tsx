import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RatingBadge } from "./rating-badge";

describe("RatingBadge", () => {
  it("renders rating number and attribution text when reviewCount > 0", () => {
    render(<RatingBadge rating={4.8} reviewCount={120} />);

    expect(screen.getByText("4.8")).toBeInTheDocument();
    expect(screen.getByText("120 reviews on Google Maps")).toBeInTheDocument();
  });

  it("renders correct number of filled stars for rating 4.2", () => {
    render(<RatingBadge rating={4.2} reviewCount={50} />);

    const stars = screen.getAllByTestId("star-icon");
    expect(stars).toHaveLength(5);
    // 4 filled + 1 empty for rating 4.2
    expect(stars.filter((s) => s.getAttribute("data-filled") === "true")).toHaveLength(4);
  });

  it("returns null when reviewCount is 0", () => {
    const { container } = render(<RatingBadge rating={4.5} reviewCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when reviewCount is null", () => {
    const { container } = render(<RatingBadge rating={4.5} reviewCount={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when rating is null", () => {
    const { container } = render(<RatingBadge rating={null} reviewCount={100} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders laurel wreath decorations", () => {
    render(<RatingBadge rating={4.5} reviewCount={100} />);

    expect(screen.getByTestId("laurel-left")).toBeInTheDocument();
    expect(screen.getByTestId("laurel-right")).toBeInTheDocument();
  });

  it("clamps rating display to one decimal place", () => {
    render(<RatingBadge rating={4.567} reviewCount={100} />);
    expect(screen.getByText("4.6")).toBeInTheDocument();
  });
});

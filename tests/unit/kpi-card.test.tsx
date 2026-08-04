import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "@/components/ui/kpi-card";
import type { KpiFixture } from "@/demo/fixtures";

const kpi: KpiFixture = {
  id: "test-kpi",
  label: "خودروهای آماده",
  value: "۱۵۶",
  deltaLabel: "۱۲٪",
  deltaDirection: "up",
  tone: "success",
  icon: "ready",
};

describe("KpiCard", () => {
  it("renders the label and value", () => {
    render(<KpiCard kpi={kpi} />);
    expect(screen.getByText("خودروهای آماده")).toBeInTheDocument();
    expect(screen.getByText("۱۵۶")).toBeInTheDocument();
  });
});

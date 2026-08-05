import { runSeedScript } from "./run-seed";

export const E2E_ADMIN_USERNAME = "e2e_admin";
export const E2E_ADMIN_PASSWORD = "E2eAdmin123!";
export const E2E_VIEWER_USERNAME = "e2e_viewer";
export const E2E_VIEWER_PASSWORD = "E2eViewer123!";
export const E2E_PLANNER_USERNAME = "e2e_planner";
export const E2E_PLANNER_PASSWORD = "E2ePlanner123!";

async function globalSetup() {
  runSeedScript(["admin"]);
  runSeedScript(["viewer"]);
  runSeedScript(["planner"]);
}

export default globalSetup;

import { runSeedScript } from "./run-seed";

export const E2E_ADMIN_USERNAME = "e2e_admin";
export const E2E_ADMIN_PASSWORD = "E2eAdmin123!";

async function globalSetup() {
  runSeedScript(["admin"]);
}

export default globalSetup;

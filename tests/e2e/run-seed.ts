import { execFileSync } from "node:child_process";
import path from "node:path";

const tsxCli = path.resolve(__dirname, "../../node_modules/tsx/dist/cli.mjs");
const seedScript = path.resolve(__dirname, "./seed-users.ts");

export function runSeedScript(args: string[]): void {
  execFileSync(process.execPath, [tsxCli, seedScript, ...args], { stdio: "inherit" });
}

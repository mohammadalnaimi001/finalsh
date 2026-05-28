import { spawn } from "node:child_process";

const children = [];

function run(command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown(code);
    }
  });
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("npm", ["run", "server"]);
run("npm", ["run", "dev:ui"]);

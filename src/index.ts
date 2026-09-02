#!/usr/bin/env node

import { Command } from "commander";
import { wakeup } from "./cli/wakeup";
import { config } from "./cli/config";
import { showBanner } from "./utils/banner";

const program = new Command();

program
  .name("coalition")
  .description("Coalition — Autonomous Terminal AI Agent")
  .version("0.1.0");

program
  .command("wakeup")
  .description("Boot the agent into an interactive session")
  .action(async () => {
    await showBanner();
    await wakeup();
  });

program
  .command("config")
  .description("Configure Coalition (API keys, model settings)")
  .action(async () => {
    await config();
  });

program.parse();

import * as figlet from "figlet";
import chalk from "chalk";

export async function showBanner(): Promise<void> {
  return new Promise((resolve) => {
    figlet.text("Coalition", (err, data) => {
      if (err) {
        console.log(chalk.cyan("Coalition — Autonomous Terminal AI Agent"));
      } else {
        console.log(chalk.cyan(data));
      }
      console.log(
        chalk.yellow("Coalition is awake. What do you need done?\n")
      );
      resolve();
    });
  });
}

import * as p from "@clack/prompts";
import chalk from "chalk";

export async function wakeup(): Promise<void> {
  while (true) {
    const input = await p.text({
      message: chalk.cyan(">"),
    });

    if (p.isCancel(input)) {
      console.log(chalk.yellow("\nCoalition going back to sleep. Goodbye!"));
      break;
    }

    if (!input) continue;

    console.log(chalk.gray(`[Coalition] Received: "${input}"`));
    console.log(chalk.gray("[Coalition] Planning..."));
    // TODO: AI integration will go here
    console.log(
      chalk.yellow("[Coalition] AI integration not yet implemented.")
    );
  }
}

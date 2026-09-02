import * as figlet from "figlet";
import chalk from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";

const VERSION = "0.1.0";

// Purple-to-blue gradient for the banner text
const bannerGradient = gradient(["#7C3AED", "#3B82F6"]);

function renderBanner(): Promise<string> {
  return new Promise((resolve, reject) => {
    figlet.text("Coalition", { font: "Slant" }, (err, data) => {
      if (err || !data) {
        // Fallback to plain text if figlet fails
        resolve(chalk.bold.hex("#7C3AED")("Coalition"));
        return;
      }
      resolve(bannerGradient(data));
    });
  });
}

export async function showBanner(): Promise<void> {
  const logo = await renderBanner();

  // Subtitle line
  const subtitle = chalk.dim(`AI Agent · v${VERSION}`);

  // Build the inner content: logo + subtitle, centered
  const inner = `${logo}\n${subtitle}`;

  // Wrap in a bordered box
  const boxed = boxen(inner, {
    padding: { top: 1, bottom: 1, left: 2, right: 2 },
    margin: { top: 1, bottom: 1 },
    borderStyle: "round",
    borderColor: "#7C3AED",
    title: chalk.bold.hex("#7C3AED")(" COALITION "),
    titleAlignment: "center",
  });

  console.log(boxed);

  // Status line: bold green "Coalition is awake." + dim prompt
  const status = chalk.bold.green("● Coalition is awake.");
  const prompt = chalk.dim("  What do you need done?");
  console.log(`${status}${prompt}\n`);
}

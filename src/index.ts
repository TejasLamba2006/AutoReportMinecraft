import * as fs from "fs";
import * as path from "path";
import screenshot from "screenshot-desktop";
import Jimp from "jimp";
import { Tail } from "tail";
import colors from "colors";
import { config } from "dotenv";
import { checkProfanity, Slur } from "./constants";

config();

const config_app = JSON.parse(fs.readFileSync("config.json", "utf8"));
let gamemode = "lobby";
const appdataPath = process.env.APPDATA || "";
const logPath = replacePlaceholders(config_app.log_path, appdataPath);
const screenshotSavePathTemplate = replacePlaceholders(
  config_app.screenshot_save_path,
  appdataPath
);

function replacePlaceholders(template: string, appdataPath: string): string {
  return template.replace("{{appdata}}", appdataPath);
}

async function containsProfanity(message: string): Promise<Slur> {
  const profanity = await checkProfanity(message);
  return profanity;
}

async function takeScreenshot(Profanity: Slur, msg: string) {
  const date = new Date().toISOString().split("T")[0];
  const screenshotSavePath = screenshotSavePathTemplate
    .replace("{{date}}", date)
    .replace("{{rule_broken}}", Profanity.text)
    .replace(
      "{{msg}}",
      msg
        .replace(/\[.*?\]|�|\?/g, "")
        .replace("  ", "")
        .replace(" ", "")
    );

  createDirIfNotExists(screenshotSavePath);

  try {
    const img = await screenshot({ format: "png" });
    const image = await Jimp.read(img);
    image.write(screenshotSavePath);
    log(`Screenshot saved to ${screenshotSavePath}`, "SUCCESS");
  } catch (err) {
    log("Error taking screenshot: " + err, "ERROR");
  }
}

function createDirIfNotExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const tailOptions = {
  useWatchFile: true,
  nLines: 1,
  fsWatchOptions: { interval: 100 },
};
const tail = new Tail(logPath, tailOptions);

tail.on("line", async (data: string) => {
  const chatIndex = data.indexOf("[CHAT]");
  if (chatIndex === -1) return;

  const msg = data
    .substring(chatIndex + 7)
    .replace(/(§|�)([0-9]|a|b|e|d|f|k|l|m|n|o|r|c)/gm, "");
  if (!msg) return;
  const Profanity = await containsProfanity(msg);
  if (!Profanity) return;
  log(
    `Word: ${Profanity.text} Rule broken: ${Profanity.category_1} - ${msg}`,
    "INFO"
  );

  takeScreenshot(Profanity, msg);
});
const debug = process.env.DEBUG_APP;

log(`Debug mode: ${debug}`, "INFO");

function log(message: string, tag: string = "INFO") {
  const colorMap: { [key: string]: (s: string) => string } = {
    INFO: colors.blue,
    ERROR: colors.red,
    SUCCESS: colors.green,
    DEBUG: colors.yellow,
  };
  const color = colorMap[tag] || colors.white;
  if (tag === "DEBUG" && !debug) return;
  console.log(color(`[${tag}] ${message}`));
}

log(`Watching log file at ${logPath}`, "INFO");

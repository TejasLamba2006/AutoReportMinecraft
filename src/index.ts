import * as fs from "fs";
import * as path from "path";
import screenshot from "screenshot-desktop";
import Jimp from "jimp";
import { Tail } from "tail";
import colors from "colors";
import { config } from "dotenv";
import { REGEX, checkProfanity } from "./constants";

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

async function containsProfanity(message: string): Promise<boolean> {
  const profanity = await checkProfanity(message);
  return profanity !== null;
}

async function takeScreenshot(ruleBroken: string, username: string) {
  const date = new Date().toISOString().split("T")[0];
  const screenshotSavePath = screenshotSavePathTemplate
    .replace("{{date}}", date)
    .replace("{{rule_broken}}", ruleBroken)
    .replace("{{username}}", username);

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

  changeGamemode(msg);
  console.log(msg);
  const match = parseMessage(msg);
  if (!match) return;

  const [, , username, message, message2] = match;
  const isProfanity = await containsProfanity(
    gamemode == "skyblockdream" ? message2 : message
  );
  if (!isProfanity) return;
  const ruleBroken = "profanity";
  log(
    `Rule broken: ${ruleBroken} - Username: ${username} - Message: ${message}`,
    "INFO"
  );

  takeScreenshot(ruleBroken, username);
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

function changeGamemode(msg: string) {
  let newGamemode = gamemode;
  if (msg.includes("You are connected to Lobby")) newGamemode = "lobby";
  if (msg.includes("You are connected to BWLOBBY")) newGamemode = "bedwars";
  if (msg.includes("You are connected to FactionsImmortal"))
    newGamemode = "factionsimmortal";
  if (msg.includes("You are connected to SkyBlockDream"))
    newGamemode = "skyblockdream";
  if (msg.includes("You are connected to KitPvP")) newGamemode = "kitpvp";
  if (msg.includes("You are connected to TBLOBBY")) newGamemode = "thebridge";
  if (msg.includes("You are connected to Prison")) newGamemode = "prison";

  if (newGamemode !== gamemode) {
    gamemode = newGamemode;
    log(`Gamemode: ${gamemode}`, "DEBUG");
  }
}

function parseMessage(msg: string): RegExpMatchArray | null {
  if (typeof gamemode !== "string" || !Array.isArray(REGEX[gamemode])) {
    console.error(`Invalid gamemode: ${gamemode}`);
    return null;
  }

  const regexList = REGEX[gamemode];
  for (const regex of regexList) {
    const match = msg.match(regex);
    if (match) {
      return match;
    }
  }

  return null;
}

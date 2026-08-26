import { readFileSync } from "node:fs";

const changelog = readFileSync("CHANGELOG.md", "utf8");
const sections = changelog.split(/\n(?=## )/);
const latest = sections.find((section) => section.startsWith("## "));

process.stdout.write(latest.replace(/^## .*\n/, "").trim() + "\n");

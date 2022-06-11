import {
  convertEpubFile,
  convertHTMLFile,
  convertMobiFile,
  convertPDFFile,
} from "./utils/converter.js";
import { getStoryHTML, getStoryInfo } from "./services/index.js";

import fs from "fs";
import inquirer from "inquirer";
import { isCalibreAvailable } from "./utils/index.js";
import ora from "ora";

fs.mkdirSync("output", { recursive: true });
fs.mkdirSync("output/images", { recursive: true });

let { storyId } = await inquirer.prompt({
  type: "input",
  name: "storyId",
  message: "Enter docln Story ID: ",
  validate: (input) => (input ? true : "Please enter the story ID"),
});
storyId = storyId.trim();

const fetchingStoryInfoSpinner = ora({
  text: "Fetching story info",
  hideCursor: false,
}).start();

const info = await getStoryInfo(storyId);

fetchingStoryInfoSpinner.succeed("Story info fetched successfully\n");

let { selectedSections } = await inquirer.prompt({
  type: "checkbox",
  message: "Select sections to download",
  name: "selectedSections",
  choices: info.sections.map((section) => ({
    name: section.title,
    value: section,
  })),
  validate: (input) =>
    input.length > 0 ? true : "Please select at least one section",
});

const { format } = await inquirer.prompt({
  type: "list",
  name: "format",
  message: "Which format do you want to export?",
  choices: [
    { name: "HTML", value: "html" },
    { name: "PDF", value: "pdf" },
    { name: "Epub", value: "epub" },
    { name: "Mobi", value: "mobi" },
  ],
});

const { comicTitle } = await inquirer.prompt({
  type: "input",
  name: "comicTitle",
  message: "What title do you want to save as: ",
  default: info.title,
});

const storyHTML = await getStoryHTML(selectedSections, format !== "pdf");

switch (format) {
  case "html": {
    await convertHTMLFile(comicTitle, storyHTML);
    break;
  }

  case "pdf": {
    await convertPDFFile(comicTitle, storyHTML);
    break;
  }

  case "epub": {
    await isCalibreAvailable();
    await convertEpubFile(comicTitle, storyHTML, info.cover);
    break;
  }

  case "mobi": {
    await isCalibreAvailable();
    await convertMobiFile(comicTitle, storyHTML, info.cover);
    break;
  }

  default:
    break;
}

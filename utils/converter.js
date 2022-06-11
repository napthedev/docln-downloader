import { htmlTemplate, pdfTemplate } from "../templates/index.js";

import chalk from "chalk";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";
import ora from "ora";
import path from "path";
import pdf from "html-pdf";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export const convertHTMLFile = async (title, htmlContent) => {
  fs.writeFileSync(path.resolve(__dirname, "..", "output", `${title}.html`), htmlTemplate.replace("{{title}}", title).replace("{{content}}", htmlContent));

  console.log(`${chalk.green("✔")} Generated HTML file successfully`);
};

export const convertPDFFile = async (title, htmlContent) => {
  await new Promise((res, rej) => {
    const generatePDFSpinner = ora({
      text: "Generating PDF...",
      hideCursor: false,
    }).start();

    pdf.create(pdfTemplate.replace("{{title}}", title).replace("{{content}}", htmlContent), { format: "A4", quality: "100", timeout: 999999999 }).toFile(path.resolve(__dirname, "..", "output", `${title}.pdf`), (err, response) => {
      if (err) {
        console.log(err);
        console.log(`\n${chalk.red("✖")} Failed to generate PDF file`);
        process.exit(1);
      }

      generatePDFSpinner.succeed("Generated PDF file successfully");

      res(response);
    });
  });
};

export const convertEpubFile = async (title, htmlContent, cover) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body>
  ${htmlContent}
</body>
</html>
    `;

  const htmlFilePath = path.resolve(__dirname, "..", `output/${title}-temp.html`);
  const outputFilePath = path.resolve(__dirname, "..", `output/${title}.epub`);

  fs.writeFileSync(htmlFilePath, html, { encoding: "utf-8" });

  const epubConversionSpinner = ora({
    text: "Generating Epub file...",
    hideCursor: false,
  }).start();

  try {
    execSync(`ebook-convert "${htmlFilePath}" "${outputFilePath}" --authors "docln" --output-profile kindle_pw3 --disable-font-rescaling --cover "${cover}" --title "${title}"`, {
      cwd: path.resolve(__dirname, ".."),
    });

    epubConversionSpinner.succeed("Epub conversion succeeded...");
  } catch (error) {
    console.log(error);
    epubConversionSpinner.fail("Epub conversion failed...");
  }
};

export const convertMobiFile = async (title, htmlContent, cover) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body>
  ${htmlContent}
</body>
</html>
    `;

  const htmlFilePath = path.resolve(__dirname, "..", `output/${title}-temp.html`);
  const outputFilePath = path.resolve(__dirname, "..", `output/${title}.mobi`);

  fs.writeFileSync(htmlFilePath, html, { encoding: "utf-8" });

  const mobiConversionSpinner = ora({
    text: "Generating Mobi file...",
    hideCursor: false,
  }).start();

  try {
    execSync(`ebook-convert "${htmlFilePath}" "${outputFilePath}" --authors "docln" --output-profile kindle_pw3 --disable-font-rescaling --cover "${cover}" --title "${title}"`, {
      cwd: path.resolve(__dirname, ".."),
    });

    mobiConversionSpinner.succeed("Mobi conversion succeeded...");
  } catch (error) {
    console.log(error);
    mobiConversionSpinner.fail("Mobi conversion failed...");
  }
};

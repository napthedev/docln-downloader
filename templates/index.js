import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export const htmlTemplate = fs.readFileSync(
  path.resolve(__dirname, "html.html"),
  {
    encoding: "utf-8",
  }
);

export const pdfTemplate = fs.readFileSync(
  path.resolve(__dirname, "pdf.html"),
  {
    encoding: "utf-8",
  }
);

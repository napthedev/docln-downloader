import axios from "axios";
import chalk from "chalk";
import crypto from "crypto";
import { fileURLToPath } from "url";
import fs from "fs";
import ora from "ora";
import { parse } from "node-html-parser";
import path from "path";
import sanitizeHtml from "sanitize-html";
import sharp from "sharp";
import { splitArray } from "../utils/index.js";

sanitizeHtml.defaults.allowedTags.push("img");

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const BASE_URL = "https://docln.net";
const PROXIED_BASE_URL = "https://corsanywhere.herokuapp.com/https://docln.net";

axios.defaults.headers.common["Referrer"] = BASE_URL;

axios.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (+err?.response?.status === 429) {
      const res = await axios.request({
        ...err.config,
        baseURL: PROXIED_BASE_URL,
      });
      return res;
    } else {
      return Promise.reject(err);
    }
  }
);

export const getStoryInfo = async (storyId) => {
  try {
    const info = (await axios.get(`truyen/${storyId}`, { baseURL: BASE_URL }))
      .data;

    const dom = parse(info);

    const title = dom.querySelector(".series-name a")?.innerText?.trim();

    if (!title) {
      console.log(`\n${chalk.red("✖")} Cannot find the story you entered`);
      process.exit(1);
    }

    console.log(`\nDownload story: ${chalk.cyan(title)}\n`);

    const sections = dom
      .querySelectorAll("section.volume-list")
      .map((section) => ({
        title: section.querySelector(".sect-title")?.innerText.trim(),
        chapters: section.querySelectorAll(".list-chapters li").map((chap) => ({
          title: chap.querySelector(".chapter-name a")?.innerText.trim(),
          url: chap.querySelector(".chapter-name a")?.getAttribute("href"),
        })),
      }));

    const cover = dom
      .querySelector("meta[property=og:image]")
      ?.getAttribute("content");

    return {
      title,
      sections,
      cover,
    };
  } catch (error) {
    console.log(`\n${chalk.red("✖")} Error getting story info`);
    process.exit(1);
  }
};

export const getChapHTML = async (url) => {
  const source = (await axios.get(url, { baseURL: BASE_URL })).data;

  const dom = parse(source);

  const paragraphs = dom
    .querySelectorAll("#chapter-content p")
    .filter((p) => !!p.id && !isNaN(Number(p.id)));

  const result = sanitizeHtml(paragraphs.map((p) => p.outerHTML).join("\n"));

  return result;
};

export const getStoryHTML = async (
  selectedSections,
  shouldUseLocalImages = true
) => {
  let partsSpinner = ora({
    hideCursor: false,
  }).start();

  const chapters = selectedSections.reduce((acc, current) => {
    acc.push(...current.chapters);
    return acc;
  }, []);

  let htmlParts = [];

  for (const [index, group] of splitArray(chapters, 10).entries()) {
    partsSpinner.text = `Fetching parts ${chalk.green(
      `${index * 10 + 1}-${index * 10 + 10}`
    )}...`;

    htmlParts.push(
      ...(await Promise.all(
        group.map(async (chap) => {
          return {
            title: chap.title,
            html: await getChapHTML(chap.url),
          };
        })
      ))
    );
  }

  partsSpinner.succeed("Fetched all the parts successfully");

  const html = htmlParts
    .map((part) => `<h1>${part.title}</h1>\n${part.html}`)
    .join("\n");

  const dom = parse(html);

  if (shouldUseLocalImages) {
    const images = dom.querySelectorAll("img").map((image) => {
      const src = image.getAttribute("src");
      const hash = crypto.createHash("md5").update(src).digest("hex");

      const filePath = path.resolve(
        __dirname,
        "..",
        "output",
        "images",
        `${hash}.jpg`
      );

      image.setAttribute("src", `file://${filePath}`);

      return {
        url: src,
        hash,
        filePath,
        imageEl: image,
      };
    });

    let imagesSpinner = ora({
      text: "Fetching images...",
      hideCursor: false,
    }).start();

    for (const [index, group] of splitArray(images, 10).entries()) {
      imagesSpinner.text = `Fetching images ${chalk.green(
        `${index * 10 + 1}-${index * 10 + 10}`
      )}...`;
      await Promise.all(
        group.map(async (image) => {
          try {
            const response = await axios.get(image.url, {
              responseType: "arraybuffer",
              baseURL: BASE_URL,
            });

            const buffer = Buffer.from(response.data);

            const contentType = response.headers["content-type"];

            if (contentType === "image/jpeg") {
              fs.writeFileSync(image.filePath, buffer);
            } else {
              await sharp(buffer).jpeg().toFile(image.filePath);
            }
          } catch (error) {
            if (
              error?.response?.headers?.["content-type"]?.startsWith("image")
            ) {
              const buffer = Buffer.from(error.response.data);

              const contentType = error.response.headers["content-type"];

              if (contentType === "image/jpeg") {
                fs.writeFileSync(image.filePath, buffer);
              } else {
                await sharp(buffer).jpeg().toFile(image.filePath);
              }
            } else {
              image.imageEl.remove();
            }
          }
        })
      );
    }
    imagesSpinner.succeed("Fetched all the images successfully");
  }

  return dom.outerHTML;
};

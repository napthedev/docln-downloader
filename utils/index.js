import chalk from "chalk";
import which from "which";

export const splitArray = (arr, size) =>
  Array.from(new Array(Math.ceil(arr.length / size)), (_, i) =>
    arr.slice(i * size, i * size + size)
  );

export const isCalibreAvailable = async () => {
  try {
    await which("ebook-convert");
  } catch (error) {
    console.log(
      `\n${chalk.red(
        "✖"
      )} You need to install calibre to convert Epub and Mobi files: https://calibre-ebook.com/download`
    );
    process.exit(1);
  }
};

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import axios from "axios";
require("dotenv").config();
import fs from "fs";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const GoogleModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_AI_API_KEY!);

interface OutputFormat {
  [key: string]: string | string[] | OutputFormat;
}

async function downloadPDF(pdfUrl: string, outputPath: string) {
  const response = await axios({
    url: pdfUrl,
    method: "GET",
    responseType: "stream",
  });

  return new Promise<void>((resolve, reject) => {
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

export async function strict_output(
  system_prompt: string,
  user_prompt: string | string[],
  output_format: OutputFormat,
  pdfUrl: string,
  default_category: string = "",
  output_value_only: boolean = false,
  temperature: number = 1,
  num_tries: number = 10,
  verbose: boolean = false
): Promise<{ question: string; answer: string }[]> {
  const list_input: boolean = Array.isArray(user_prompt);
  const dynamic_elements: boolean = /<.*?>/.test(JSON.stringify(output_format));
  const list_output: boolean = /\[.*?\]/.test(JSON.stringify(output_format));

  let error_msg: string = "";

  for (let i = 0; i < num_tries; i++) {
    let output_format_prompt: string = `\nYou are to output the following in json format: ${JSON.stringify(
      output_format
    )}. \nDo not put quotation marks or escape character \\ in the output fields.`;

    if (list_output) {
      output_format_prompt += `\nIf output field is a list, classify output into the best element of the list.`;
    }

    if (dynamic_elements) {
      output_format_prompt += `\nAny text enclosed by < and > indicates you must generate content to replace it. Example input: Go to <location>, Example output: Go to the garden.`;
    }

    if (list_input) {
      output_format_prompt += `\nGenerate a list of json, one json for each input element.`;
    }

    try {
      let result: any;

      // Download and upload logic for PDF
      if (pdfUrl) {
        const fileName = pdfUrl.split("/").pop() || "download";
        const outputPath = `media/${fileName}.pdf`;
        console.log("Downloading PDF...");
        await downloadPDF(pdfUrl, outputPath);
        console.log("PDF downloaded successfully.");

        const uploadResponse = await fileManager.uploadFile(outputPath, {
          mimeType: "application/pdf",
          displayName: "Downloaded PDF",
        });

        // Cleanup the downloaded file
        fs.unlinkSync(outputPath);
        console.log("Uploaded file deleted successfully.");

        const promptToUse = `systemPrompt=${system_prompt} + ${output_format_prompt} + ${error_msg} userPrompt=${user_prompt.toString()}`;
        result = await GoogleModel.generateContent([
          {
            fileData: {
              mimeType: uploadResponse.file.mimeType,
              fileUri: uploadResponse.file.uri,
            },
          },
          promptToUse,
        ]);
      } else {
        // Generate content without PDF
        const promptToUse = `systemPrompt=${system_prompt} + ${output_format_prompt} + ${error_msg} userPrompt=${user_prompt.toString()}`;
        result = await GoogleModel.generateContent(promptToUse);
      }

      let res: string = result.response.text().replace(/'/g, '"') ?? "";
      res = res.replace(/(\w)"(\w)/g, "$1'$2"); // Preserve apostrophes

      if (verbose) {
        console.log(
          "System prompt:",
          system_prompt + output_format_prompt + error_msg
        );
        console.log("\nUser prompt:", user_prompt);
        console.log("\nGemini response:", res);
      }

      let output: any = JSON.parse(res);

      // Ensure output matches the expected structure
      if (list_input) {
        if (!Array.isArray(output)) {
          throw new Error("Output format not in a list of json");
        }
      } else {
        output = [output];
      }

      for (let index = 0; index < output.length; index++) {
        for (const key in output_format) {
          if (/<.*?>/.test(key)) {
            continue; // Skip dynamic keys
          }

          if (!(key in output[index])) {
            throw new Error(`${key} not in json output`);
          }

          if (Array.isArray(output_format[key])) {
            const choices = output_format[key] as string[];
            if (Array.isArray(output[index][key])) {
              output[index][key] = output[index][key][0];
            }

            if (!choices.includes(output[index][key]) && default_category) {
              output[index][key] = default_category;
            }

            if (output[index][key].includes(":")) {
              output[index][key] = output[index][key].split(":")[0];
            }
          }
        }

        // Output value handling
        if (output_value_only) {
          output[index] = Object.values(output[index]);
          if (output[index].length === 1) {
            output[index] = output[index][0];
          }
        }
      }

      return list_input ? output : output[0];
    } catch (e: any) {
      error_msg = `\n\nResult: ${"res"}\n\nError message: ${e.message}`;
      console.log("An exception occurred:", e);
      console.log("Current invalid json format:", "res");
    }
  }

  return [];
}

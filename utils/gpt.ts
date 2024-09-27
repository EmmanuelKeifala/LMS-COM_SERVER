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
  let error_msg: string = "";

  for (let i = 0; i < num_tries; i++) {
    const formattedPrompt = `generate questions based on the topic provided \n\nQandA = {'question': string, 'answer': string, 'option1': string, 'option2': string, 'option3': string}\nReturn: Array<QandA>\n\nSystem Prompt: ${system_prompt}\nUser Prompt: ${JSON.stringify(
      user_prompt
    )}`;

    let result: any; // Declare result outside the try block

    try {
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

        fs.unlinkSync(outputPath);
        console.log("Uploaded file deleted successfully.");

        result = await GoogleModel.generateContent([
          {
            fileData: {
              mimeType: uploadResponse.file.mimeType,
              fileUri: uploadResponse.file.uri,
            },
          },
          formattedPrompt,
        ]);
      } else {
        result = await GoogleModel.generateContent(formattedPrompt);
      }

      const responseText = result.response.text();

      // Extract the JSON part from the response
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        // Parse the extracted JSON string
        const jsonString = jsonMatch[1].trim();
        const output = JSON.parse(jsonString);

        // Ensure the output structure matches the expected format
        if (!Array.isArray(output)) {
          throw new Error("Output is not an array of QandA objects");
        }

        return output;
      } else {
        throw new Error("No valid JSON found in the response");
      }
    } catch (e: any) {
      error_msg = `\n\nResult: ${
        result?.response.text() ?? "N/A"
      }\n\nError message: ${e.message}`;
      console.log("An exception occurred:", e);
      console.log(
        "Current invalid json format:",
        result?.response.text() ?? "N/A"
      );
    }
  }

  return [];
}

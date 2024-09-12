import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

export const getDashboardCourses = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
       try {
    const { message: userMessage, userSettings, cachedFile } = await req.json();
    // console.log("userSettings:", userSettings);

    if (!Array.isArray(userMessage) || userMessage.length === 0) {
      return  res.status(400).json(
       message: "No valid user message", status: 400,
      );
    }

    // let fileData: CachedFile = {
    //   fileUri: "",
    //   mimeType: "",
    // };

    // if (cachedFile && cachedFile[userSettings[0].location]) {
    //   // Use cached file data
    //   fileData = cachedFile[userSettings[0].location];
    // } else {
    //   // Fetch file from cache or upload if not present
    //   fileData = await getFileFromCacheOrUpload(userSettings[0].location);
    // }

    // Build the conversation history prompt
    const conversationHistory = userMessage
      .map(
        (msg: { role: string; content: string }) =>
          `${msg.role}: ${msg.content}`
      )
      .join("\n");

    const settings = userSettings?.map(
      (setting: { location: string; type: string }) =>
        `triage location: ${setting.location}, type: ${setting.type}`
    );

    const prompt = `
You are an AI assistant designed to interact with patients and gather medical information in a caring, professional manner. Your role is to conduct a thorough patient interview, collecting important details about their health and medical history.
ask one question at a time, do not repeat your self, make the conversation natural and more human like sound like triage nurse
Please engage with the patient respectfully and empathetically, asking questions related to the following areas:

1. Biodata: Basic personal information (name, age, gender, address, date of interview etc.) this is very key and must promted for do not leave it behind

2. Presenting complaint(s): The main reason(s) for their visit or concern

3. History of presenting complaint: Details about when and how their symptoms started, and how they've progressed

4. Direct questioning: Specific questions related to their presenting complaint

5. Systemic inquiry (review): General health questions covering various body systems

6. Pregnancy and delivery history: If applicable, details about pregnancies and childbirth

7. Past medical history: Previous illnesses, surgeries, or health conditions

8. Drug history: Current medications, past medications, allergies

9. Developmental history: For pediatric patients, information about their growth and development

10. Feeding history: For infants or patients with eating concerns, details about diet and nutrition

11. Immunization history: Record of vaccinations

12. Family history: Health conditions that run in the family

13. Social history: Lifestyle factors, occupation, living situation

### Location-Specific Questions:
Based on the patient's location in the hospital, ask relevant questions that are specific to their department. For example:
- Surgery Department: Ask about previous surgeries, current symptoms related to surgical conditions, and specific pre-surgical evaluations.
- Emergency Department: Focus on immediate symptoms, trauma history, and rapid assessment of vital signs.

### Type-Specific Questions:
Depending on the type of triage:
- Focused: Ask detailed questions related to the presenting complaint and delve deeply into the patient's history and symptoms.
- Emergency: Ask only the most relevant questions to quickly assess the patient’s condition and prioritize urgent needs.

After gathering all relevant information, provide a brief summary of the key points from the patient's history and differential diagnosis with percentages. never spend too much time clerking

Remember to:
- Use simple, clear language
- Be patient and allow time for responses
- Show empathy and understanding
- Respect patient privacy and confidentiality
- Clarify any confusing or conflicting information
- Adapt your questions based on the patient's age and specific situation

Your goal is to gather comprehensive information while ensuring the patient feels heard, respected, and comfortable throughout the interaction and make some differential diagnosis at the end.

do not repeat the conversation when giving a response the converstation is just to guide you.

Do not repeat what is in the converstation
Conversation history:
${conversationHistory}

Settings:
${settings}

Healthcare Assistant:
`;

    let assistantContent = "";
    let attempts = 0;

    while (attempts < MAX_RETRIES && !assistantContent) {
      attempts++;
      console.log(`Attempt ${attempts} to generate response`);

      // Generate content with the AI model
      const result = await model.generateContent([
        // {
        //   fileData: {
        //     mimeType: fileData.mimeType,
        //     fileUri: fileData.fileUri,
        //   },
        // },
        prompt,
      ]);

      assistantContent =
        result.response.candidates?.[0]?.content?.parts[0]?.text || "";
    }

    if (!assistantContent) {
      assistantContent =
        "No response from the assistant after several attempts.";
    }

    console.log(assistantContent);

    const assistantMessage = {
      role: "assistant",
      content: assistantContent,
    };

    return  res.status(200).json({data: assistantMessage, cache: "" });
  }catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  })

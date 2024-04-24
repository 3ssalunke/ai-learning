import { Configuration, OpenAIApi } from "openai-edge";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

interface OutputFormat {
  [key: string]: string | string[] | OutputFormat;
}

export async function strictOutput(
  systemPrompt: string,
  userPrompt: string | string[],
  outputFormat: OutputFormat,
  defaultCategory: string = "",
  outputValueOnly: boolean = false,
  model: string = "gpt-3.5-turbo",
  temperature: number = 1,
  numOfTries: number = 3,
  verbose: boolean = false
) {
  const listInput = Array.isArray(userPrompt);
  const dynamicElements = /<.*?/.test(JSON.stringify(outputFormat));
  const listOutput = /\[.*?\]/.test(JSON.stringify(outputFormat));

  let errMsg = "";

  for (let i = 0; i < numOfTries; i++) {
    let outputFormatPrompt = `\nYou are to output ${
      listOutput && "an array of objects in"
    } the following in json format: ${JSON.stringify(
      outputFormat
    )}. \nDo not put quotation marks or escape characters \\ in the output fields.`;

    if (listOutput) {
      outputFormatPrompt += `\nIf output field is a list, classify output into the best element of the list.`;
    }

    if (dynamicElements) {
      outputFormatPrompt += `\nAny text enclosed by < and > indicates you must generate content to replace it. Example input: Go to <location>, Example output: Go to the garden\nAny output key containing < and > indicates you must gererate the key name to replace it. Example input: {'<location>': 'description of location'}, Example output {school: a place for education}`;
    }

    if (listInput) {
      outputFormatPrompt += `\nGenerate an array of json, one json for each input element.`;
    }

    const response = await openai.createChatCompletion({
      temperature,
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt + outputFormatPrompt + errMsg,
        },
        {
          role: "user",
          content: userPrompt.toString(),
        },
      ],
    });
    const result = await response.json();
    let res = result.choices[0].message?.content?.replace(/'/g, '"') ?? "";
    res = res.replace(/(\w)"(\w)/g, "$1'$2");
    if (verbose) {
      console.log("System Prompt:", systemPrompt + outputFormatPrompt + errMsg);
      console.log("\nUser Prompt:", userPrompt);
      console.log("\nGPT Response:", res);
    }

    try {
      let output = JSON.parse(res);

      if (listInput) {
        if (!Array.isArray(output)) {
          throw new Error("Ouput format not in an array of json");
        }
      } else {
        output = [output];
      }

      for (let index = 0; index < output.length; index++) {
        for (const key in outputFormat) {
          if (/<.*?>/.test(key)) {
            continue;
          }

          if (!(key in output[index])) {
            throw new Error(`${key} not in json output`);
          }

          if (Array.isArray(outputFormat[key])) {
            const choices = outputFormat[key] as string[];
            if (Array.isArray(output[index][key])) {
              output[index][key] = output[index][key][0];
            }
            if (!choices.includes(output[index][key]) && defaultCategory) {
              output[index][key] = defaultCategory;
            }
            if (output[index][key].includes(":")) {
              output[index][key] = output[index][key].split(":")[0];
            }
          }
        }

        if (outputValueOnly) {
          output[index] = Object.values(output[index]);
          if (output[index].length === 1) {
            output[index] = output[index][0];
          }
        }
      }

      return listInput ? output : output[0];
    } catch (error) {
      errMsg = `\n\nResult:${res}\n\nError message: ${error}`;
      console.error("An exception occured:", error);
      console.error("Current invalid json format", res);
    }
  }

  throw new Error("error getting response from gpt");
}

export async function getQuestionsFromTranscript(
  transcript: string,
  chapterTitle: string
): Promise<
  {
    question: string;
    answer: string;
    option1: string;
    option2: string;
    option3: string;
  }[]
> {
  const res = await strictOutput(
    "You are a helpful AI that is able to generate mcq questions and answers, the length of each answer should not be more than 15 words",
    new Array(5).fill(
      `You are to generate a random hard mcq question about ${chapterTitle} with context of the following transcript: ${transcript}`
    ),
    {
      question: "question",
      answer: "answer with max length of 15 words",
      option1: "option1 with max length of 15 words",
      option2: "option2 with max length of 15 words",
      option3: "option3 with max length of 15 words",
    }
  );
  return res;
}

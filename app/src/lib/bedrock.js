import {
  BedrockRuntimeClient,
  ConverseCommand,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { fromSSO } from "@aws-sdk/credential-provider-sso";
import { defaultProvider } from "@aws-sdk/credential-provider-node";

if (!process.env.COMPLETION_MODEL_ID) {
  throw new Error(
    'Invalid/Missing environment variable: "COMPLETION_MODEL_ID"'
  );
}

if (!process.env.EMBEDDING_MODEL_ID) {
  throw new Error('Invalid/Missing environment variable: "EMBEDDING_MODEL_ID"');
}

if (!process.env.AWS_REGION) {
  throw new Error('Invalid/Missing environment variable: "AWS_REGION"');
}

if (!process.env.AWS_PROFILE) {
  throw new Error('Invalid/Missing environment variable: "AWS_PROFILE"');
}

if (!process.env.NEXT_PUBLIC_ENV) {
  throw new Error('Invalid/Missing environment variable: "NEXT_PUBLIC_ENV"');
}

const COMPLETION_MODEL_ID = process.env.COMPLETION_MODEL_ID;
const EMBEDDING_MODEL_ID = process.env.EMBEDDING_MODEL_ID;
const AWS_REGION = process.env.AWS_REGION;
const AWS_PROFILE = process.env.AWS_PROFILE;
const ENV = process.env.NEXT_PUBLIC_ENV;

let bedrockClient;
function getBedrockClient() {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials:
        ENV == "production"
          ? defaultProvider()
          : fromSSO({ profile: AWS_PROFILE }),
    });
  }
  return bedrockClient;
}

export async function getGeneratedCriteria(userPrompt) {
  const systemPrompt = `
    You are an expert in inventory optimization. 
    You are defining new criteria for improving inventory classification.
    The resulting criteria will be added as a feature to perform Multi Criteria Inventory Classification (MCIC) for ABC analysis.
    The user will provide a prompt describing the high level reasoning of the new criteria to add.
    The definition is used to assign quantitative scores to qualitative criteria defined by the user prompt.
    Higher scores should be assigned to those items that need closer control by inventory.
    Consider the data sources that will be used to extract the information required.

      Here is an example of a criteria definition:
      {
        criteriaName: "Criticality",
        criteriaDefinition: "
        The scoring will be based on: 
        - IMPACT: The impact upon integrated operations.
        - SCARCITY: The possible scarcity of supply.
        - SUBSTITUTES: Existence (or not) of substitutes.

        Scoring Scale:
        - A value of 1 would indicate a very critical item.
        - A value of 0.50 would indicate a moderately critical item.
        - A value of 0.01 would indicate a non-critical item.
        "
        dataSources: []
      }
  `;

  const input = {
    modelId: COMPLETION_MODEL_ID,
    messages: [
      {
        role: "user",
        content: [
          {
            text: userPrompt,
          },
        ],
      },
    ],
    system: [
      {
        text: systemPrompt,
      },
    ],
    inferenceConfig: {
      maxTokens: 1000,
      temperature: 0.7,
    },
    toolConfig: {
      tools: [
        {
          toolSpec: {
            name: "criteriaGenerator", // Tool name
            description:
              "Generates criteria definitions to incorporate in Inventory Classification analysis.",
            inputSchema: {
              json: {
                type: "object",
                properties: {
                  criteriaName: {
                    type: "string",
                    description:
                      "The name of the data criteria to fetch. Short name of a maximum of 3 words.",
                  },
                  criteriaDefinition: {
                    type: "string",
                    description:
                      "A definition of the criteria to establish a numeric scale.",
                  },
                  dataSources: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["reviews", "products"],
                    },
                    description:
                      "List of data sources that can be used to extract information relevant to the criteria.",
                  },
                },
                required: ["criteriaName", "criteriaDefinition", "dataSources"],
              },
            },
          },
        },
      ],
      toolChoice: {
        tool: {
          name: "criteriaGenerator", // Use the criteriaGenerator tool
        },
      },
    },
  };

  const command = new ConverseCommand(input);

  try {
    const client = getBedrockClient();
    const response = await client.send(command);

    const toolResult = response.output?.message?.content?.[0]?.toolUse?.input;
    if (toolResult) {
      return toolResult;
    } else {
      throw new Error("Tool execution failed or no result found");
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export async function generateEmbedding(text) {
  const payload = {
    texts: [text],
    input_type: "search_query",
    embedding_types: ["float"],
  };

  const input = {
    body: JSON.stringify(payload),
    modelId: EMBEDDING_MODEL_ID,
    accept: "*/*",
    contentType: "application/json",
  };

  try {
    const client = getBedrockClient();

    const command = new InvokeModelCommand(input);
    const response = await client.send(command);

    const responseText = new TextDecoder().decode(response.body);
    const embedding = JSON.parse(responseText).embeddings.float[0];

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

export async function getCriteriaScore(criteriaDescription, reviews) {
  const reviewTexts = JSON.stringify(reviews, null, 2);

  const systemPrompt = `
  You are an expert in inventory optimization. 
  You are assigning a numeric score to an item based on the scoring scale of the criteria defintion.
  Additional context is provided in the form of reviews for the item.
  The resulting score will be used to perform Multi Criteria Inventory Classification (MCIC) for ABC analysis.
  `;

  const userPrompt = `
  Assign a score to the item based on the following criteria:

  ${criteriaDescription}

  Use the following data as context to make an informed decision:

  REVIEWS
  ${reviewTexts}
  `;

  const input = {
    modelId: COMPLETION_MODEL_ID,
    messages: [
      {
        role: "user",
        content: [
          {
            text: userPrompt,
          },
        ],
      },
    ],
    system: [
      {
        text: systemPrompt,
      },
    ],
    inferenceConfig: {
      maxTokens: 100,
      temperature: 0.5,
    },
    toolConfig: {
      tools: [
        {
          toolSpec: {
            name: "assignScore", // Tool name
            description: "Assign a score to an item from the scoring scale.",
            inputSchema: {
              json: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "The numeric score assigned to the item.",
                  },
                },
                required: ["score"],
              },
            },
          },
        },
      ],
      toolChoice: {
        tool: {
          name: "assignScore", // Use the criteriaGenerator tool
        },
      },
    },
  };

  const command = new ConverseCommand(input);

  try {
    const client = getBedrockClient();
    const response = await client.send(command);
    const toolResult = response.output?.message?.content?.[0]?.toolUse?.input;

    if (toolResult) {
      return parseFloat(toolResult.score) || 0;
    } else {
      throw new Error("Tool execution failed or no result found");
    }
  } catch (error) {
    console.error("Error getting criteria score:", error);
    return 0;
  }
}

import { NextResponse } from "next/server";
import getMongoClientPromise, { vectorSearch } from "@/lib/mongodb";
import { generateEmbedding, getCriteriaScore } from "@/lib/bedrock";

export async function POST(req) {
  try {
    if (!process.env.DATABASE_NAME) {
      throw new Error('Invalid/Missing environment variable: "DATABASE_NAME"');
    }

    const database = process.env.DATABASE_NAME;

    const { criteriaField, criteriaDefinition } = await req.json();

    if (!criteriaField || !criteriaDefinition) {
      return NextResponse.json(
        { error: "Missing criteria details" },
        { status: 400 }
      );
    }

    // Establish MongoDB connection
    const client = await getMongoClientPromise();
    const db = client.db(database);
    const datasetCollection = db.collection("dataset");

    // Step 1: Fetch all products from the dataset collection
    const products = await datasetCollection
      .find({}, { productId: 1 })
      .toArray();

    // Step 2: Generate embedding for the criteria definition
    const criteriaEmbedding = await generateEmbedding(criteriaDefinition);

    //Step 3: Process each product in parallel
    const updatedProducts = await Promise.all(
      products.map(async (product) => {
        try {
          // Step 3.1: Perform vector search to find top N relevant reviews
          const relevantReviews = await vectorSearch(
            criteriaEmbedding,
            product.productId
          );

          // Step 3.2: Use LLM to score the product based on criteria and reviews
          const criteriaScore = await getCriteriaScore(
            criteriaDefinition,
            relevantReviews
          );

          return {
            updateOne: {
              filter: { _id: product._id },
              update: { $set: { [criteriaField]: criteriaScore } },
            },
          };
        } catch (error) {
          console.error(`Error processing product ${product._id}:`, error);
          return null;
        }
      })
    );

    // Remove null values (in case some failed)
    const bulkOperations = updatedProducts.filter((op) => op !== null);

    // Step 4: Perform a bulk update in MongoDB
    if (bulkOperations.length > 0) {
      await datasetCollection.bulkWrite(bulkOperations);
    }

    return NextResponse.json({
      message: "Criteria scores updated successfully!",
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

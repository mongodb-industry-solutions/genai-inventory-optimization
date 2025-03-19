import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}
if (!process.env.DATABASE_NAME) {
  throw new Error('Invalid/Missing environment variable: "DATABASE_NAME"');
}

const uri = process.env.MONGODB_URI;
const database = process.env.DATABASE_NAME;
const options = { appName: "genai-inventory-optimization" };

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
  global._mongoClientPromise = clientPromise;
} else {
  clientPromise = global._mongoClientPromise;
}

export async function vectorSearch(criteriaEmbedding, productId) {
  try {
    const client = await clientPromise;
    const db = client.db(database);
    const reviewsCollection = db.collection("reviews");

    const relevantReviews = await reviewsCollection
      .aggregate([
        {
          $vectorSearch: {
            filter: { productId: productId },
            index: "default",
            path: "emb",
            queryVector: criteriaEmbedding,
            numCandidates: 50,
            limit: 5,
          },
        },
        {
          $project: {
            _id: 0,
            score: 1,
            title: 1,
            message: 1,
          },
        },
      ])
      .toArray();

    return relevantReviews;
  } catch (error) {
    console.error(
      `Error performing vector search for product ${productId}:`,
      error
    );
    throw error;
  }
}

export { clientPromise };

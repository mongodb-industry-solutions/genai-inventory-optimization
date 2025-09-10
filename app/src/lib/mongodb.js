import { MongoClient } from "mongodb";

let client;
let clientPromise;

function loadMongoEnv() {
  const { MONGODB_URI, DATABASE_NAME } = process.env;
  const missing = [];
  if (!MONGODB_URI) missing.push("MONGODB_URI");
  if (!DATABASE_NAME) missing.push("DATABASE_NAME");
  if (missing.length) {
    throw new Error(
      `Missing required MongoDB environment variables at runtime: ${missing.join(
        ", "
      )}`
    );
  }
  return { MONGODB_URI, DATABASE_NAME };
}

function createMongoClient() {
  const { MONGODB_URI } = loadMongoEnv();
  const options = {
    appName: "genai-inventory-optimization",
  };
  return new MongoClient(MONGODB_URI, options);
}

export function getMongoClientPromise() {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = createMongoClient();
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = createMongoClient();
      clientPromise = client.connect();
    }
  }
  return clientPromise;
}

export async function closeMongoClient() {
  if (client) {
    await client.close();
    client = undefined;
    clientPromise = undefined;
    if (global._mongoClientPromise) {
      global._mongoClientPromise = undefined;
    }
  }
}

export async function vectorSearch(criteriaEmbedding, productId) {
  try {
    const { DATABASE_NAME } = loadMongoEnv();
    const client = await getMongoClientPromise();
    const db = client.db(DATABASE_NAME);
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

export default getMongoClientPromise;

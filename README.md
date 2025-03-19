# GenAI Inventory Optimization

This project leverages GenAI and agentic workflows to improve inventory optimization. The solution includes a demonstration on how to define criteria and extract features using GenAI and Atlas Vector Search for Multi-Criteria Inventory Classification (MCIC), particularly multi-criteria ABC analysis. Atlas Vector Search allows you to navigate and extract useful information for inventory classification from unstructured data, such as user reviews or forum posts on the web. MongoDB enables you to store your operational data, metadata, and vector data together, making it easier to leverage all data and incorporate it into your inventory operations. Other features such as Time Series collections or analytics nodes help to take your operations to the next level in terms of scale and efficiency.

## Where MongoDB Shines

- **Atlas Vector Search**: Navigate and extract useful information from unstructured data for inventory classification.
- **Operational Data Storage**: Store operational data, metadata, and vector data together.
- **Time Series Collections**: Enhance operations with time series data.
- **Analytics Nodes**: Improve scale and efficiency with dedicated analytics nodes.

Learn more about MongoDB [here](https://www.mongodb.com/).

## High Level Architecture

-- TODO

## Tech Stack

- Next.js for the frontend and server-side processing.
- MongoDB Atlas for the database.
- AWS Bedrock for the LLM adn embeddings provider.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- MongoDB Atlas Cluster
- Node.js 14 or higher

## Run it locally

1. Navigate to the `app` folder.
2. Install dependencies by running:
   ```sh
   npm install
   ```
3. Start the frontend development server with:
   ```sh
   npm run dev
   ```
4. The frontend will now be accessible at [http://localhost:3000](http://localhost:3000) by default, providing a user interface.

## Common errors

Check that you've created an `app/.env.local` file that contains your valid (and working) API keys, environment, and index variables.

# RetailMind AI

RetailMind is an AI-powered inventory intelligence platform designed for the Indian Kirana and Quick Commerce ecosystem. This project was built for the **AI for Bharat Hackathon** and features a completely Serverless AWS architecture powered by Amazon Bedrock for Generative AI insights.

## Architecture

This project has been migrated from a local Python/FastAPI prototype to a highly scalable, enterprise-grade **Java/Spring Boot** infrastructure deployed on AWS.

*   **Compute:** AWS Lambda (running Java 17 via Spring Cloud Function)
*   **Database:** Amazon DynamoDB (Single-Table inspired NoSQL design for high-scale Kirana transactions)
*   **GenAI Engine:** Amazon Bedrock (invoking Anthropic Claude 3 Haiku for dynamic inventory recommendations)
*   **Frontend:** React + Vite + TypeScript (Hosted on Amazon S3 / Amplify)
*   **Infrastructure as Code:** AWS SAM (`template.yaml`)

## Features

1.  **AI Inventory Insights:** Uses Claude 3 Haiku to evaluate stock levels versus daily demand, generating clear, plain-text business reasoning for Kirana owners on whether to reorder, wait, or discount items.
2.  **Serverless Scalability:** The Spring Boot backend is packaged as an AWS Lambda function, meaning it scales automatically to zero when unused and can handle massive traffic spikes during Indian festivals without server management.
3.  **Fast NoSQL Data Layer:** DynamoDB stores `Store`, `SKU`, and `InventoryItem` data, replacing the local SQLite file for genuine cloud-native persistence.

## Project Structure

```text
RetailMind/
├── backend/                  # Java 17 Spring Boot Application
│   ├── src/main/java...      # Hexagonal Architecture (Domain/Application/Infrastructure)
│   └── pom.xml               # Maven configuration for AWS Lambda & SDK v2
├── frontend/                 # React frontend (Vite/TypeScript)
│   ├── src/pages/            # Dashboard UI
│   └── src/services/         # API Integration layer
├── template.yaml             # AWS SAM template for API Gateway & Lambda deployment
└── .kiro/                    # Original project specifications
```

## Running the Application

### 1. Prerequisites
*   Java 17 & Maven
*   Node.js 18+
*   AWS CLI configured with a profile that has access to Amazon Bedrock and DynamoDB.

### 2. Run the Java Backend Locally
First, ensure you have your AWS credentials exported to your environment so the AWS SDK can locate them.

```bash
cd backend
mvn clean install
mvn spring-boot:run
```
The API will start at `http://localhost:8080`.

### 3. Run the React Frontend

```bash
cd frontend
npm install
npm run dev
```
The dashboard will open at `http://localhost:5173`.

### 4. Testing the MVP Demo
1. Open the React frontend.
2. Click **"Initialize Mock Data (DynamoDB)"**. This hits the `/api/v1/data/init-tables` and `seed` endpoints to create DynamoDB tables in your AWS account and populate them with sample FMCG items (e.g., Parle-G, Amul Butter).
3. Click **"Run Bedrock AI Analysis"**. This fetches the current stock, calculates risk, and sends the context to Claude via Amazon Bedrock to generate dynamic text recommendations.

## Deploying to AWS

Use the AWS Serverless Application Model (SAM) CLI to deploy the backend:

```bash
sam build
sam deploy --guided
```
This will read the `template.yaml`, package the Spring Boot JAR, and deploy it to a new AWS Lambda function and API Gateway. Follow the prompts to set the stack name and confirm IAM roles.

## License
MIT License

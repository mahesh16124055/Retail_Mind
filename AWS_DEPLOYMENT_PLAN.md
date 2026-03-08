# RetailMind: Optimal $100 AWS Deployment Strategy

Congratulations on receiving the $100 AWS credits! $100 is plenty for a hackathon prototype, provided we use **Serverless** technologies precisely to avoid paying for idle time.

Here is the exact action plan to deploy the Java/Spring Boot application and React frontend while maximizing your credits.

## 1. Local AWS Configuration (Free)
Before touching the cloud, you must link your local computer to your AWS account.
1. Download and install the [AWS CLI](https://aws.amazon.com/cli/).
2. In your AWS Console, create an IAM User with **AdministratorAccess**. Generate an Access Key.
3. Open your terminal and run:
   ```bash
   aws configure
   ```
   Paste your Access Key, Secret Key, and set your default region (e.g., `us-east-1`).

## 2. Enable Amazon Bedrock Models (Free to Enable, Pay-Per-Token)
The AI recommendations rely on Anthropic's Foundation Models.
1. Go to the **Amazon Bedrock** console in AWS.
2. Under "Model Access" on the left panel, click "Manage Model Access".
3. Request access to **Anthropic Claude 3 Haiku**. 
   * **Cost Control Strategy:** We chose *Haiku* instead of *Sonnet* because it is exceptionally fast and costs a fraction of a cent per request ($0.25 per 1 Million Input Tokens / $1.25 per 1 Million Output Tokens). Your $100 credits will easily cover tens of thousands of dynamic inventory recommendations.

## 3. Deploy the Backend Database & API (~$0.00 if under Free Tier)
We will use AWS Serverless Application Model (SAM) to deploy. Because we are using Lambda, API Gateway, and DynamoDB, you only pay for what you use. No traffic = No cost.
1. Install the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
2. Navigate to your project root (where `template.yaml` is) and run:
   ```bash
   sam build
   sam deploy --guided
   ```
3. Follow the CLI prompts. Accept the defaults, and say `Y` to "Allow SAM CLI IAM role creation".
4. When it finishes, it will output an `ApiURL` (e.g., `https://xyz.execute-api.us-east-1.amazonaws.com/Prod/`). **Copy this URL.**
   * **Cost Control Strategy:** DynamoDB is entirely serverless (On-Demand capacity). AWS Lambda charges strictly by execution milliseconds. If nobody is using the app, you pay $0.

## 4. Deploy the React Frontend (~$0.50/month)
We will host the React app securely via Amazon S3. 
1. Open the `.env` file in your `/frontend` directory. Add the API URL you copied from Step 3:
   `VITE_API_URL=https://xyz.execute-api.us-east-1.amazonaws.com/Prod/api/v1`
2. Run the build command:
   ```bash
   cd frontend
   npm run build
   ```
3. Create an Amazon S3 Bucket in the AWS Console (e.g., `retailmind-hackathon-ui`).
4. Enable "Static Website Hosting" on the S3 bucket and turn off "Block Public Access". Add a permissive bucket policy allowing `s3:GetObject`.
5. Upload the contents of the `frontend/dist/` folder into that bucket.
   * **Cost Control Strategy:** S3 static hosting costs mere pennies. Do *not* run the frontend on an EC2 instance, which would cost ~$10-15/month continuously.

## 5. Hackathon Form Submission & Video
1. Use the public S3 URL as your **"Working Prototype Link"** for step 3 of your hackathon form.
2. Record your **Demo Video** by clicking the "Initialize Mock Data" on your live site, and then generating the Bedrock insights. 

---

### ⚠️ IMPORTANT: Cost Protections
* **DO NOT** launch Amazon RDS (Relational Databases) or Amazon EC2 instances. Those run 24/7 and will drain your $100 credits quickly. Stick to our DynamoDB and Lambda setup.
* **DO NOT** use Claude 3 Opus. Stick to Haiku for development and the demo.
* Set up a **Billing Alarm** in AWS Budgets to alert your email if spending exceeds $10.

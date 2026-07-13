import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedQuestion = {
  domain: "CLOUD_CONCEPTS" | "ARCHITECTURE_SERVICES" | "MANAGEMENT_GOVERNANCE";
  prompt: string;
  choices: { id: string; text: string }[];
  correctChoiceId: string;
  explanation: string;
};

const questions: SeedQuestion[] = [
  // ---- Cloud Concepts ----
  {
    domain: "CLOUD_CONCEPTS",
    prompt: "A company wants a system that automatically adds and removes compute resources as demand rises and falls throughout the day. Which cloud characteristic does this describe?",
    choices: [
      { id: "a", text: "Elasticity" },
      { id: "b", text: "Fault tolerance" },
      { id: "c", text: "Predictability" },
      { id: "d", text: "Governance" },
    ],
    correctChoiceId: "a",
    explanation: "Elasticity is the ability to automatically scale resources up or down to match current demand. Scalability, by contrast, refers to the capacity to add resources at all, without the automatic in/out behavior.",
  },
  {
    domain: "CLOUD_CONCEPTS",
    prompt: "Which pricing model best describes the cloud's consumption-based cost structure?",
    choices: [
      { id: "a", text: "Fixed annual licensing" },
      { id: "b", text: "Pay only for the resources you use" },
      { id: "c", text: "One-time perpetual purchase" },
      { id: "d", text: "Per-employee subscription regardless of usage" },
    ],
    correctChoiceId: "b",
    explanation: "Cloud computing follows an operational expenditure (OpEx) model: you pay for what you consume, rather than a large upfront capital expenditure (CapEx) for hardware.",
  },
  {
    domain: "CLOUD_CONCEPTS",
    prompt: "A startup rents virtual machines and manages the OS, runtime, and applications themselves, while the provider manages the physical hardware and hypervisor. Which service model is this?",
    choices: [
      { id: "a", text: "SaaS" },
      { id: "b", text: "PaaS" },
      { id: "c", text: "IaaS" },
      { id: "d", text: "FaaS" },
    ],
    correctChoiceId: "c",
    explanation: "IaaS (Infrastructure as a Service) gives customers control over the OS and above, while the provider handles physical infrastructure, storage, and networking hardware.",
  },
  {
    domain: "CLOUD_CONCEPTS",
    prompt: "A development team wants to deploy code without managing servers, OS patching, or runtime configuration. Which service model fits best?",
    choices: [
      { id: "a", text: "IaaS" },
      { id: "b", text: "PaaS" },
      { id: "c", text: "On-premises" },
      { id: "d", text: "Colocation" },
    ],
    correctChoiceId: "b",
    explanation: "PaaS (Platform as a Service) abstracts away the underlying OS and runtime so developers can focus purely on code, such as with Azure App Service.",
  },
  {
    domain: "CLOUD_CONCEPTS",
    prompt: "Which deployment model keeps all resources within an organization's own datacenter, with no reliance on a public cloud provider?",
    choices: [
      { id: "a", text: "Public cloud" },
      { id: "b", text: "Hybrid cloud" },
      { id: "c", text: "Private cloud" },
      { id: "d", text: "Multi-cloud" },
    ],
    correctChoiceId: "c",
    explanation: "A private cloud is dedicated to a single organization, typically hosted on-premises or in a dedicated environment, and is not shared with other tenants.",
  },
  {
    domain: "CLOUD_CONCEPTS",
    prompt: "Under the shared responsibility model, who is always responsible for securing customer data, regardless of the service model chosen?",
    choices: [
      { id: "a", text: "The cloud provider" },
      { id: "b", text: "The customer" },
      { id: "c", text: "A third-party auditor" },
      { id: "d", text: "No one; it is automatic" },
    ],
    correctChoiceId: "b",
    explanation: "Across IaaS, PaaS, and SaaS, the customer always retains responsibility for their data, identities, and access management, even though the provider secures more of the stack as you move toward SaaS.",
  },
  {
    domain: "CLOUD_CONCEPTS",
    prompt: "A company needs its application to keep running even if an entire datacenter fails. Which cloud benefit are they prioritizing?",
    choices: [
      { id: "a", text: "High availability" },
      { id: "b", text: "Agility" },
      { id: "c", text: "Cost predictability" },
      { id: "d", text: "Elasticity" },
    ],
    correctChoiceId: "a",
    explanation: "High availability is the ability to keep a service running for a high percentage of time, often achieved by distributing resources across multiple datacenters or regions.",
  },
  {
    domain: "CLOUD_CONCEPTS",
    prompt: "Which term describes the ability to rapidly develop, test, and launch software without lengthy procurement and provisioning delays?",
    choices: [
      { id: "a", text: "Agility" },
      { id: "b", text: "Reliability" },
      { id: "c", text: "Fault domain" },
      { id: "d", text: "Governance" },
    ],
    correctChoiceId: "a",
    explanation: "Agility refers to the speed at which cloud resources can be provisioned and reconfigured, letting teams move from idea to production much faster than with traditional infrastructure.",
  },
  {
    domain: "CLOUD_CONCEPTS",
    prompt: "A retail company uses its own servers for stable, everyday workloads but bursts into a public cloud provider during the holiday shopping season. What is this architecture called?",
    choices: [
      { id: "a", text: "Private cloud" },
      { id: "b", text: "Hybrid cloud" },
      { id: "c", text: "Community cloud" },
      { id: "d", text: "Public cloud" },
    ],
    correctChoiceId: "b",
    explanation: "A hybrid cloud combines private (or on-premises) infrastructure with public cloud resources, often used for 'cloud bursting' scenarios like seasonal demand spikes.",
  },
  {
    domain: "CLOUD_CONCEPTS",
    prompt: "Which of the following is an example of SaaS?",
    choices: [
      { id: "a", text: "A virtual machine you configure yourself" },
      { id: "b", text: "A managed database platform you deploy code to" },
      { id: "c", text: "A fully managed email and productivity suite like Microsoft 365" },
      { id: "d", text: "A raw storage account" },
    ],
    correctChoiceId: "c",
    explanation: "SaaS (Software as a Service) delivers a complete, ready-to-use application to end users, with the provider managing everything underneath, including the application itself.",
  },

  // ---- Azure Architecture and Services ----
  {
    domain: "ARCHITECTURE_SERVICES",
    prompt: "What is the term for a set of datacenters deployed within a latency-defined perimeter and connected through a dedicated regional low-latency network?",
    choices: [
      { id: "a", text: "Availability zone" },
      { id: "b", text: "Azure region" },
      { id: "c", text: "Resource group" },
      { id: "d", text: "Management group" },
    ],
    correctChoiceId: "b",
    explanation: "An Azure region is a geographic area containing one or more datacenters that are networked together with low latency, forming the basic building block of Azure's global infrastructure.",
  },
  {
    domain: "ARCHITECTURE_SERVICES",
    prompt: "Which Azure infrastructure feature consists of physically separate locations within an Azure region, each with independent power, cooling, and networking?",
    choices: [
      { id: "a", text: "Region pair" },
      { id: "b", text: "Availability zone" },
      { id: "c", text: "Resource group" },
      { id: "d", text: "Subscription" },
    ],
    correctChoiceId: "b",
    explanation: "Availability zones are physically separate datacenters within a region, so a failure in one zone (power, cooling, networking) is unlikely to affect the others.",
  },
  {
    domain: "ARCHITECTURE_SERVICES",
    prompt: "Which container is used purely to logically organize and manage related Azure resources, such as all resources for one project, without affecting billing boundaries?",
    choices: [
      { id: "a", text: "Subscription" },
      { id: "b", text: "Management group" },
      { id: "c", text: "Resource group" },
      { id: "d", text: "Tenant" },
    ],
    correctChoiceId: "c",
    explanation: "A resource group is a logical container that holds related resources for a solution, making it easier to manage, monitor, and delete them together.",
  },
  {
    domain: "ARCHITECTURE_SERVICES",
    prompt: "A large enterprise wants to apply a single compliance policy across dozens of subscriptions at once. Which construct should they use?",
    choices: [
      { id: "a", text: "Resource group" },
      { id: "b", text: "Management group" },
      { id: "c", text: "Availability set" },
      { id: "d", text: "Virtual network" },
    ],
    correctChoiceId: "b",
    explanation: "Management groups sit above subscriptions in the hierarchy, letting organizations apply policies and access controls across many subscriptions at once.",
  },
  {
    domain: "ARCHITECTURE_SERVICES",
    prompt: "Which Azure service lets a company run application code in response to events without provisioning or managing any servers?",
    choices: [
      { id: "a", text: "Azure Virtual Machines" },
      { id: "b", text: "Azure Functions" },
      { id: "c", text: "Azure Virtual Machine Scale Sets" },
      { id: "d", text: "Azure Bastion" },
    ],
    correctChoiceId: "b",
    explanation: "Azure Functions is a serverless compute service: you provide the code, and Azure handles provisioning, scaling, and running it in response to triggers.",
  },
  {
    domain: "ARCHITECTURE_SERVICES",
    prompt: "Which storage option is best suited for storing unstructured data such as images, video, and log files?",
    choices: [
      { id: "a", text: "Azure Blob Storage" },
      { id: "b", text: "Azure SQL Database" },
      { id: "c", text: "Azure Table Storage" },
      { id: "d", text: "Azure Files" },
    ],
    correctChoiceId: "a",
    explanation: "Blob Storage is Azure's object storage solution, purpose-built for massive amounts of unstructured data like documents, media files, and backups.",
  },
  {
    domain: "ARCHITECTURE_SERVICES",
    prompt: "A company needs a private, dedicated, low-latency connection between its on-premises network and Azure that does not travel over the public internet. Which service should they use?",
    choices: [
      { id: "a", text: "Azure VPN Gateway" },
      { id: "b", text: "Azure ExpressRoute" },
      { id: "c", text: "Azure DNS" },
      { id: "d", text: "Azure Front Door" },
    ],
    correctChoiceId: "b",
    explanation: "ExpressRoute provides a private, dedicated connection to Azure that bypasses the public internet, offering more reliability and lower latency than a standard VPN.",
  },
  {
    domain: "ARCHITECTURE_SERVICES",
    prompt: "Which storage access tier is designed for data that is rarely accessed and can tolerate several hours of retrieval latency, at the lowest storage cost?",
    choices: [
      { id: "a", text: "Hot tier" },
      { id: "b", text: "Cool tier" },
      { id: "c", text: "Archive tier" },
      { id: "d", text: "Premium tier" },
    ],
    correctChoiceId: "c",
    explanation: "The Archive tier offers the lowest storage cost but the highest retrieval latency (often hours), making it ideal for long-term data like compliance logs that are almost never accessed.",
  },
  {
    domain: "ARCHITECTURE_SERVICES",
    prompt: "Which Azure identity service is used to manage users, groups, and authentication, including single sign-on and multifactor authentication?",
    choices: [
      { id: "a", text: "Microsoft Entra ID" },
      { id: "b", text: "Azure Key Vault" },
      { id: "c", text: "Azure Policy" },
      { id: "d", text: "Azure Monitor" },
    ],
    correctChoiceId: "a",
    explanation: "Microsoft Entra ID (formerly Azure Active Directory) is Azure's identity and access management service, handling authentication, SSO, and MFA.",
  },
  {
    domain: "ARCHITECTURE_SERVICES",
    prompt: "A team wants to run several containerized microservices with automatic scaling and orchestration, without managing Kubernetes control-plane infrastructure themselves. Which service fits best?",
    choices: [
      { id: "a", text: "Azure Kubernetes Service (AKS)" },
      { id: "b", text: "Azure Virtual Machines" },
      { id: "c", text: "Azure Files" },
      { id: "d", text: "Azure Bastion" },
    ],
    correctChoiceId: "a",
    explanation: "AKS is a managed Kubernetes service; Azure operates the control plane, so teams can focus on deploying and scaling their containerized workloads.",
  },

  // ---- Management and Governance ----
  {
    domain: "MANAGEMENT_GOVERNANCE",
    prompt: "Which tool lets an organization create rules that enforce standards, such as requiring a specific region for all new resources?",
    choices: [
      { id: "a", text: "Azure Policy" },
      { id: "b", text: "Azure Monitor" },
      { id: "c", text: "Azure Advisor" },
      { id: "d", text: "Azure Cost Management" },
    ],
    correctChoiceId: "a",
    explanation: "Azure Policy evaluates resources against defined rules and can deny, audit, or remediate non-compliant resources, such as blocking deployments outside an approved region.",
  },
  {
    domain: "MANAGEMENT_GOVERNANCE",
    prompt: "Which feature allows granting a user only the specific permissions they need, such as 'read-only access to one resource group,' following the principle of least privilege?",
    choices: [
      { id: "a", text: "Role-Based Access Control (RBAC)" },
      { id: "b", text: "Azure Blueprints" },
      { id: "c", text: "Azure Policy" },
      { id: "d", text: "Azure Monitor" },
    ],
    correctChoiceId: "a",
    explanation: "RBAC assigns specific roles (like Reader, Contributor, or Owner) to users or groups at a particular scope, enforcing least-privilege access.",
  },
  {
    domain: "MANAGEMENT_GOVERNANCE",
    prompt: "Which tool estimates the cost of a proposed Azure architecture before it is deployed?",
    choices: [
      { id: "a", text: "Azure Pricing Calculator" },
      { id: "b", text: "Azure Cost Management + Billing" },
      { id: "c", text: "Total Cost of Ownership (TCO) Calculator" },
      { id: "d", text: "Azure Advisor" },
    ],
    correctChoiceId: "a",
    explanation: "The Pricing Calculator lets you model and estimate costs for a planned Azure deployment. The TCO Calculator, by contrast, compares on-premises costs against running the same workload in Azure.",
  },
  {
    domain: "MANAGEMENT_GOVERNANCE",
    prompt: "Which tool would a company use to compare the cost of keeping an existing on-premises datacenter versus migrating to Azure?",
    choices: [
      { id: "a", text: "Azure Pricing Calculator" },
      { id: "b", text: "Total Cost of Ownership (TCO) Calculator" },
      { id: "c", text: "Azure Cost Management + Billing" },
      { id: "d", text: "Azure Monitor" },
    ],
    correctChoiceId: "b",
    explanation: "The TCO Calculator compares the ongoing cost of running workloads on-premises against the projected cost of running the same workloads in Azure.",
  },
  {
    domain: "MANAGEMENT_GOVERNANCE",
    prompt: "Which tool analyzes an existing Azure environment and offers personalized recommendations for cost, security, reliability, and performance?",
    choices: [
      { id: "a", text: "Azure Advisor" },
      { id: "b", text: "Azure Policy" },
      { id: "c", text: "Azure Blueprints" },
      { id: "d", text: "Microsoft Purview" },
    ],
    correctChoiceId: "a",
    explanation: "Azure Advisor continuously analyzes your deployed resources and surfaces best-practice recommendations across cost, security, reliability, operational excellence, and performance.",
  },
  {
    domain: "MANAGEMENT_GOVERNANCE",
    prompt: "Which service collects and analyzes telemetry such as metrics, logs, and application performance data across Azure resources?",
    choices: [
      { id: "a", text: "Azure Monitor" },
      { id: "b", text: "Azure Policy" },
      { id: "c", text: "Azure Service Health" },
      { id: "d", text: "Microsoft Defender for Cloud" },
    ],
    correctChoiceId: "a",
    explanation: "Azure Monitor, including its Log Analytics and Application Insights components, collects and analyzes telemetry to help understand how applications and resources are performing.",
  },
  {
    domain: "MANAGEMENT_GOVERNANCE",
    prompt: "Which tool provides a personalized view of the health of the specific Azure services and regions a customer is using, including outage notifications?",
    choices: [
      { id: "a", text: "Azure Service Health" },
      { id: "b", text: "Azure Advisor" },
      { id: "c", text: "Azure Monitor" },
      { id: "d", text: "Azure Policy" },
    ],
    correctChoiceId: "a",
    explanation: "Azure Service Health gives a personalized dashboard of service issues, planned maintenance, and health advisories for the specific resources and regions a customer uses.",
  },
  {
    domain: "MANAGEMENT_GOVERNANCE",
    prompt: "Which service unifies security posture management and threat protection across Azure, on-premises, and multi-cloud workloads?",
    choices: [
      { id: "a", text: "Microsoft Defender for Cloud" },
      { id: "b", text: "Azure Policy" },
      { id: "c", text: "Azure Blueprints" },
      { id: "d", text: "Microsoft Entra ID" },
    ],
    correctChoiceId: "a",
    explanation: "Microsoft Defender for Cloud provides security posture assessment, recommendations, and threat protection across hybrid and multi-cloud resources.",
  },
  {
    domain: "MANAGEMENT_GOVERNANCE",
    prompt: "Which Responsible AI principle is most directly addressed when a system clearly discloses to users that they are interacting with an AI, not a human?",
    choices: [
      { id: "a", text: "Fairness" },
      { id: "b", text: "Transparency" },
      { id: "c", text: "Privacy and security" },
      { id: "d", text: "Accountability" },
    ],
    correctChoiceId: "b",
    explanation: "Transparency, one of Microsoft's Responsible AI principles, involves being clear about how an AI system works and disclosing when someone is interacting with AI rather than a human.",
  },
  {
    domain: "MANAGEMENT_GOVERNANCE",
    prompt: "Which deployment approach involves writing infrastructure configuration as code, such as an ARM template or Bicep file, rather than manually clicking through the portal?",
    choices: [
      { id: "a", text: "Infrastructure as Code (IaC)" },
      { id: "b", text: "Shared responsibility model" },
      { id: "c", text: "Role-Based Access Control" },
      { id: "d", text: "Total Cost of Ownership" },
    ],
    correctChoiceId: "a",
    explanation: "Infrastructure as Code lets teams define and deploy resources consistently and repeatably using declarative templates, instead of manual, error-prone portal clicks.",
  },
];

async function main() {
  console.log("Seeding questions...");
  for (const q of questions) {
    await prisma.question.create({ data: q });
  }

  console.log(`Seeded ${questions.length} questions. Run "npm run seed:flashcards" separately for the flashcard deck.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

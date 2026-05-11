# **Technical Spec \- Reusable AI Chat Workspace**

*Next.js \+ Amplify Gen 2 \+ Bedrock | Court Reporter MVP*

# **1\. Recommended Stack**

| Layer | Recommendation | Reason |
| :---- | :---- | :---- |
| Frontend | Next.js \+ TypeScript | Fast development, strong ecosystem, fits AI SDK and AI Elements. |
| AI UI | AI SDK \+ AI Elements | Chat primitives, streaming patterns, prebuilt AI UI components. |
| Auth | Amplify Auth / Cognito | AWS-native login with minimal custom auth work. |
| Storage | Amplify Storage / S3 | File uploads and generated outputs. |
| Data | Amplify Data / DynamoDB \+ AppSync | Sessions, messages, file metadata, output metadata. |
| Backend | Amplify Functions / AWS Lambda in TypeScript | Fastest path for simple MVP; avoids separate backend runtime. |
| LLM | Amazon Bedrock Claude | AWS-native model access for sensitive/legal-ish docs. |
| Hosting | Amplify Hosting | Simple deploy for Next.js from Git. |
| Documents | docx npm library for DOCX; pdfmake optional for simple PDF | Editable DOCX first; PDF optional. |

# **2\. Backend Decision**

Use TypeScript Lambda functions for v1.

* The frontend is already TypeScript.  
* AI SDK and tool-calling patterns fit naturally in TypeScript/Node.  
* Amplify Gen 2 is optimized for a fullstack TypeScript workflow.  
* The initial backend logic is simple: read files, call model, save responses/outputs.  
* Avoid introducing Python/FastAPI until the document pipeline truly needs it.

# **3\. When to Add Python Later**

* Complex document parsing/OCR.  
* pydantic-ai agents.  
* Large transcript chunking and long-running jobs.  
* Evaluation harnesses and quality scoring.  
* Advanced RAG or embeddings pipelines.  
* Specialized DOCX/PDF processing not comfortable in Node.

# **4\. High-Level Architecture**

Browser / Next.js  
  \-\> Amplify Auth / Cognito  
  \-\> Chat UI with AI SDK \+ AI Elements  
  \-\> Amplify Data for sessions/messages  
  \-\> Amplify Storage / S3 for files  
  \-\> Amplify Function / Lambda TypeScript  
  \-\> Amazon Bedrock Claude  
  \-\> S3 generated outputs  
  \-\> UI displays response/download link

# **5\. Data Model**

User {  
  id: string  
  email: string  
  createdAt: datetime  
  updatedAt: datetime  
}

AgentConfig {  
  id: string  
  name: string  
  description?: string  
  systemPrompt: string  
  enabledTools: string\[\]  
  defaultModel: string  
  createdAt: datetime  
  updatedAt: datetime  
}

Session {  
  id: string  
  userId: string  
  agentId: string  
  title: string  
  createdAt: datetime  
  updatedAt: datetime  
}

Message {  
  id: string  
  sessionId: string  
  role: 'user' | 'assistant' | 'tool'  
  content: string  
  fileIds?: string\[\]  
  createdAt: datetime  
}

File {  
  id: string  
  userId: string  
  sessionId: string  
  messageId?: string  
  s3Key: string  
  fileName: string  
  mimeType: string  
  size: number  
  createdAt: datetime  
}

GeneratedOutput {  
  id: string  
  userId: string  
  sessionId: string  
  messageId: string  
  type: 'docx' | 'pdf' | 'txt' | 'markdown' | 'json'  
  s3Key: string  
  fileName: string  
  createdAt: datetime  
}

# **6\. Agent Folder Structure**

agents/  
  court-reporter/  
    prompt.md  
    skills.ts  
    tools.ts  
    templates/  
      final-transcript.docx  
    examples/  
      README.md

  waste-broker/  
    prompt.md  
    skills.ts  
    tools.ts  
    templates/  
      waste-stream-report.docx

# **7\. Message Processing Flow**

1. User sends a message and optional files.  
2. Files are uploaded to S3 and associated with the message.  
3. Message is persisted in the database.  
4. Backend loads the session, agent config, recent messages, and file content.  
5. Backend constructs the model request with system prompt, conversation context, file content, and tool definitions.  
6. Model responds with text and/or tool calls.  
7. If document generation is requested, the backend validates structured output and creates a DOCX/TXT/PDF.  
8. Generated file is saved to S3.  
9. Assistant response and generated output metadata are persisted.  
10. UI displays assistant response and download link.

# **8\. Tooling Pattern**

The model should not directly generate binary files. It should generate structured content that is validated before rendering.

LLM output / tool call  
  \-\> Zod schema validation  
  \-\> generateDocxTool or generatePdfTool  
  \-\> save to S3  
  \-\> return download URL

# **9\. Recommended Document Libraries**

| Output | Library | Use |
| :---- | :---- | :---- |
| DOCX | docx npm package | Primary output for editable documents. |
| TXT/Markdown | Native string/file writing | Fast fallback output and agent-readable artifacts. |
| PDF simple | pdfmake | Simple printable outputs or review reports. |
| PDF advanced later | HTML/CSS \+ Playwright PDF | More polished reports if needed later. |

# **10\. Initial Tools**

| Tool | Purpose |
| :---- | :---- |
| read\_file | Read uploaded transcript or reference file. |
| generate\_docx | Create editable Word document from structured content. |
| save\_output | Persist generated file to S3 and return metadata/download URL. |
| generate\_review\_notes | Create structured review notes for human review. |

# **11\. Court Reporter Agent Prompt Policy**

* Preserve testimony meaning.  
* Do not invent missing facts, names, citations, or exhibits.  
* Do not over-polish witness speech.  
* Flag uncertainty instead of guessing.  
* Generate a draft, not a certified final transcript.  
* Return review notes for human verification.

# **12\. Security and Data Handling**

* Use authenticated access only.  
* Store files in S3 with restricted access.  
* Use signed URLs for downloads when needed.  
* Keep user/session ownership checks on every file and message.  
* Avoid logging transcript content in application logs.  
* Define retention/deletion policy before production use.  
* Treat transcripts as sensitive and require human/legal review for confidentiality obligations.

# **13\. Implementation Phases**

| Phase | Scope |
| :---- | :---- |
| Demo week | Login, chat, sessions, file upload, Bedrock response, basic output. |
| Private MVP | Better DOCX, tuned prompt, review notes, examples, improved error handling. |
| Hardening | Larger file support, queue/worker if needed, retention controls, observability. |
| Reusable verticals | Add additional agent configs such as waste broker without rebuilding base app. |

# **14\. Final Technical Recommendation**

Build v1 as a TypeScript-first, Amplify-backed private AI chat workspace. Use Lambda functions for backend logic and Bedrock Claude for model calls. Keep Python/FastAPI as a future addition only if the workflow requires complex document processing, long-running jobs, or pydantic-ai patterns.
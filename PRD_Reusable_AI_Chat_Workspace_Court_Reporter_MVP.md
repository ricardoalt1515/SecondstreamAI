# **PRD \- Reusable AI Chat Workspace**

*Court Reporter MVP | Simple, reusable private AI assistant base*

# **1\. Executive Summary**

Build a private ChatGPT-like workspace where a user can log in, create chat sessions, send text and files, and receive AI-generated responses or downloadable documents. The first implementation will serve a court reporter who wants help transforming rough/court transcripts into final transcript drafts. The same base should be reusable for future verticals by changing prompts, skills, tools, templates, and domain files.

# **2\. Product Goal**

* Deliver a working MVP quickly, targeted at a small number of users.  
* Use a simple ChatGPT-style UX instead of a complex workflow builder.  
* Support file uploads and persistent chat sessions.  
* Allow the AI agent to return text, review notes, and downloadable files.  
* Keep the app reusable for future verticals such as waste broker workflows.

# **3\. Product Framing**

The product should be framed internally as:

A reusable private AI chat workspace with configurable vertical agents.

It should not be framed as a full SaaS platform, marketplace, or complex workflow engine in v1.

# **4\. Target User \- Court Reporter MVP**

* A court reporter with existing rough/court transcripts.  
* She wants assistance preparing final transcript drafts faster.  
* She remains the final reviewer and certifying professional.  
* The AI helps with cleanup, formatting, review notes, and draft generation, not legal certification.

# **5\. Core User Flow**

1. User visits the private app.  
2. User logs in with email/password.  
3. User lands in a ChatGPT-like workspace.  
4. User creates or selects a chat session.  
5. User sends text and optionally attaches transcript files.  
6. AI agent reads the message and files.  
7. AI agent responds with draft content, notes, or a generated document.  
8. User can download generated outputs.  
9. Sessions, messages, files, and outputs persist.

# **6\. MVP Scope**

| Included in v1 | Out of scope for v1 |
| :---- | :---- |
| Login | Billing/subscriptions |
| Chat UI with sessions sidebar | Multi-tenant SaaS admin |
| Persistent sessions and messages | Advanced role-based access |
| Text messages | Marketplace of agents |
| File upload | Fine-tuning |
| Agent with configurable prompt/skills/tools | Complex RAG pipeline |
| Generated text/document outputs | Collaborative document editor |
| Downloadable DOCX/TXT output | Advanced diff/editor workflow |
| Basic error/loading states | Revenue share automation |

# **7\. Reusability Strategy**

The app base should not be duplicated per customer. Instead, keep one reusable base and configure agents per vertical or client.

| Reusable app base | Agent/client-specific config |
| :---- | :---- |
| Auth/login | System prompt |
| Chat UI | Skills |
| Sessions/messages | Tools enabled |
| File upload/storage | Output templates |
| Model calling infrastructure | Domain instructions |
| Generated output storage | Example documents/reference files |
| Error handling/logs | Branding or naming if needed |

# **8\. Court Reporter Agent v1**

The court reporter agent should help transform rough/court transcripts into final transcript drafts. It must not claim certification or replace professional review.

| Agent responsibility | Description |
| :---- | :---- |
| Transcript cleanup | Improve punctuation, spacing, paragraphing, and obvious cleanup without changing meaning. |
| Speaker label normalization | Standardize labels such as THE COURT, THE WITNESS, MR., MS., BY MR., BY MS. |
| Q/A formatting | Format questions and answers consistently. |
| Review notes | Flag unclear names, speaker ambiguity, citations, exhibits, and possible meaning-changing sections. |
| Document generation | Produce a downloadable draft document when requested. |

# **9\. Court Reporter Guardrails**

* Preserve actual testimony and meaning.  
* Do not invent names, citations, exhibits, facts, or missing words.  
* Do not summarize testimony in place of transcript text.  
* Do not make the witness sound more formal if that changes tone or meaning.  
* Do not silently resolve uncertainty; flag it.  
* Do not claim the transcript is final or certified.  
* The court reporter remains the final reviewer and certifying authority.

# **10\. Success Criteria for 1-Week Demo**

* User can log in.  
* User can create and reopen chat sessions.  
* User can send text messages.  
* User can upload transcript files.  
* Agent can read uploaded file content.  
* Agent can return a structured draft/review response.  
* Agent can create a downloadable output file.  
* Sessions and messages persist after page refresh.

# **11\. Recommended 1-Week Build Plan**

| Day | Focus |
| :---- | :---- |
| Day 1 | Set up Next.js, Amplify, auth, protected route, basic chat layout. |
| Day 2 | Build sessions sidebar and persist sessions/messages. |
| Day 3 | Add file upload to S3 and attach files to messages. |
| Day 4 | Integrate Bedrock Claude and first court reporter prompt. |
| Day 5 | Add generated output support and S3 download links. |
| Day 6 | Tune prompt with sample transcripts and improve review notes. |
| Day 7 | Polish demo, fix bugs, prepare handoff/demo script. |

# **12\. Open Questions**

* What file formats must be supported first: DOCX, TXT, PDF, RTF?  
* Does the court reporter expect DOCX output, TXT output, or both?  
* Will she provide 5-10 paired examples for validation?  
* Should generated documents follow a strict template in v1 or be plain formatted drafts?  
* What data retention policy should be used for uploaded transcripts?

# **13\. Final Recommendation**

Start with a simple private AI chat workspace, not a complex SaaS platform. Build the reusable base once, then configure agents per vertical. For v1, the court reporter agent should focus on producing final transcript drafts and review notes from uploaded transcripts, while preserving human review and certification.
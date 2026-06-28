import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;

// Lazy initialization of Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets or .env file.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoint: Provide advice or chat about tasks
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, tasks, history } = req.body;

      if (!message) {
        res.status(400).json({ error: "Missing 'message' field in request body" });
        return;
      }

      const query = message.toLowerCase().trim();
      
      // Ensure tasks is an array
      const activeTasks = Array.isArray(tasks) ? tasks : [];
      const pendingTasks = activeTasks.filter(t => !t.completed);
      const completedTasks = activeTasks.filter(t => t.completed);
      
      const highPriority = pendingTasks.filter(t => t.priority === "High");
      const mediumPriority = pendingTasks.filter(t => t.priority === "Medium");
      const lowPriority = pendingTasks.filter(t => t.priority === "Low");

      const totalHours = pendingTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
      
      // Determine simulation date (June 23, 2026)
      const simToday = new Date("2026-06-23T00:00:00");
      
      // Identify overdue or urgent deadlines
      const overdueTasks: any[] = [];
      const urgentTasks: any[] = []; // Due today or tomorrow
      
      pendingTasks.forEach(t => {
        if (t.deadline) {
          const targetDate = new Date(t.deadline + "T00:00:00");
          const diffTime = targetDate.getTime() - simToday.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) {
            overdueTasks.push({ ...t, daysOverdue: Math.abs(diffDays) });
          } else if (diffDays <= 1) {
            urgentTasks.push({ ...t, daysLeft: diffDays });
          }
        }
      });

      // Find matched task from pending list based on query keywords
      const matchedTask = pendingTasks.find(t => query.includes(t.name.toLowerCase()));

      // Synthesize custom intelligence response based on query keywords
      let reply = "";

      // Stress detection keywords:
      const stressKeywords = ["overwhelmed", "cant do", "can't do", "too much", "help", "stress", "stressed", "anxious", "panic", "tired", "worry", "worried"];
      const containsStressKeyword = stressKeywords.some(kw => query.includes(kw));

      if (containsStressKeyword) {
        reply = `[🌿 USER SUPPORT PROTOCOL ACTIVE]
I hear you, User. Let's pause and take a slow, deep breath. The system parameters are just numbers, and your well-being is the absolute highest priority. 

Let's clear the clutter together with this calm, step-by-step recovery plan:
1. **Take 1 minute for yourself**: Step away from the terminal. Close your eyes, inhale for 4 seconds, hold for 4, and exhale for 4.
2. **Focus on exactly ONE thing**: Ignore everything else. We will pick just *one* small task — even a simple 15-minute subtask — to start. Let's not look at the whole list.
3. **Extend deadlines if needed**: You have full clearance to adjust deadlines. There is no real threat; we can restructure everything.
4. **Take breaks**: Do not attempt to burn through all hours at once. Work for 25 minutes, then stand up and stretch.

You are doing great. We are in this together, and we can handle it step-by-step. Let me know when you're ready, and we can select just one simple item to begin.`;
      }
      // 1. Check if the user is asking about a specific task by name
      else if (matchedTask) {
        const priorityIndicator = matchedTask.priority === "High" ? "🚨 HIGH THREAT" : matchedTask.priority === "Medium" ? "⚠️ MEDIUM RISK" : "🛡️ LOW RISK";
        reply = `[SENTINEL DIRECT VECTOR OVERRIDE ACTIVE]
Target objective identified: **"${matchedTask.name}"**

**Operational Telemetry:**
- **Threat Index:** ${priorityIndicator}
- **Required Cycle Expenditure:** ${matchedTask.estimatedHours} Hours
- **Target Deadline:** ${matchedTask.deadline || "Undefined"}

**Tactical Advisory Briefing:**
- This specific mission vector accounts for **${Math.round((matchedTask.estimatedHours / (totalHours || 1)) * 100)}%** of remaining team cycle expenditure.
- ${matchedTask.priority === "High" 
    ? "Recommendation: This objective is classified as High Threat. Immediately suspend low-level routines and execute now." 
    : "Recommendation: Keep this vector buffered while high priority Alpha threats are neutralized."}`;
      }
      // 2. Priority / Threat / Critical query
      else if (query.includes("priority") || query.includes("threat") || query.includes("critical") || query.includes("danger") || query.includes("assessment") || query.includes("high")) {
        if (highPriority.length > 0) {
          const taskLines = highPriority.map((t, idx) => `  * **${t.name}** | Terminal window: \`${t.deadline}\` | Est: \`${t.estimatedHours} hrs\``).join("\n");
          reply = `[SENTINEL SECURITY THREAT ASSESSMENT]
**CRITICAL ALERT:** I have detected **${highPriority.length} active Alpha-level Threat vectors** currently compromising optimal throughput.

**High Threat Matrix:**
${taskLines}

**Advisory Protocol Delta:**
1. Engage **"${highPriority[0].name}"** immediately. It requires approximately **${highPriority[0].estimatedHours} cycles** of focus to stabilize.
2. Divert all non-essential mainframe processing cycles.
3. Once neutralized, proceed to secondary risk queues. Defend your timeline.`;
        } else {
          reply = `[SENTINEL SECURITY THREAT ASSESSMENT]
**OPERATIONAL SECURE:** No active High Threat (Alpha-level) vectors identified in the current buffer. 

- Your current threat index is minimal.
- Recommend addressing the remaining **${pendingTasks.length} Medium/Low priority objectives** to maintain absolute timeline optimization.`;
        }
      }
      // 3. Workload / Efficiency / Hours / Optimize
      else if (query.includes("workload") || query.includes("efficiency") || query.includes("hours") || query.includes("duration") || query.includes("effort") || query.includes("optimize") || query.includes("reduce") || query.includes("cycles") || query.includes("expenditure")) {
        const avgHours = pendingTasks.length > 0 ? (totalHours / pendingTasks.length).toFixed(1) : "0";
        reply = `[SENTINEL WORKLOAD REDUCTION PROTOCOL]
**Mainframe Status Report:**
- **Pending Objectives:** ${pendingTasks.length} active vectors.
- **Aggregated Effort Budget:** **${totalHours} hours** total cycle expenditure.
- **Mean Objective Weight:** ${avgHours} hours/vector.

**Tactical Advice for Workload Allocation:**
- **Overload Prevention:** Your queue represents a substantial cycle burden of **${totalHours} hours**. Focus is paramount.
- **Execution Strategy:** Group tasks by proximity. Tackle short-duration vectors first to unlock processing bottlenecks.
- **Gateway Tip:** Defer low-priority items like *${lowPriority[0]?.name || "minor vectors"}* until major objectives are secured.`;
      }
      // 4. Timeline / Deadline / Overdue / Due / Window
      else if (query.includes("deadline") || query.includes("terminal") || query.includes("date") || query.includes("overdue") || query.includes("time") || query.includes("calendar") || query.includes("tomorrow") || query.includes("today") || query.includes("window")) {
        if (overdueTasks.length > 0 || urgentTasks.length > 0) {
          let listStr = "";
          if (overdueTasks.length > 0) {
            listStr += `⚠️ **OVERDUE MISSION CRITICALS:**\n` + overdueTasks.map(t => `  * **"${t.name}"** — *Overdue by ${t.daysOverdue} days!*`).join("\n") + "\n\n";
          }
          if (urgentTasks.length > 0) {
            listStr += `⏳ **IMMEDIATE TERMINATION WINDOWS (0-1 Days):**\n` + urgentTasks.map(t => `  * **"${t.name}"** — *Due in ${t.daysLeft === 0 ? "TODAY" : "TOMORROW"}*`).join("\n");
          }
          
          reply = `[SENTINEL TIMELINE RISK ANALYZER]
**INTELLIGENCE OVERLAY:** Timeline threat levels have elevated. Critical temporal parameters are being violated.

${listStr}

**Emergency Directives:**
1. Execute overdue vectors instantly. Each hour of latency increases operational drift risk.
2. Reach out to supportive systems if resource bottlenecks persist.
3. Buffer later objectives to shield terminal integrity.`;
        } else {
          reply = `[SENTINEL TIMELINE RISK ANALYZER]
**TEMPORAL PARAMETERS SECURE:** All active mission vectors are well within their safe target windows.

- No overdue objectives detected.
- Your timeline buffer is healthy. Ensure continuous steady progress to avoid late-stage congestion.`;
        }
      }
      // 5. Completed Tasks / Clearance / Done
      else if (query.includes("clear") || query.includes("completed") || query.includes("resolve") || query.includes("clean") || query.includes("done")) {
        const completedCount = completedTasks.length;
        const ratio = activeTasks.length > 0 ? Math.round((completedCount / activeTasks.length) * 100) : 100;
        
        reply = `[SENTINEL OBJECTIVE DECODING LOG]
**Mainframe Completion Metrics:**
- **Decoded & Secured:** ${completedCount} mission vectors.
- **Overall Clearance Rate:** **${ratio}%** overall completion ratio.

**Tactical Log Analysis:**
- ${completedCount > 0 
    ? `Excellent performance. You have successfully neutralized ${completedCount} threats. Clean up completed items in the panel to archive logs and maintain a clean terminal view.` 
    : "No completed objectives on record. Deploy your focus on the first vector and signal completion in the register once secured."}`;
      }
      // 6. Greetings / Simple Help / Fallback
      else {
        reply = `[SENTINEL COMMAND GATEWAY STATUS BRIEF]
Welcome back, User. I have mapped your active coordinates.

**Operational Ledger Overview:**
- **System Integrity:** Secure.
- **Active Threats:** **${pendingTasks.length} active** / **${completedTasks.length} completed** vectors.
- **Aggregated Threat Rating:** ${highPriority.length > 0 ? "🚨 ELEVATED (High threats active)" : "🟢 STABLE"}
- **Total Operational Backlog:** **${totalHours} effort hours** needed.

**Available Commands / Prompts:**
- Ask about **"Priority"** or **"Threats"** for deep critical queue sorting.
- Ask about **"Workload"** or **"Effort"** to analyze cycle allocations.
- Ask about **"Deadlines"** to run a terminal window risk assessment.
- Name any specific task to generate a custom target briefing.

*Awaiting User transmission...*`;
      }

      // Emulate a realistic dynamic system response lag (e.g. 400ms) to maintain immersion
      await new Promise(resolve => setTimeout(resolve, 400));

      res.json({ text: reply });
    } catch (error: any) {
      console.error("Advisory generator error:", error);
      res.status(500).json({
        error: error.message || "An unexpected error occurred in SENTINEL Command AI.",
      });
    }
  });

  // Serve static assets or use Vite in dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SENTINEL online on port ${PORT}`);
  });
}

startServer();

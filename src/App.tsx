import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Terminal, 
  ShieldAlert, 
  Trash2, 
  Plus, 
  Calendar, 
  Flame, 
  Activity, 
  Sparkles, 
  Clock, 
  Play, 
  Check, 
  X, 
  Send, 
  AlertTriangle, 
  Cpu, 
  Layers, 
  RefreshCw,
  Heart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task, ChatMessage } from "./types";

// Default seed objectives
const DEFAULT_TASKS: Task[] = [
  {
    id: "task-overdue-1",
    name: "Calibrate secondary defense network containment grid",
    deadline: "2026-06-20", // Overdue relative to June 23, 2026!
    priority: "Medium",
    estimatedHours: 4,
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "task-1",
    name: "Review SENTINEL security protocol overrides",
    deadline: "2026-06-23", // Today in the simulation metadata
    priority: "High",
    estimatedHours: 3,
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "task-2",
    name: "Perform mainframe cybernetic database synchronization",
    deadline: "2026-06-25",
    priority: "Medium",
    estimatedHours: 6,
    completed: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "task-3",
    name: "Map external vector intrusion vectors and threat levels",
    deadline: "2026-06-29",
    priority: "Low",
    estimatedHours: 2,
    completed: false,
    createdAt: new Date().toISOString()
  }
];

export const calculateDefcon = (deadlineStr: string | undefined, priority?: string): 1 | 2 | 3 | 4 | 5 => {
  if (!deadlineStr) {
    if (priority === "High") return 1;
    if (priority === "Medium") return 3;
    return 5;
  }
  const simToday = new Date("2026-06-23T00:00:00");
  const targetDate = new Date(deadlineStr + "T00:00:00");
  const diffTime = targetDate.getTime() - simToday.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return 1; // overdue or due today
  if (diffDays === 1) return 2; // due tomorrow
  if (diffDays <= 3) return 3; // due in 2-3 days
  if (diffDays <= 7) return 4; // due in 4-7 days
  return 5; // 7+ days
};

const DECOMPOSE_TEMPLATES: Record<string, { name: string; hours: number }[]> = {
  calibrate: [
    { name: "Execute containment field thermal diagnostic sweep", hours: 1 },
    { name: "Align frequency harmonics phase arrays", hours: 1.5 },
    { name: "Synchronize grid core containment lattice", hours: 1 },
    { name: "Validate mainframe status diagnostic logs", hours: 0.5 }
  ],
  security: [
    { name: "Analyze SENTINEL firewall override registry", hours: 1 },
    { name: "Patch zero-day cybernetic port vulnerabilities", hours: 2 },
    { name: "Verify biometric authentication security tokens", hours: 1 }
  ],
  audit: [
    { name: "Extract data flow transaction access logs", hours: 1.5 },
    { name: "Inspect anomalous memory heap allocations", hours: 2 },
    { name: "Compile master sector vulnerability report", hours: 1 }
  ],
  clean: [
    { name: "Purge corrupt database cache layers", hours: 0.5 },
    { name: "Optimize storage b-tree lookup indexes", hours: 1 },
    { name: "Archive historic mission transaction logs", hours: 1 }
  ]
};

const getSubtasksForTaskName = (taskName: string, estimatedHours: number) => {
  const lowerName = taskName.toLowerCase();
  let template = null;
  
  for (const key of Object.keys(DECOMPOSE_TEMPLATES)) {
    if (lowerName.includes(key)) {
      template = DECOMPOSE_TEMPLATES[key];
      break;
    }
  }
  
  if (!template) {
    template = [
      { name: `Map vector dependencies for "${taskName}"`, hours: Math.max(0.5, Number((estimatedHours * 0.3).toFixed(1))) },
      { name: "Execute core operational routines", hours: Math.max(1, Number((estimatedHours * 0.5).toFixed(1))) },
      { name: "Verify output telemetry parameters", hours: Math.max(0.5, Number((estimatedHours * 0.2).toFixed(1))) }
    ];
  }
  
  return template.map((st, index) => ({
    id: `subtask-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
    name: st.name,
    estimatedHours: st.hours,
    completed: false
  }));
};

export default function App() {
  // Persistence state
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("sentinel_tasks");
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("sentinel_messages");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "msg-welcome",
        role: "model",
        text: "[SENTINEL COMMAND GATEWAY ACTIVE]\n\nGreetings, User. I have mapped your current mission vectors. State your operational query or select a rapid tactical query below.",
        timestamp: new Date().toISOString()
      }
    ];
  });

  // Task form inputs
  const [taskName, setTaskName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [estimatedHours, setEstimatedHours] = useState<number | "">("");

  // Chat inputs
  const [userInput, setUserInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Time metrics inside simulation
  const [systemTime, setSystemTime] = useState("");
  const [clockTime, setClockTime] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Keep LocalStorage in sync
  useEffect(() => {
    localStorage.setItem("sentinel_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("sentinel_messages", JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Command-center ticking clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Emulate standard military timestamp format
      const formatted = now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
      setSystemTime(formatted);
      
      const hrs = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      const secs = String(now.getSeconds()).padStart(2, "0");
      setClockTime(`${hrs}:${mins}:${secs}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Soft auto-scroll for AI chat logs
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAiLoading]);

  // Compute stats metrics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const highPriorityCount = tasks.filter(t => t.priority === "High" && !t.completed).length;
    const totalHours = tasks.reduce((acc, t) => acc + (t.completed ? 0 : t.estimatedHours), 0);
    return { total, completed, pending, highPriorityCount, totalHours };
  }, [tasks]);

  // Task creators
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    const newTask: Task = {
      id: "mission-" + Math.random().toString(36).substring(2, 9),
      name: taskName.trim(),
      deadline: deadline || new Date().toISOString().split("T")[0],
      priority,
      estimatedHours: estimatedHours === "" ? 2 : Number(estimatedHours),
      completed: false,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);

    // Reset Form
    setTaskName("");
    setDeadline("");
    setPriority("Medium");
    setEstimatedHours("");
  };

  const handleToggleCompleted = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Clear Completed Missions
  const handleClearCompleted = () => {
    setTasks(prev => prev.filter(t => !t.completed));
  };

  // Submit trigger for AI Advisor terminal
  const querySentinelAI = async (messageText: string) => {
    if (!messageText.trim() || isAiLoading) return;

    // Construct logs to log UI
    const newUserMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      text: messageText,
      timestamp: new Date().toISOString()
    };

    // Update UI state
    setChatMessages(prev => [...prev, newUserMsg]);
    setUserInput("");
    setIsAiLoading(true);
    setApiError(null);

    // Payload extraction omitting IDs & raw timestamps for neat context transfers
    const structuredLogs = chatMessages.map(msg => ({
      role: msg.role,
      text: msg.text
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          tasks,
          history: structuredLogs
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Gateway response warning: Status ${response.status}`);
      }

      const data = await response.json();
      
      const aiReply: ChatMessage = {
        id: "msg-" + Date.now() + "-ai",
        role: "model",
        text: data.text,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, aiReply]);
    } catch (err: any) {
      console.error("Advisory connection failure:", err);
      setApiError(err.message || "Primary tactical link collapsed. Check secret logs.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Immediate diagnostic prompt macros
  const triggerPresetDiagnostic = (type: string) => {
    let query = "";
    switch (type) {
      case "assessment":
        query = "Generate a primary security threat assessment. Focus on the pending critical High priority objectives and advise on optimal delegation order based on estimated durations.";
        break;
      case "efficiency":
        query = "Recommend a workload reduction protocol. I have a lot of operational hours accumulated. How do I optimally optimize cycle expenditures?";
        break;
      case "threat_overdue":
        query = "List objectives that have terminal dates (deadlines) coming up immediately, and outline security steps to secure them.";
        break;
      default:
        query = "Brief me on the status of my operational mission register.";
    }
    querySentinelAI(query);
  };

  // WAR ROOM DETECTOR
  const isWarRoomActive = useMemo(() => {
    return tasks.some(t => {
      if (t.completed) return false;
      const defcon = calculateDefcon(t.deadline, t.priority);
      return defcon <= 2; // DEFCON 1 or DEFCON 2
    });
  }, [tasks]);

  const criticalDueTask = useMemo(() => {
    if (!isWarRoomActive) return null;
    const activeWithDeadline = tasks.filter(t => !t.completed && t.deadline);
    return [...activeWithDeadline].sort((a, b) => {
      return new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime();
    })[0] || null;
  }, [tasks, isWarRoomActive]);

  // COGNITIVE LOAD GAUGE METRICS
  const cognitiveLoad = useMemo(() => {
    const pending = tasks.filter(t => !t.completed);
    if (pending.length === 0) return 0;
    const totalHours = pending.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const criticalCount = pending.filter(t => {
      const defcon = calculateDefcon(t.deadline, t.priority);
      return defcon <= 2;
    }).length;
    
    // 8 hours of totalHours counts as 50% capacity, and each critical task counts as 15% load
    const baseLoad = (totalHours / 8) * 50;
    const criticalLoad = criticalCount * 15;
    return Math.min(100, Math.round(baseLoad + criticalLoad));
  }, [tasks]);

  // VELOCITY ANALYSIS METRICS
  const velocityMetrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Missed deadlines: uncompleted tasks with deadlines having DEFCON <= 2 (today or tomorrow/overdue)
    const missed = tasks.filter(t => !t.completed && t.deadline && calculateDefcon(t.deadline, t.priority) <= 2).length;
    
    // Percentage output increase needed to complete missed objectives
    let increasePercent = 0;
    if (missed > 0) {
      increasePercent = completed > 0 
        ? Math.round((missed / completed) * 100) 
        : missed * 40;
    }
    
    return {
      rate,
      missed,
      increasePercent: Math.min(500, increasePercent)
    };
  }, [tasks]);

  // TASK DECOMPOSITION ENGINE
  const handleDecomposeTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (t.subtasks && t.subtasks.length > 0) return t;
      const subtasks = getSubtasksForTaskName(t.name, t.estimatedHours);
      return {
        ...t,
        subtasks
      };
    }));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      if (!t.subtasks) return t;
      
      const updatedSubtasks = t.subtasks.map(st => 
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      
      // If all subtasks completed, mark the parent task completed
      const allCompleted = updatedSubtasks.every(st => st.completed);
      return {
        ...t,
        subtasks: updatedSubtasks,
        completed: allCompleted ? true : t.completed
      };
    }));
  };

  // BATTLE PLAN GENERATOR
  const [battlePlan, setBattlePlan] = useState<{ time: string; name: string; priorityLabel: string; defcon: number }[] | null>(null);

  const handleGenerateBattlePlan = () => {
    const pending = tasks.filter(t => !t.completed);
    if (pending.length === 0) {
      setBattlePlan([]);
      return;
    }

    // Sort: High -> Medium -> Low, then by deadline
    const sorted = [...pending].sort((a, b) => {
      const pA = a.priority === "High" ? 3 : a.priority === "Medium" ? 2 : 1;
      const pB = b.priority === "High" ? 3 : b.priority === "Medium" ? 2 : 1;
      if (pB !== pA) return pB - pA;
      
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

    let currentHour = 9;
    let currentMinute = 0;

    const plan = sorted.map(t => {
      const hrs = t.estimatedHours || 1;
      
      // Start slot formatting
      const startStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
      
      // End slot calculating
      let endHour = currentHour + Math.floor(hrs);
      let endMinute = currentMinute + Math.round((hrs % 1) * 60);
      if (endMinute >= 60) {
        endHour += 1;
        endMinute -= 60;
      }
      
      const endStr = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
      
      // Update pointer
      currentHour = endHour;
      currentMinute = endMinute;
      
      const defcon = calculateDefcon(t.deadline, t.priority);
      const priorityLabel = `DEFCON ${defcon}`;
      
      return {
        time: `${startStr} - ${endStr}`,
        name: t.name,
        priorityLabel,
        defcon
      };
    });

    setBattlePlan(plan);
  };

  // PROCRASTINATION RESCUE
  const handleRescueMission = () => {
    const simToday = new Date("2026-06-23T00:00:00");
    let rescueCount = 0;

    const updatedTasks = tasks.map(t => {
      if (t.completed || !t.deadline) return t;
      const targetDate = new Date(t.deadline + "T00:00:00");
      if (targetDate.getTime() < simToday.getTime()) {
        rescueCount++;
        return {
          ...t,
          priority: "High" as const,
          deadline: "2026-06-23" // Set deadline to today (June 23, 2026)
        };
      }
      return t;
    });

    if (rescueCount > 0) {
      setTasks(updatedTasks);

      const rescueMsg: ChatMessage = {
        id: "msg-rescue-" + Date.now(),
        role: "model",
        text: `[🚨 SENTINEL PROCRASTINATION RESCUE PROTOCOL INITIATED]
Mainframe scan located **${rescueCount} overdue mission vectors** violating current timeline parameters.

**RESCUE MUTATIONS EXECUTED:**
- **Elevated Status:** ${rescueCount} objectives have been promoted to **PRIORITY ALPHA (High)** threat level.
- **Timeline Recalibration:** Target windows synchronized to current core cycle (**2026-06-23**).
- **Execution Mandate:** Divert all user memory blocks to immediately neutralize **"${updatedTasks.find(t => t.priority === "High" && !t.completed)?.name}"**. Do not falter.`,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, rescueMsg]);
    } else {
      const secureMsg: ChatMessage = {
        id: "msg-rescue-fail-" + Date.now(),
        role: "model",
        text: `[🛡️ INTEL SCAN: COMPLETED SECURE]
No overdue mission vectors detected in the mainframe logs. System timeline integrity is operating within safe, optimal parameters. Rescue actions are not required at this cycle.`,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, secureMsg]);
    }
  };

  // Helper calculation to check if a deadline is overdue
  const getDeadlineStatusText = (dateStr: string, completed: boolean) => {
    if (completed) return { text: "Objective Secured", color: "text-emerald-400" };
    if (!dateStr) return { text: "No Terminal deadline", color: "text-neutral-500" };
    
    // Constant simulation date constraint: June 23, 2026
    const simToday = new Date("2026-06-23T00:00:00");
    const targetDate = new Date(dateStr + "T00:00:00");

    const diffTime = targetDate.getTime() - simToday.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `OVERDUE BY ${Math.abs(diffDays)} DAYS`, color: "text-red-500 font-bold animate-pulse" };
    } else if (diffDays === 0) {
      return { text: "TERMINATION DATE TODAY", color: "text-orange-500 font-semibold" };
    } else if (diffDays === 1) {
      return { text: "DUE TOMORROW", color: "text-amber-500" };
    } else {
      return { text: `${diffDays} days remaining`, color: "text-neutral-400" };
    }
  };

  return (
    <div id="sentinel-control-panel" className="min-h-screen bg-[#080808] text-gray-200 font-sans selection:bg-red-900 selection:text-red-100 p-4 lg:p-6 transition-all relative overflow-x-hidden">
      
      {/* Visual cybernetic lattice grid background element */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* Main Terminal Frame */}
      <div className="max-w-7xl mx-auto relative z-10 flex flex-col gap-6">
        
        {/* CRITICAL ALERT BANNER */}
        {isWarRoomActive && criticalDueTask && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-950/80 border border-red-500/40 text-red-100 text-xs px-5 py-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.25)] font-mono"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              <span>
                <strong className="text-red-400 font-bold uppercase tracking-wider">CRITICAL WAR ROOM ALERT:</strong> Objective <span className="text-white font-bold">"{criticalDueTask.name}"</span> is overdue or due within 24 hours. Execute immediate tactical override.
              </span>
            </div>
            <button 
              onClick={handleRescueMission} 
              className="bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[9px] px-3 py-1.5 rounded transition duration-150 shadow-md cursor-pointer shrink-0 border border-red-500/40"
            >
              RESCUE MISSION
            </button>
          </motion.div>
        )}
        
        {/* TOP STATUS NAVIGATION BAR */}
        <header id="sentinel-header" className={`h-16 border-b flex items-center justify-between px-6 bg-[#0C0C0C] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.8)] transition duration-200 ${isWarRoomActive ? "border-red-650" : "border-white/10"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center shadow-md animate-pulse transition duration-200 ${isWarRoomActive ? "bg-red-600" : "bg-red-600"}`}>
              <div className="w-4 h-4 bg-black rounded-sm rotate-45"></div>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white">
              SENTINEL 
              <span className="text-red-500 font-medium ml-2 text-sm tracking-widest opacity-85 uppercase">
                Mission Control
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-4 lg:gap-6 text-xs uppercase tracking-widest font-semibold font-mono">
            {isWarRoomActive ? (
              <span className="text-red-500 font-black animate-pulse flex items-center gap-1.5">
                <span className="inline-block animate-bounce">⚠️</span> WAR ROOM ACTIVE
              </span>
            ) : (
              <span className="text-orange-500 hidden sm:inline">System: Active</span>
            )}
            <span className="opacity-40 hidden sm:inline">v1.0.4-Delta</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-900 to-orange-850 border border-white/20 shadow-inner flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
            </div>
          </div>
        </header>

        {/* METRICS HUD ROW */}
        <section 
          id="sentinel-stats-panel" 
          className={`grid grid-cols-2 lg:grid-cols-5 gap-4 p-1 rounded-xl transition-all duration-300 ${
            isWarRoomActive 
              ? "border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-red-950/5" 
              : "border border-transparent"
          }`}
        >
          <div className={`p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group transition-all duration-350 rounded-lg ${
            isWarRoomActive 
              ? "bg-[#0A0707] border border-red-500/40 hover:border-red-500/65" 
              : "bg-[#0A0A0A] border border-white/10 hover:border-white/20"
          }`}>
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition text-white">
              <Layers className="w-12 h-12" />
            </div>
            <span className="text-[10px] font-mono text-gray-500 font-semibold tracking-widest uppercase">Active Vectors</span>
            <span className="text-3xl font-mono font-bold text-white mt-1.5 flex items-baseline gap-1.5">
              {stats.pending}
              <span className="text-xs text-gray-500"> / {stats.total} total</span>
            </span>
          </div>

          <div className={`p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group transition-all duration-350 rounded-lg ${
            isWarRoomActive 
              ? "bg-[#0A0707] border border-red-500/40 hover:border-red-500/65" 
              : "bg-[#0A0A0A] border border-white/10 hover:border-white/20"
          }`}>
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-15 transition text-red-500">
              <Flame className="w-12 h-12" />
            </div>
            <span className="text-[10px] font-mono text-red-400 font-semibold tracking-widest uppercase">Critical Threats</span>
            <span className="text-3xl font-mono font-bold text-red-500 mt-1.5 flex items-baseline gap-1.5">
              {stats.highPriorityCount}
              {stats.highPriorityCount > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-950 font-bold uppercase text-red-400 border border-red-905 animate-pulse">ALARM</span>
              )}
            </span>
          </div>

          <div className={`p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group transition-all duration-350 rounded-lg ${
            isWarRoomActive 
              ? "bg-[#0A0707] border border-red-500/40 hover:border-red-500/65" 
              : "bg-[#0A0A0A] border border-white/10 hover:border-white/20"
          }`}>
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition text-orange-500">
              <Clock className="w-12 h-12" />
            </div>
            <span className="text-[10px] font-mono text-orange-400 font-semibold tracking-widest uppercase">Cycle Expenditures</span>
            <span className="text-3xl font-mono font-bold text-orange-500 mt-1.5">
              {stats.totalHours} <span className="text-xs text-gray-500 font-normal">Hrs Est.</span>
            </span>
          </div>

          <div className={`p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group transition-all duration-350 rounded-lg ${
            isWarRoomActive 
              ? "bg-[#0A0707] border border-red-500/40 hover:border-red-500/65" 
              : "bg-[#0A0A0A] border border-white/10 hover:border-white/20"
          }`}>
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-15 transition text-emerald-500">
              <Activity className="w-12 h-12" />
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold tracking-widest uppercase">Objective Clearance</span>
            <span className="text-3xl font-mono font-bold text-emerald-400 mt-1.5">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              <span className="text-xs text-gray-500 font-normal block mt-0.5">Resolved</span>
            </span>
          </div>

          {/* COGNITIVE LOAD GAUGE */}
          <div className={`p-5 flex items-center gap-4 shadow-sm relative overflow-hidden group transition-all duration-350 rounded-lg ${
            isWarRoomActive 
              ? "bg-[#0A0707] border border-red-500/40 hover:border-red-500/65" 
              : "bg-[#0A0A0A] border border-white/10 hover:border-white/20"
          }`}>
            <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full rotate-[-90deg]">
                <circle
                  cx="28"
                  cy="28"
                  r="18"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <motion.circle
                  cx="28"
                  cy="28"
                  r="18"
                  strokeWidth="3.5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 18}
                  animate={{ 
                    strokeDashoffset: (2 * Math.PI * 18) - (cognitiveLoad / 100) * (2 * Math.PI * 18),
                    stroke: cognitiveLoad <= 40 ? "#10b981" : cognitiveLoad <= 70 ? "#eab308" : "#ef4444"
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
              </svg>
              <span className={`absolute font-mono font-black text-xs ${
                cognitiveLoad <= 40 ? "text-emerald-400" : cognitiveLoad <= 70 ? "text-yellow-400" : "text-red-500"
              }`}>
                {cognitiveLoad}%
              </span>
            </div>
            
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-gray-500 font-semibold tracking-widest uppercase">Cognitive Load</span>
              <span className="text-xs font-mono font-bold mt-1 text-white truncate">
                {cognitiveLoad > 80 ? (
                  <span className="animate-pulse text-red-500 font-black tracking-tighter uppercase">⚠️ OVERLOAD</span>
                ) : (
                  <span className={cognitiveLoad <= 40 ? "text-emerald-400" : cognitiveLoad <= 70 ? "text-yellow-400" : "text-red-400"}>
                    {cognitiveLoad <= 40 ? "OPTIMAL" : "ELEVATED"}
                  </span>
                )}
              </span>
            </div>
          </div>
        </section>

        {/* VELOCITY ANALYSIS SECTION */}
        <section id="sentinel-velocity-analysis" className="mt-4 border border-orange-500/25 bg-orange-950/5 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 shadow-md transition-all duration-300">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 flex-shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-xs font-mono font-bold text-orange-400 tracking-widest uppercase flex items-center gap-2">
                <span>[VELOCITY OVERWATCH & THREAT ANALYSIS]</span>
              </h3>
              <p className="text-[11px] text-gray-300 mt-1 uppercase font-mono tracking-wide leading-relaxed">
                Completion Rate: <span className="text-white font-bold">{velocityMetrics.rate}%</span> • At current velocity you will miss <span className="text-red-400 font-bold underline decoration-red-500/50 decoration-2">{velocityMetrics.missed}</span> deadlines
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto flex-shrink-0 font-mono text-xs">
            {/* Dynamic Progress Indicator bar */}
            <div className="w-full md:w-36 bg-white/5 h-2 rounded overflow-hidden border border-white/5">
              <motion.div 
                className="bg-orange-500 h-full"
                animate={{ width: `${velocityMetrics.rate}%` }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </div>
            
            <div className="bg-orange-950/20 border border-orange-500/35 px-4 py-2 rounded text-center md:text-left min-w-[220px]">
              <span className="text-[9px] text-gray-500 uppercase font-black block tracking-widest">OUTPUT DELTA REQUIRED</span>
              <span className="text-xs font-bold text-orange-400 block mt-0.5">
                {velocityMetrics.missed > 0 ? (
                  <>Increase output by <span className="text-orange-300 underline underline-offset-2 font-black">{velocityMetrics.increasePercent}%</span> to secure all objectives</>
                ) : (
                  <span className="text-emerald-400 font-black">SECURE ALL OBJECTIVES (0% DELTA)</span>
                )}
              </span>
            </div>
          </div>
        </section>

        {/* PRIMARY CONTROL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* COLUMN 1: SIDEBAR: TASK CREATION (span 4) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <section id="mission-entry-box" className="border border-white/10 bg-[#0A0A0A] p-6 rounded-lg flex flex-col gap-5 shadow-lg relative">
              <div className="border-b border-white/15 pb-2">
                <h2 className="text-xs font-bold text-white uppercase tracking-[0.2em]">Initialize Task</h2>
                <p className="text-[10px] text-gray-500 mt-1 uppercase font-mono">Input mission parameters to deploy</p>
              </div>

              <form onSubmit={handleAddTask} className="flex flex-col gap-4">
                
                {/* Mission Name input */}
                <div>
                  <label htmlFor="mission-name" className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-bold">
                    Task Designation
                  </label>
                  <input
                    id="mission-name"
                    type="text"
                    required
                    placeholder="e.g. Core Engine Audit"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition duration-150"
                  />
                </div>

                {/* Sub row - Hours budget and Deadline picker */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="mission-deadline" className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-bold">
                      Deadline
                    </label>
                    <input
                      id="mission-deadline"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50 transition duration-150"
                    />
                  </div>

                  <div>
                    <label htmlFor="mission-hours" className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-bold">
                      EST. Hours
                    </label>
                    <input
                      id="mission-hours"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="e.g. 2.5"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50 transition duration-150"
                    />
                  </div>
                </div>

                {/* Threat Priority select buttons (glow themed) */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-bold">
                    Priority Level
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      id="priority-high-btn"
                      onClick={() => setPriority("High")}
                      className={`flex-1 py-1.5 px-2 border text-[10px] font-bold rounded uppercase transition duration-150 cursor-pointer ${
                        priority === "High"
                          ? "border-red-500/50 bg-red-500/10 text-red-500"
                          : "border-white/10 bg-white/5 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      High
                    </button>

                    <button
                      type="button"
                      id="priority-med-btn"
                      onClick={() => setPriority("Medium")}
                      className={`flex-1 py-1.5 px-2 border text-[10px] font-bold rounded uppercase transition duration-150 cursor-pointer ${
                        priority === "Medium"
                          ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                          : "border-white/10 bg-white/5 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      Med
                    </button>

                    <button
                      type="button"
                      id="priority-low-btn"
                      onClick={() => setPriority("Low")}
                      className={`flex-1 py-1.5 px-2 border text-[10px] font-bold rounded uppercase transition duration-150 cursor-pointer ${
                        priority === "Low"
                          ? "border-amber-600/50 bg-amber-600/10 text-amber-500"
                          : "border-white/10 bg-white/5 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      Low
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="add-mission-submit"
                  className="w-full bg-orange-600 hover:bg-orange-500 text-black font-black uppercase text-xs py-3 rounded mt-4 transition duration-200 cursor-pointer shadow-[0_4px_12px_rgba(234,88,12,0.2)]"
                >
                  Deploy Task
                </button>
              </form>
            </section>

            {/* QUICK DIAGNOSTICS */}
            <section id="ai-quick-query-box" className="border border-white/5 bg-[#0A0A0A]/70 p-5 rounded-lg flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-orange-500" />
                <span>Diagnostics Gateway</span>
              </h3>
              
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => triggerPresetDiagnostic("assessment")}
                  className="w-full text-left font-mono text-xs px-3.5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded flex items-center justify-between text-gray-300 transition duration-150"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>Priority Assessment</span>
                  </span>
                  <span className="text-[9px] bg-red-950/40 text-red-400 border border-red-900/50 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Analyze</span>
                </button>

                <button
                  onClick={() => triggerPresetDiagnostic("efficiency")}
                  className="w-full text-left font-mono text-xs px-3.5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded flex items-center justify-between text-gray-300 transition duration-150"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span>Workload Reduction</span>
                  </span>
                  <span className="text-[9px] bg-orange-950/40 text-orange-400 border border-orange-900/50 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Analyze</span>
                </button>
              </div>
            </section>

            {/* TACTICAL BATTLE PLAN & PROCRASTINATION RESCUE */}
            <section id="sentinel-battle-plan-box" className="border border-white/10 bg-[#0A0A0A] p-5 rounded-lg flex flex-col gap-4 shadow-lg">
              <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span>BATTLE PLAN</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleGenerateBattlePlan}
                  id="generate-battle-plan-btn"
                  className="bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 hover:border-orange-500/60 text-orange-400 font-bold uppercase text-[10px] py-2.5 px-3 rounded transition duration-150 cursor-pointer text-center font-mono flex items-center justify-center gap-1.5"
                >
                  Generate Battle Plan
                </button>
                <button
                  onClick={handleRescueMission}
                  id="rescue-mission-btn"
                  className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 hover:border-red-500/60 text-red-400 font-bold uppercase text-[10px] py-2.5 px-3 rounded transition duration-150 cursor-pointer text-center font-mono flex items-center justify-center gap-1.5"
                >
                  Rescue Mission
                </button>
              </div>

              {/* BATTLE PLAN RESULTS DISPLAY */}
              <AnimatePresence mode="wait">
                {battlePlan !== null && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-4 bg-black/60 border border-orange-500/20 rounded-lg text-xs font-mono space-y-2.5">
                      <div className="flex items-center justify-between border-b border-orange-500/20 pb-1.5 text-[10px] text-orange-400 uppercase tracking-wider font-bold">
                        <span>[TACTICAL TIMELINE BRIEFING]</span>
                        <span className="text-gray-500">CYCLE TODAY</span>
                      </div>
                      
                      {battlePlan.length === 0 ? (
                        <p className="text-gray-500 uppercase text-[10px] text-center py-2">
                          No active threats. All sectors secure. No battle plan required.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                          {battlePlan.map((slot, index) => {
                            const defconLevel = slot.defcon || 5;
                            const timeColorClass = 
                              defconLevel <= 2 
                                ? "text-orange-500 font-bold" 
                                : defconLevel <= 4 
                                ? "text-yellow-400 font-bold" 
                                : "text-emerald-400 font-bold";
                            return (
                              <div key={index} className="flex flex-col gap-1 py-1 border-b border-white/5 last:border-b-0">
                                <span className={`${timeColorClass} font-mono`}>{slot.time}</span>
                                <span className="text-gray-300 break-words font-semibold">{slot.name} <span className="text-[9px] text-gray-500 font-bold">[{slot.priorityLabel}]</span></span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>

          {/* COLUMN 2: ACTIVE REGISTER & SECURE INTELLIGENCE (span 8) */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* UP: MISSION REGISTER LIST (Active Directives) */}
            <section id="mission-register-box" className="border border-white/10 bg-[#0A0A0A] p-6 rounded-lg flex flex-col gap-5 shadow-lg flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-white">Active Directives</h3>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">{stats.pending} TASKS PENDING</span>
                  {tasks.some(t => t.completed) && (
                    <button
                      onClick={handleClearCompleted}
                      className="text-[9px] font-mono border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white px-2 py-1 rounded transition duration-150 cursor-pointer uppercase font-bold"
                    >
                      Clear Resolved
                    </button>
                  )}
                </div>
              </div>

              {/* Operational scrollable list */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] pr-1.5 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {tasks.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-12 text-center text-gray-500 font-mono text-xs border border-dashed border-white/10 rounded-lg bg-white/2"
                    >
                      <AlertTriangle className="w-8 h-8 text-orange-500/70 mx-auto mb-3" />
                      ALL INTRUSIONS NEUTRALIZED.
                      <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-wider">Operational mission deck is empty.</p>
                    </motion.div>
                  ) : (
                    tasks.map((task) => {
                      const defcon = calculateDefcon(task.deadline, task.priority);
                      const defconTag = 
                        defcon === 1 
                          ? { text: "DEFCON 1", border: "border-red-650 shadow-[inset_4px_0_0_#ef4444]", badge: "bg-red-500/20 text-red-500 border-red-500/50 animate-pulse font-black" } 
                          : defcon === 2
                          ? { text: "DEFCON 2", border: "border-red-500", badge: "bg-red-500/10 text-red-400 border-red-500/30 font-bold" }
                          : defcon === 3
                          ? { text: "DEFCON 3", border: "border-orange-500", badge: "bg-orange-500/10 text-orange-400 border-orange-500/30 font-bold" }
                          : defcon === 4
                          ? { text: "DEFCON 4", border: "border-yellow-500", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30 font-bold" }
                          : { text: "DEFCON 5", border: "border-emerald-500", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
                          
                      const deadlineText = getDeadlineStatusText(task.deadline, task.completed);

                      return (
                        <div key={task.id} className="flex flex-col gap-1.5 border-b border-white/5 pb-3 last:border-b-0">
                          {/* Main Task Card */}
                          <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className={`flex items-center justify-between p-4 bg-white/5 border-l-4 rounded-r transition-all ${
                              defcon === 1 && !task.completed ? "animate-red-glow bg-red-950/10" : defconTag.border
                            } ${
                              task.completed ? "opacity-45" : "hover:bg-white/8 cursor-default"
                            }`}
                          >
                            <div className="flex flex-col gap-1 min-w-0 pr-4">
                              <span className={`text-sm font-bold text-white uppercase tracking-tight break-words max-w-sm sm:max-w-md ${
                                task.completed ? "line-through text-gray-500" : ""
                              }`}>
                                {task.name}
                              </span>
                              <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">
                                DEADLINE: {task.deadline || "NONE"} • {task.estimatedHours} HRS EST. • <span className={deadlineText.color}>{deadlineText.text}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                              {/* DECOMPOSE BUTTON */}
                              {!task.completed && (!task.subtasks || task.subtasks.length === 0) && (
                                <button
                                  onClick={() => handleDecomposeTask(task.id)}
                                  className="px-2 py-1 text-[9px] font-mono font-bold bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:text-orange-300 rounded transition cursor-pointer uppercase flex items-center gap-1"
                                  title="Decompose Task"
                                >
                                  <Cpu className="w-3 h-3" /> Decompose
                                </button>
                              )}

                              <span className={`px-2 py-1 text-[9px] font-bold border uppercase tracking-wider rounded ${defconTag.badge}`}>
                                {defconTag.text}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {/* Toggle Checkbox */}
                                <button
                                  onClick={() => handleToggleCompleted(task.id)}
                                  className={`p-1.5 rounded text-xs transition cursor-pointer ${
                                    task.completed
                                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                      : "bg-white/5 text-gray-400 hover:text-white"
                                  }`}
                                  title={task.completed ? "Re-open" : "Complete"}
                                >
                                  {task.completed ? <Check className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>

                                {/* Delete task */}
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 rounded bg-white/5 text-gray-500 hover:text-red-500 hover:bg-red-950/20 transition cursor-pointer"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>

                          {/* Nested Indented Subtasks Block */}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="pl-6 pr-2 py-1.5 flex flex-col gap-1.5 border-l border-white/10 ml-4 bg-black/20 rounded-r">
                              <div className="text-[8px] font-mono font-bold text-gray-600 uppercase tracking-widest mb-0.5">
                                [SUBTASK DECOMPOSITION QUEUE]
                              </div>
                              {task.subtasks.map((subtask) => (
                                <motion.div
                                  key={subtask.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={`flex items-center justify-between p-2 bg-white/2 border border-white/5 rounded text-xs transition duration-150 ${
                                    subtask.completed ? "opacity-45 bg-[#030704]/40 border-emerald-950/20" : "hover:bg-white/5"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 pr-3">
                                    <button
                                      onClick={() => handleToggleSubtask(task.id, subtask.id)}
                                      className={`p-1 rounded text-[10px] transition cursor-pointer ${
                                        subtask.completed
                                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                          : "bg-white/5 text-gray-500 hover:text-white"
                                      }`}
                                    >
                                      {subtask.completed ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 border border-white/15 rounded-sm bg-white/2 hover:border-orange-500/40 transition-colors" />}
                                    </button>
                                    <span className={`font-mono text-[11px] break-words flex flex-wrap items-center gap-2 ${
                                      subtask.completed 
                                        ? "line-through decoration-emerald-500 decoration-2 text-emerald-500/80 animate-pulse" 
                                        : "text-gray-300"
                                    }`}>
                                      <span>{subtask.name}</span>
                                      {subtask.completed && (
                                        <span className="text-[8px] font-sans font-black text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest animate-pulse">
                                          SUBTASK NEUTRALIZED
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  <span className={`text-[9px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded border ${
                                    subtask.completed 
                                      ? "text-emerald-500/60 bg-emerald-950/10 border-emerald-950/20" 
                                      : "text-gray-500 bg-white/2 border-white/5"
                                  }`}>
                                    {subtask.estimatedHours} HR
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* DOWN: SECURE INTELLIGENCE CHANNEL (Chat Box Area) */}
            <section id="ai-advisor-box" className="border-t border-white/10 bg-[#060606] p-6 flex flex-col justify-between rounded-lg h-96 shadow-lg relative">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-xs font-bold text-black font-mono">G</div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.25em] text-white">Gemini Intelligence</h4>
                </div>
                <span className="text-[10px] text-gray-500 tracking-widest font-mono">SECURE TACTICAL COMMUNICATIONS</span>
              </div>

              {/* Chat Messages */}
              <div id="ai-chat-logs" className="flex-1 overflow-y-auto my-3 space-y-4 pr-1.5 custom-scrollbar min-h-0">
                {chatMessages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 bg-orange-600/80 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-black">
                          S
                        </div>
                      )}

                      <div className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                        isUser 
                          ? "bg-red-500/10 border-red-500/20 text-red-200 rounded-tr-none" 
                          : "bg-white/5 border-white/5 text-gray-300 rounded-tl-none"
                      }`}>
                        {isUser ? (
                          <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                        ) : (
                          <div>
                            <span className="text-orange-500 font-bold uppercase text-[9px] block mb-1">SENTINEL AI PROTOCOL</span>
                            <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 bg-red-950/50 border border-red-900/40 rounded-full shrink-0 flex items-center justify-center text-[10px] font-mono text-red-400">
                          OP
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading feedback */}
                {isAiLoading && (
                  <div className="flex gap-3 justify-start max-w-[85%]">
                    <div className="w-7 h-7 bg-orange-600/80 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-black animate-spin">
                      S
                    </div>
                    <div className="bg-white/3 border border-white/5 p-3.5 rounded-lg rounded-tl-none text-xs text-gray-400 font-mono flex items-center gap-3">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
                      <span>Synthesizing intelligence telemetry report...</span>
                    </div>
                  </div>
                )}

                {apiError && (
                  <div className="p-3.5 rounded bg-red-950/20 border border-red-900/30 text-red-300 font-mono text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <strong className="text-red-400 block uppercase text-[10px] mb-1">Transmission link severed</strong>
                      <span>{apiError}</span>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Controls */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (userInput.trim() && !isAiLoading) {
                    querySentinelAI(userInput);
                  }
                }}
                className="relative mt-2"
              >
                <input
                  type="text"
                  placeholder="Transmit message to Gemini..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-full px-6 py-3.5 text-xs text-white placeholder-gray-600 focus:outline-none transition duration-150"
                />
                <button
                  type="submit"
                  disabled={isAiLoading || !userInput.trim()}
                  className="absolute right-2 top-2 h-8 px-4 bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 rounded-full text-[10px] font-bold uppercase transition duration-150 cursor-pointer flex items-center justify-center"
                >
                  Send
                </button>
              </form>
            </section>
          </div>
        </div>

        {/* SECURE NETWORK FOOTER */}
        <footer id="sentinel-footer" className="h-12 border-t border-white/5 px-4 flex flex-col sm:flex-row items-center justify-between text-[9px] text-gray-500 font-mono mt-4 gap-2 sm:gap-0 bg-black/40">
          <div className="flex gap-4 items-center">
            <span>IP: 192.168.1.104</span>
            <span>LATENCY: 14MS</span>
            <span className="text-emerald-500 bg-emerald-950/25 px-1.5 py-0.5 border border-emerald-900/30 rounded tracking-wider uppercase font-bold">ENCRYPTED CONNECTION</span>
            <span className="text-orange-500 bg-orange-950/30 px-2 py-0.5 rounded border border-orange-900/30 font-bold uppercase tracking-wide">SYSTEM TIME: {clockTime}</span>
          </div>
          <div className="flex gap-4 uppercase font-semibold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span> 
              Urgent Risks: {stats.highPriorityCount}
            </span>
            <span>Load: 14%</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

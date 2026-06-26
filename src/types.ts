export interface Subtask {
  id: string;
  name: string;
  estimatedHours: number;
  completed: boolean;
}

export interface Task {
  id: string;
  name: string;
  deadline: string;
  priority: "High" | "Medium" | "Low";
  estimatedHours: number;
  completed: boolean;
  createdAt: string;
  subtasks?: Subtask[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

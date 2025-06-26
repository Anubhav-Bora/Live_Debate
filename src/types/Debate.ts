// types.ts (or a similar file)
export interface Debate {
   judge: {
    username: string;
  };
  id: string;
  topic: string;
  status: string;
  createdAt: string;
  duration: number;
  joinCode: string;
  proUser?: { id: string; username: string };
  conUser?: { id: string; username: string };
  messages: {
    id: string;
    content: string;
    createdAt: string;
    role: string;
    sender: { id: string; username: string };
  }[];
  scores: {
    logic: number;
    clarity: number;
    persuasiveness: number;
    tone: number;
  }[];
}

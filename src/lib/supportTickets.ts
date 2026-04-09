export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  phone: string;
  issue: string;
  status: "open" | "reviewed" | "deleted";
  createdAt: string;
}

const STORAGE_KEY = "reliyo_support_tickets";

const generateTicketId = (): string => {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RT-${year}-${code}`;
};

export const getTickets = (): SupportTicket[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export const createTicket = (data: Omit<SupportTicket, "id" | "status" | "createdAt">): SupportTicket => {
  const ticket: SupportTicket = {
    ...data,
    id: generateTicketId(),
    status: "open",
    createdAt: new Date().toISOString(),
  };
  const tickets = getTickets();
  tickets.unshift(ticket);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  return ticket;
};

export const updateTicketStatus = (id: string, status: "reviewed" | "deleted") => {
  const tickets = getTickets().map((t) => (t.id === id ? { ...t, status } : t));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
};

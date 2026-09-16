import { apiClient } from "@/lib/api/client";

export interface CreateSupportTicketInput {
  name: string;
  email: string;
  phone: string;
  subject: string;
  issue: string;
}

export interface SupportTicketCreated {
  id: string;
  status: string;
  createdAt: string;
}

export function createSupportTicket(input: CreateSupportTicketInput) {
  return apiClient.post<SupportTicketCreated>("/support/tickets", input);
}

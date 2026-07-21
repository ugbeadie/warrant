import api from "./axios";
import type { PolicyRule } from "../types";

interface CreatePolicyRuleInput {
  resourceId: string;
  autoApprove: boolean;
  maxRoleName: string;
  condition?: { maxDuration?: number; [key: string]: unknown };
}

interface UpdatePolicyRuleInput {
  autoApprove?: boolean;
  maxRoleName?: string;
  condition?: { maxDuration?: number; [key: string]: unknown };
}

export const createPolicyRule = async (
  input: CreatePolicyRuleInput,
): Promise<PolicyRule> => {
  const { data } = await api.post("/policy-rules/create", input);
  return data.rule;
};

export const updatePolicyRule = async (
  id: string,
  input: UpdatePolicyRuleInput,
): Promise<PolicyRule> => {
  const { data } = await api.patch(`/policy-rules/${id}`, input);
  return data.rule;
};

export const deletePolicyRule = async (id: string): Promise<void> => {
  await api.delete(`/policy-rules/${id}`);
};

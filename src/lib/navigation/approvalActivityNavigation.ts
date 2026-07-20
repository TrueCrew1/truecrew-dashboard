export const CHIEF_APPROVAL_QUERY_PARAM = "chiefApproval";

export function approvalCardElementId(proposalId: string): string {
  return `approval-proposal-${proposalId}`;
}

export function buildChiefApprovalDeepLink(
  proposalId: string,
  pathname: string = "/",
): string {
  const params = new URLSearchParams();
  params.set(CHIEF_APPROVAL_QUERY_PARAM, proposalId);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function parseChiefApprovalDeepLink(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(CHIEF_APPROVAL_QUERY_PARAM)?.trim();
  return value ? value : null;
}

export function clearChiefApprovalDeepLink(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(CHIEF_APPROVAL_QUERY_PARAM);
  return next;
}

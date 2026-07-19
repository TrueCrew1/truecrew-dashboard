import type { ApprovalResultLink } from "./approvalResultLinks";

interface ApprovalResultLinksListProps {
  links: readonly ApprovalResultLink[];
}

export function ApprovalResultLinksList({ links }: ApprovalResultLinksListProps) {
  if (links.length === 0) return null;

  return (
    <ul className="approval-result-links" aria-label="Mission output locations">
      {links.map((link) => (
        <li key={`${link.label}-${link.path}`} className="approval-result-links-item">
          <span className="approval-result-links-label">{link.label}</span>
          <span className="approval-result-links-path">{link.path}</span>
        </li>
      ))}
    </ul>
  );
}

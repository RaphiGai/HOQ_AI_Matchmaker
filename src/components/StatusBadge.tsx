import type { ProjectStatus } from '../types';

const CLASS: Record<ProjectStatus, string> = {
  New: 'status-new',
  'Questions open': 'status-open',
  'In review': 'status-review',
  Approved: 'status-approved',
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`status ${CLASS[status]}`}>{status}</span>;
}

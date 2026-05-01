export const STATUSES = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export function getStatusLabel(status) {
  return STATUSES.find((item) => item.value === status)?.label || status;
}

export function formatDate(value) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function getUserRole(project, userId) {
  return project?.members?.find((member) => member.user_id === userId)?.role || "member";
}

export function getMemberLabel(project, userId, currentUserId) {
  const member = project?.members?.find((item) => item.user_id === userId);
  if (member?.name || member?.email) {
    const suffix = userId === currentUserId ? " (you)" : "";
    return `${member.name || member.email}${suffix}`;
  }
  const suffix = userId === currentUserId ? " (you)" : "";
  return `${userId.slice(0, 8)}${suffix}`;
}

export function getUserLabel(user, currentUserId) {
  const suffix = user.id === currentUserId ? " (you)" : "";
  return `${user.name} - ${user.role}${suffix}`;
}

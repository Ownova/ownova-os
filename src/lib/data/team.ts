import { query, isAwsDbConfigured } from "@/lib/aws/db";
import { teamMembers as mockTeamMembers } from "@/lib/mock-data";
import type { TeamMember } from "@/types";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string | null;
  avatar_url: string | null;
}

function rowToTeamMember(row: UserRow): TeamMember {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role as TeamMember["role"],
    department: row.department ?? "",
    avatarUrl: row.avatar_url ?? undefined,
  };
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  if (!isAwsDbConfigured) return mockTeamMembers;
  const rows = await query<UserRow>(
    `select id, full_name, email, role, department, avatar_url from users order by full_name`
  );
  return rows.map(rowToTeamMember);
}

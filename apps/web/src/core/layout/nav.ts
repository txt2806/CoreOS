/**
 * Navigation model for the rail and the contextual panel.
 * Every entry maps to a route that exists under `src/app`, so the shell never
 * advertises a screen the application cannot render.
 */

export type DomainId = "overview" | "work" | "people" | "system" | "library";

export interface NavLink {
  href: string;
  label: string;
}

export interface NavGroup {
  label: string;
  links: NavLink[];
}

export interface NavDomain {
  id: DomainId;
  label: string;
  href: string;
  eyebrow: string;
  groups: NavGroup[];
}

export const DOMAINS: NavDomain[] = [
  {
    id: "overview",
    label: "Tổng quan",
    href: "/",
    eyebrow: "Trung tâm điều hành",
    groups: [
      {
        label: "Hôm nay",
        links: [{ href: "/", label: "Bảng công việc của tôi" }],
      },
      {
        label: "Đi thẳng",
        links: [
          { href: "/work-management/tasks", label: "Công việc của tôi" },
          { href: "/hr-management/attendance", label: "Chấm công hôm nay" },
          { href: "/hr-management/leaves", label: "Nghỉ phép của tôi" },
          { href: "/work-management/notifications", label: "Thông báo" },
        ],
      },
    ],
  },
  {
    id: "work",
    label: "Công việc",
    href: "/work-management/tasks",
    eyebrow: "Quản trị công việc",
    groups: [
      {
        label: "Thực thi",
        links: [
          { href: "/work-management/tasks", label: "Công việc" },
          { href: "/work-management/kanban", label: "Bảng Kanban" },
          { href: "/work-management/projects", label: "Dự án" },
          { href: "/work-management/milestones", label: "Mốc & nghiệm thu" },
          { href: "/work-management/timesheets", label: "Bảng thời gian" },
        ],
      },
      {
        label: "Phối hợp",
        links: [
          { href: "/work-management/calendar", label: "Lịch làm việc" },
          { href: "/work-management/tickets-approvals", label: "Đề xuất & phê duyệt" },
          { href: "/work-management/internal-chat", label: "Trao đổi nội bộ" },
          { href: "/work-management/knowledge-sop", label: "Ghi chú & SOP" },
          { href: "/work-management/reports", label: "Báo cáo" },
          { href: "/work-management/notifications", label: "Thông báo" },
        ],
      },
    ],
  },
  {
    id: "people",
    label: "Nhân sự",
    href: "/hr-management/employees",
    eyebrow: "Quản trị nhân sự",
    groups: [
      {
        label: "Tổ chức",
        links: [
          { href: "/hr-management/organization", label: "Phòng ban & Team" },
          { href: "/hr-management/positions", label: "Chức danh & Cấp bậc" },
        ],
      },
      {
        label: "Hồ sơ",
        links: [
          { href: "/hr-management/employees", label: "Danh bạ nhân viên" },
          { href: "/hr-management/capacity", label: "Năng lực & phân bổ" },
        ],
      },
      {
        label: "Chấm công",
        links: [
          { href: "/hr-management/attendance", label: "Chấm công của tôi" },
          { href: "/hr-management/workforce", label: "Bảng hiện diện" },
          { href: "/hr-management/explanations", label: "Giải trình điểm danh" },
          { href: "/hr-management/shifts", label: "Ca & lịch làm việc" },
          { href: "/hr-management/attendance-reports", label: "Báo cáo công" },
        ],
      },
      {
        label: "Nghỉ phép",
        links: [
          { href: "/hr-management/leaves", label: "Đơn nghỉ phép" },
          { href: "/hr-management/leave-approvals", label: "Duyệt nghỉ phép" },
        ],
      },
    ],
  },
  {
    id: "system",
    label: "Hệ thống",
    href: "/tenant-system/accounts",
    eyebrow: "Quản trị hệ thống",
    groups: [
      {
        label: "Truy cập",
        links: [
          { href: "/tenant-system/auth", label: "Đăng nhập" },
          { href: "/tenant-system/accounts", label: "Tài khoản" },
          { href: "/tenant-system/roles-permissions", label: "Phân quyền" },
        ],
      },
      {
        label: "Chính sách & tự động hoá",
        links: [
          { href: "/tenant-system/work-policies", label: "Chính sách làm việc" },
          { href: "/tenant-system/workflow-rules", label: "Quy tắc tự động" },
        ],
      },
      {
        label: "Kiểm toán",
        links: [{ href: "/tenant-system/checklog", label: "Nhật ký hệ thống" }],
      },
    ],
  },
  {
    id: "library",
    label: "Thư viện",
    href: "/design-system",
    eyebrow: "Hệ thống thiết kế",
    groups: [
      {
        label: "Aurora Ops v3",
        links: [
          { href: "/design-system", label: "Thư viện thành phần" },
          { href: "/design-tokens", label: "Token studio" },
        ],
      },
    ],
  },
];

const ROOT_PREFIX: Record<DomainId, string | null> = {
  overview: null,
  work: "/work-management",
  people: "/hr-management",
  system: "/tenant-system",
  library: "/design-",
};

export function domainOf(pathname: string): NavDomain {
  const found = DOMAINS.find((domain) => {
    const prefix = ROOT_PREFIX[domain.id];
    return prefix === null ? pathname === "/" : pathname.startsWith(prefix);
  });
  return found ?? DOMAINS[0]!;
}

export function pageOf(domain: NavDomain, pathname: string): string {
  const link = domain.groups
    .flatMap((group) => group.links)
    .find((item) => item.href === pathname);
  return link?.label ?? domain.label;
}

export const ALL_LINKS: NavLink[] = DOMAINS.flatMap((domain) =>
  domain.groups.flatMap((group) => group.links),
);

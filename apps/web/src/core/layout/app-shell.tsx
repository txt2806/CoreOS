"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "../context/theme-provider";
import { useToast } from "../context/toast-provider";
import {
  IconBell,
  IconChevronDown,
  IconClose,
  IconLibrary,
  IconLogout,
  IconMenu,
  IconMoon,
  IconOverview,
  IconPeople,
  IconSearch,
  IconSun,
  IconSystem,
  IconWork,
} from "../../icons";
import { CommandPalette } from "./command-palette";
import { OnboardingTour } from "./onboarding-tour";
import { DOMAINS, domainOf, pageOf, type DomainId } from "./nav";

interface SessionActor {
  accountId: string;
  employeeId: string;
  username: string;
  displayName: string;
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  mustChangePassword: boolean;
}

interface SessionResponse {
  actor: SessionActor;
  idleMinutes: number;
  expiresAt: string;
}

const RAIL_ICON: Record<DomainId, (props: { size?: number }) => ReactNode> = {
  overview: IconOverview,
  work: IconWork,
  people: IconPeople,
  system: IconSystem,
  library: IconLibrary,
};

const PANEL_KEY = "oneops.panel";

/** Closes a popover when the pointer leaves it or `Esc` is pressed. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function Rail({ current }: { current: DomainId }) {
  return (
    <nav className="app-rail" aria-label="Khu vực làm việc">
      <Link href="/" className="rail-brand" aria-label="OneOps — về trang tổng quan">
        OO
      </Link>
      <div className="rail-nav">
        {DOMAINS.map((domain) => {
          const Icon = RAIL_ICON[domain.id];
          return (
            <Link
              key={domain.id}
              href={domain.href}
              className="rail-link"
              aria-current={current === domain.id ? "page" : undefined}
            >
              <Icon size={20} />
              <span className="rail-label">{domain.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Panel({
  domain,
  pathname,
  onToggle,
  onNavigate,
}: {
  domain: ReturnType<typeof domainOf>;
  pathname: string;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <aside className="app-panel" aria-label={`Chức năng ${domain.label}`}>
      <div className="spread items-center gap-2">
        <span className="panel-eyebrow">{domain.eyebrow}</span>
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={onToggle}
          aria-label={`Thu gọn danh mục ${domain.label}`}
        >
          <IconClose size={16} />
        </button>
      </div>
      <div className="tabs mt-3 hidden max-[800px]:flex" aria-label="Khu vực">
        {DOMAINS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="tab"
            aria-selected={item.id === domain.id}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {domain.groups.map((group) => (
        <div key={group.label} className="panel-group">
          <span className="panel-group-label">{group.label}</span>
          {group.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="panel-link"
              aria-current={link.href === pathname ? "true" : undefined}
              onClick={onNavigate}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}

function AppearanceMenu() {
  const { mode, density, setMode, setDensity } = useTheme();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  return (
    <div className="popover-anchor" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Giao diện"
        onClick={() => setOpen((value) => !value)}
      >
        {mode === "dark" ? <IconMoon size={18} /> : <IconSun size={18} />}
      </button>
      {open ? (
        <div className="menu" role="menu">
          <span className="menu-group-label">Sắc độ</span>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={mode === "light"}
            className="menu-item"
            onClick={() => setMode("light")}
          >
            <IconSun size={16} /> Nền sáng
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={mode === "dark"}
            className="menu-item"
            onClick={() => setMode("dark")}
          >
            <IconMoon size={16} /> Nền tối
          </button>
          <span className="menu-group-label">Mật độ</span>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={density === "comfortable"}
            className="menu-item"
            onClick={() => setDensity("comfortable")}
          >
            Thoáng
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={density === "compact"}
            className="menu-item"
            onClick={() => setDensity("compact")}
          >
            Gọn
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AccountMenu({
  session,
  unread,
}: {
  session: SessionResponse | null;
  unread: number;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const router = useRouter();
  const { toast } = useToast();
  const actor = session?.actor;

  const signOut = async () => {
    setOpen(false);
    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("logout");
      router.push("/tenant-system/auth");
      router.refresh();
    } catch {
      toast({
        title: "Chưa đăng xuất được",
        description: "Kiểm tra kết nối tới máy chủ rồi thử lại.",
        tone: "error",
      });
    }
  };

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar avatar-sm" aria-hidden="true">
          {(actor?.displayName ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate max-w-[160px]">
          {actor?.displayName ?? "Chưa đăng nhập"}
        </span>
        <IconChevronDown size={14} />
      </button>
      {open ? (
        <div className="menu" role="menu">
          <span className="menu-group-label">
            {actor
              ? `${actor.role === "MANAGER" ? "Quản lý" : "Nhân viên"}${
                  actor.isSystemAdmin ? " · Quản trị hệ thống" : ""
                }`
              : "Phiên làm việc"}
          </span>
          <Link
            href="/tenant-system/accounts"
            className="menu-item"
            role="menuitem"
            onClick={close}
          >
            Tài khoản & mật khẩu
          </Link>
          <Link
            href="/work-management/notifications"
            className="menu-item"
            role="menuitem"
            onClick={close}
          >
            Thông báo
            {unread > 0 ? <span className="panel-count">{unread}</span> : null}
          </Link>
          <button
            type="button"
            className="menu-item"
            role="menuitem"
            onClick={signOut}
          >
            <IconLogout size={16} /> Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const domain = useMemo(() => domainOf(pathname), [pathname]);
  const page = useMemo(() => pageOf(domain, pathname), [domain, pathname]);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [unread, setUnread] = useState(0);

  const bare = pathname.startsWith("/tenant-system/auth");

  useEffect(() => {
    try {
      setPanelCollapsed(
        window.localStorage.getItem(`${PANEL_KEY}.${domain.id}`) === "collapsed",
      );
    } catch {
      setPanelCollapsed(false);
    }
  }, [domain.id]);

  const togglePanel = useCallback(() => {
    setPanelCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(
          `${PANEL_KEY}.${domain.id}`,
          next ? "collapsed" : "open",
        );
      } catch {
        /* Storage is a convenience, not a requirement. */
      }
      return next;
    });
  }, [domain.id]);

  useEffect(() => {
    setPanelOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  useEffect(() => {
    if (bare) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/v1/auth/session", {
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (!response.ok) {
          setSession(null);
          return;
        }
        const body = (await response.json()) as SessionResponse;
        if (cancelled) return;
        setSession(body);
        const bell = await fetch(
          `/api/v1/notifications?recipient=${encodeURIComponent(body.actor.employeeId)}&unread=true&pageSize=100`,
          { credentials: "same-origin" },
        );
        if (cancelled || !bell.ok) return;
        const payload = (await bell.json()) as {
          total?: number;
          items?: unknown[];
        };
        setUnread(payload.total ?? payload.items?.length ?? 0);
      } catch {
        /* The shell degrades to signed-out chrome instead of failing the page. */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname, bare]);

  useEffect(() => {
    if (bare) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bare]);

  if (bare) {
    return (
      <main className="auth-main" id="oneops-main">
        {children}
      </main>
    );
  }

  const showPanel = !panelCollapsed || panelOpen;

  return (
    <>
      {panelOpen ? (
        <div
          className="overlay"
          aria-hidden="true"
          onClick={() => setPanelOpen(false)}
        />
      ) : null}
      <div className="app-shell">
        <Rail current={domain.id} />
        <div className="app-body">
          <header className="app-topbar">
            <div className="row items-center gap-2 min-w-0">
              <button
                type="button"
                className="btn btn-ghost btn-icon hidden max-[800px]:inline-flex"
                aria-label="Mở danh mục chức năng"
                onClick={() => setPanelOpen(true)}
              >
                <IconMenu size={18} />
              </button>
              {panelCollapsed ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-icon max-[800px]:hidden"
                  onClick={togglePanel}
                  aria-label="Mở danh mục chức năng"
                >
                  <IconMenu size={16} />
                </button>
              ) : null}
              <nav
                aria-label="Vị trí hiện tại"
                className="row items-center gap-2 min-w-0"
              >
                <span className="muted truncate">{domain.label}</span>
                <span className="subtle" aria-hidden="true">
                  /
                </span>
                <span className="truncate font-medium">{page}</span>
              </nav>
            </div>
            <div className="row items-center gap-1 ml-auto">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPaletteOpen(true)}
              >
                <IconSearch size={16} />
                <span className="hidden sm:inline">Tìm nhanh</span>
                <kbd className="mono hidden md:inline">Ctrl K</kbd>
              </button>
              <Link
                href="/work-management/notifications"
                className="btn btn-ghost btn-icon"
                aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
              >
                <IconBell size={18} />
                {unread > 0 ? <span className="panel-count">{unread}</span> : null}
              </Link>
              <AppearanceMenu />
              <AccountMenu session={session} unread={unread} />
            </div>
          </header>
          <div className="app-workspace">
            {showPanel ? (
              <Panel
                domain={domain}
                pathname={pathname}
                onToggle={() =>
                  panelOpen ? setPanelOpen(false) : togglePanel()
                }
                onNavigate={() => setPanelOpen(false)}
              />
            ) : null}
            <main className="app-main" id="oneops-main">
              {children}
            </main>
          </div>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {pathname === "/" ? <OnboardingTour storageKey="oneops.tour.shell" /> : null}
    </>
  );
}

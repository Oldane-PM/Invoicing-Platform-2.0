import * as React from "react";
import { Button } from "./components/ui/button";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Toaster } from "sonner";
import {
  Settings,
  LayoutDashboard,
  Users,
  Shield,
  LogOut,
  User as UserIcon,
  ClipboardList,
  Bell,
  Moon,
  ChevronDown,
  FileSignature,
} from "lucide-react";
import { Login } from "./pages/auth/Login";
import { OAuthCallback } from "./pages/auth/OAuthCallback";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { ManagerDashboard } from "./pages/manager/Dashboard";
import { ManagerTeamView } from "./pages/manager/Team";
import { ContractorDashboard } from "./pages/contractor/Dashboard";
import { ContractorProfile } from "./pages/contractor/Profile";
import { SubmitHoursPage } from "./pages/contractor/SubmitHours";
import { ContractorWorkOrders } from "./pages/contractor/WorkOrders";
import { EmployeeDirectory } from "./pages/admin/EmployeeDirectory";
import { UserAccessManagement } from "./pages/admin/UserAccessManagement";

import { AdminWorkOrders } from "./pages/admin/WorkOrders";
import { UnassignedDashboard } from "./pages/unassigned/Dashboard";
import { NotificationBell } from "./components/shared/NotificationBell";
import { NotificationDrawer } from "./components/shared/NotificationDrawer";
import { ThemeToggle } from "./components/shared/ThemeToggle";
import { ContractorDetailDrawer } from "./components/drawers/ContractorDetailDrawer";
import { useAuth } from "./lib/hooks/useAuth";
import { useVendorOnboarding } from "./lib/hooks/contractor/useVendorOnboarding";
import { ContractorOnboarding } from "./pages/contractor/ContractorOnboarding";
import { getUserProfile } from "./lib/supabase/repos/auth.repo";
import type { EmployeeDirectoryRow, ContractorSubmission } from "./lib/types";

// Map a profile role (any casing) to the app's UserRole.
function roleToUserRole(role: string | null | undefined): UserRole {
  switch ((role || "").toUpperCase()) {
    case "ADMIN":
      return "Admin";
    case "MANAGER":
      return "Manager";
    case "CONTRACTOR":
      return "Contractor";
    default:
      return "Unassigned";
  }
}

type Screen = "dashboard" | "directory" | "access" | "work_orders";
type ManagerScreen = "dashboard" | "team";
type ContractorScreen =
  | "dashboard"
  | "profile"
  | "submit-hours"
  | "work_orders";
type UserRole = "Admin" | "Manager" | "Contractor" | "Unassigned" | null;
type AppView = "login" | "oauth-callback" | "app";

function App() {
  // Supabase auth — demo login now signs in with real seeded users.
  const {
    isAuthenticated,
    user,
    signOut,
    loading: authLoading,
    profile,
  } = useAuth();

  const [currentUser, setCurrentUser] = React.useState<UserRole>(null);
  const [currentView, setCurrentView] = React.useState<AppView>("login");
  const [currentScreen, setCurrentScreen] = React.useState<Screen>("dashboard");
  const [managerScreen, setManagerScreen] =
    React.useState<ManagerScreen>("dashboard");
  const [contractorScreen, setContractorScreen] =
    React.useState<ContractorScreen>("dashboard");
  const [contractorProfileTab, setContractorProfileTab] =
    React.useState<string>("personal");
  const [editingSubmission, setEditingSubmission] =
    React.useState<ContractorSubmission | null>(null);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [contractorDrawerOpen, setContractorDrawerOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    React.useState<EmployeeDirectoryRow | null>(null);
  const [employees, setEmployees] = React.useState<EmployeeDirectoryRow[]>([]);

  // We fetch onboarding at the top level so we can use it to block contractor access
  const { data: onboardingData, isLoading: onboardingLoading } = useVendorOnboarding();

  // Filter options - these could come from Supabase in the future
  // const projects: string[] = []; // Unused - kept for future use
  // const managers: string[] = []; // Unused - kept for future use
  // const months: string[] = []; // Unused - kept for future use

  // Get user's display name and initials for all portals
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Use profile full name if available, otherwise fall back to demo/role names
  const displayName =
    profile?.fullName ||
    (currentUser === "Admin"
      ? "Finance Officer"
      : currentUser === "Manager"
        ? "Manager User"
        : currentUser === "Contractor"
          ? "Contractor User"
          : "User");

  const userInitials = getInitials(displayName);

  // Re-usable function to fetch user role from database
  // isInitialLogin: when true, checks loginIntent in sessionStorage (first login only)
  const fetchUserRole = React.useCallback(async () => {
    // BYPASSED FOR DEMO
  }, []);

  // Restore the portal on refresh: if a Supabase session already exists but the
  // app hasn't routed yet, look up the role and drop the user back into their portal.
  React.useEffect(() => {
    if (authLoading || currentView === "oauth-callback") return;
    if (currentUser || !user?.id) return;

    let cancelled = false;
    (async () => {
      const profile = await getUserProfile(user.id);
      if (cancelled) return;
      setCurrentUser(roleToUserRole(profile?.role));
      setCurrentView("app");
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, currentUser, currentView]);

  // Re-fetch role when tab becomes visible and poll every 30s while authenticated
  // This ensures admin role changes take effect without requiring the user to re-login
  React.useEffect(() => {
    // BYPASSED FOR DEMO
  }, [isAuthenticated, user, fetchUserRole]);

  // Handle OAuth callback completion
  const handleAuthComplete = (authRole: string) => {
    if (authRole === "ADMIN") {
      setCurrentUser("Admin");
    } else if (authRole === "MANAGER") {
      setCurrentUser("Manager");
    } else if (authRole === "CONTRACTOR") {
      setCurrentUser("Contractor");
    } else if (authRole === "UNASSIGNED") {
      setCurrentUser("Unassigned");
    }
    setCurrentView("app");
  };

  // Handle demo login was removed for BetterAuth

  // Handle logout for all user types
  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setCurrentScreen("dashboard");
    setManagerScreen("dashboard");
    setContractorScreen("dashboard");
  };

  // Refresh status for unassigned users - reuse fetchUserRole
  const [isRefreshingStatus, setIsRefreshingStatus] = React.useState(false);

  const handleRefreshStatus = async () => {
    setIsRefreshingStatus(true);
    setTimeout(() => {
      setIsRefreshingStatus(false);
    }, 500);
  };

  const handleEmployeeClick = (employee: EmployeeDirectoryRow) => {
    setSelectedEmployee(employee);
    setContractorDrawerOpen(true);
  };

  const handleSaveEmployee = (updatedEmployee: EmployeeDirectoryRow) => {
    setEmployees(
      employees.map((emp) =>
        emp.contractor_id === updatedEmployee.contractor_id
          ? updatedEmployee
          : emp,
      ),
    );
  };

  // handleUserUpdate removed - not currently used

  // Check URL for OAuth callback
  React.useEffect(() => {
    if (window.location.pathname === "/auth/callback") {
      setCurrentView("oauth-callback");
    }
  }, []);

  // Show OAuth callback screen
  if (currentView === "oauth-callback") {
    return <OAuthCallback onAuthComplete={handleAuthComplete} />;
  }

  // Show login screen if not authenticated
  if (!currentUser) {
    return <Login authLoading={authLoading} />;
  }

  // Unassigned User Portal - Users without a role assignment
  if (currentUser === "Unassigned") {
    return (
      <UnassignedDashboard
        onLogout={handleLogout}
        onRefreshStatus={handleRefreshStatus}
        isRefreshing={isRefreshingStatus}
      />
    );
  }

  // Manager Portal - Limited View
  if (currentUser === "Manager") {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <Toaster position="top-right" />

        {/* Manager Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">
                  Welcome, {displayName}
                </h1>
                <p className="text-xs md:text-sm text-gray-600">
                  Admin Portal — Review and approve submissions
                </p>
              </div>
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <NotificationBell onClick={() => setNotificationsOpen(true)} />
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-gray-100 rounded-lg w-9 h-9 md:w-10 md:h-10"
                >
                  <Settings
                    className="w-4 h-4 md:w-5 md:h-5 text-gray-600"
                    strokeWidth={2}
                  />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 md:h-10 px-2 md:px-3 hover:bg-gray-100 rounded-lg"
                    >
                      <Avatar className="w-7 h-7 md:w-8 md:h-8 bg-blue-100">
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs md:text-sm">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Manager Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setManagerScreen("dashboard")}
                className={`flex items-center gap-2 px-3 md:px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                  managerScreen === "dashboard"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="font-medium text-sm md:text-base">
                  Dashboard
                </span>
              </button>
              <button
                onClick={() => setManagerScreen("team")}
                className={`flex items-center gap-2 px-3 md:px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                  managerScreen === "team"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="font-medium text-sm md:text-base">
                  Contractors
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Manager Content */}
        <main className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {managerScreen === "dashboard" && <ManagerDashboard />}
          {managerScreen === "team" && (
            <ManagerTeamView
              onContractorClick={(member) => {
                // Map TeamContractor to EmployeeDirectoryRow format expected by the drawer
                const mappedEmployee: EmployeeDirectoryRow = {
                  contractor_id: member.id, // ID is the profile ID in both cases
                  full_name: member.fullName,
                  email: member.email,
                  role: "Contractor", // default
                  contract_start: member.contractStart
                    ? new Date(member.contractStart).toISOString()
                    : undefined,
                  contract_end: member.contractEnd
                    ? new Date(member.contractEnd).toISOString()
                    : undefined,
                  rate_type: member.contractType as "Hourly" | "Fixed",
                  hourly_rate:
                    member.contractType === "Hourly"
                      ? member.hourlyRate
                      : undefined,
                  fixed_rate:
                    member.contractType === "Fixed"
                      ? member.hourlyRate
                      : undefined,
                  contract_type: member.contractType,
                  reporting_manager_id: user?.id || undefined,
                  reporting_manager_name: displayName,
                  position: "Contractor",
                  department: "Engineering",
                  status: "Active", // required by type
                  joined_at: member.contractStart
                    ? new Date(member.contractStart).toISOString()
                    : new Date().toISOString(), // required by type
                };
                handleEmployeeClick(mappedEmployee);
              }}
            />
          )}
        </main>

        {/* Drawers */}
        <NotificationDrawer
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          onNavigateToNotification={(notification) => {
            if (notification.eventType === "w8ben_uploaded") {
              setManagerScreen("team");
            } else {
              setManagerScreen("dashboard");
            }
          }}
        />
        <ContractorDetailDrawer
          open={contractorDrawerOpen}
          onOpenChange={setContractorDrawerOpen}
          employee={selectedEmployee}
          onSave={handleSaveEmployee}
        />
      </div>
    );
  }

  // Contractor Portal - Simple View
  if (currentUser === "Contractor") {
    if (onboardingLoading) {
      return (
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      );
    }

    if (!onboardingData?.onboarding_completed_at) {
      return (
        <div className="min-h-screen bg-[#F9FAFB]">
          <Toaster position="top-right" />
          <ContractorOnboarding />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <Toaster position="top-right" />

        {/* Contractor Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-[#EAEAEA]">
          <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
              {/* Left Section */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm md:text-base">
                  Welcome, {displayName}
                </p>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 flex-wrap">
                {/* Contractor Work Orders Button */}
                <Button
                  variant="ghost"
                  onClick={() =>
                    setContractorScreen(
                      contractorScreen === "work_orders"
                        ? "dashboard"
                        : "work_orders",
                    )
                  }
                  className={`h-8 md:h-9 px-2 md:px-4 rounded-lg transition-colors ${
                    contractorScreen === "work_orders"
                      ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <ClipboardList className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
                  <span className="hidden md:inline">Work Orders</span>
                </Button>

                {/* Contractor Profile Button */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setContractorProfileTab("personal");
                    setContractorScreen(
                      contractorScreen === "profile" ? "dashboard" : "profile",
                    );
                  }}
                  className={`h-8 md:h-9 px-2 md:px-4 rounded-lg transition-colors ${
                    contractorScreen === "profile"
                      ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <UserIcon className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
                  <span className="hidden md:inline">Contractor Profile</span>
                </Button>

                {/* Notifications */}
                <NotificationBell onClick={() => setNotificationsOpen(true)} />

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Avatar Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-gray-100 rounded-lg w-9 h-9 md:w-10 md:h-10"
                    >
                      <Avatar className="w-8 h-8 md:w-10 md:h-10 bg-purple-100">
                        <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold text-xs md:text-sm">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => {
                        setContractorProfileTab("personal");
                        setContractorScreen("profile");
                      }}
                    >
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Contractor Content */}
        <main className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {contractorScreen === "dashboard" && (
            <ContractorDashboard
              onNavigateToSubmit={() => {
                setEditingSubmission(null); // Clear any existing submission
                setContractorScreen("submit-hours");
              }}
              onEditSubmission={(submission) => {
                setEditingSubmission(submission);
                setContractorScreen("submit-hours");
              }}
            />
          )}
          {contractorScreen === "profile" && (
            <ContractorProfile
              onCancel={() => setContractorScreen("dashboard")}
              initialTab={contractorProfileTab}
            />
          )}
          {contractorScreen === "submit-hours" && (
            <SubmitHoursPage
              editingSubmission={editingSubmission}
              onCancel={() => {
                setEditingSubmission(null);
                setContractorScreen("dashboard");
              }}
              onSuccess={() => {
                setEditingSubmission(null);
                setContractorScreen("dashboard");
              }}
            />
          )}
          {contractorScreen === "work_orders" && (
            <ContractorWorkOrders
              onBack={() => setContractorScreen("dashboard")}
            />
          )}
        </main>

        {/* Drawers */}
        <NotificationDrawer
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          onNavigateToNotification={(notification) => {
            if (notification.eventType === "work_order_sent") {
              setContractorScreen("work_orders");
            } else {
              setContractorScreen("dashboard");
            }
          }}
        />
      </div>
    );
  }

  // Admin Portal - Full Access
  return (
    <div className="h-screen overflow-hidden bg-[#F9FAFB] flex">
      <Toaster position="top-right" />

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-[#EAEAEA] flex flex-col hidden md:flex h-full">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <FileSignature className="text-blue-600 w-7 h-7" strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-lg text-gray-900">Invoice App</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setCurrentScreen("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                currentScreen === "dashboard"
                  ? "bg-[#F3F4F6] text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentScreen("directory")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                currentScreen === "directory"
                  ? "bg-[#F3F4F6] text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Employee Directory</span>
            </button>
            <button
              onClick={() => setCurrentScreen("access")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                currentScreen === "access"
                  ? "bg-[#F3F4F6] text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Shield className="w-5 h-5" />
              <span>User Access</span>
            </button>
            <button
              onClick={() => setCurrentScreen("work_orders")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                currentScreen === "work_orders"
                  ? "bg-[#F3F4F6] text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span>Work Orders</span>
            </button>
          </nav>

          <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">SYSTEM</h3>
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>
              <button 
                onClick={() => setNotificationsOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <div className="relative">
                  <Bell className="w-5 h-5" />
                </div>
                <span>Notifications</span>
              </button>
            </nav>
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-[#EAEAEA]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                <Avatar className="w-9 h-9 bg-blue-50">
                  <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">Finance Officer</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#F9FAFB] pt-6 pb-4 border-b border-[#EAEAEA] mb-6">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Welcome back, {displayName}
              </h1>
              <p className="text-sm text-gray-500">
                Here's what's happening with your invoicing platform today.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <NotificationBell 
                  onClick={() => setNotificationsOpen(true)}
                  className="text-gray-500 hover:text-gray-700 bg-white border border-[#EAEAEA] rounded-full w-10 h-10 shadow-sm flex items-center justify-center"
                  iconClassName="w-5 h-5"
                  badgeClassName="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center bg-blue-600 border-2 border-white rounded-full hover:bg-blue-600"
                />
              </div>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 bg-white border border-[#EAEAEA] rounded-full w-10 h-10 shadow-sm">
                <Moon className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 bg-white border border-[#EAEAEA] rounded-full w-10 h-10 shadow-sm">
                <Settings className="w-5 h-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 px-2 pr-3 hover:bg-gray-50 rounded-full flex items-center gap-2 border border-[#EAEAEA] bg-white shadow-sm ml-2">
                    <Avatar className="w-7 h-7 bg-blue-50">
                      <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-[1440px] mx-auto px-4 md:px-8 pb-6 w-full flex-1">
          {currentScreen === "dashboard" && <AdminDashboard />}
          {currentScreen === "directory" && (
            <EmployeeDirectory onEmployeeClick={handleEmployeeClick} />
          )}
          {currentScreen === "access" && <UserAccessManagement />}
          {currentScreen === "work_orders" && <AdminWorkOrders />}
        </main>
      </div>

      {/* Drawers */}
      <NotificationDrawer
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        onNavigateToNotification={(notification) => {
          if (notification.eventType === "w8ben_uploaded") {
            setCurrentScreen("directory");
          } else {
            setCurrentScreen("dashboard");
          }
        }}
      />
      <ContractorDetailDrawer
        open={contractorDrawerOpen}
        onOpenChange={setContractorDrawerOpen}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
      />
    </div>
  );
}

export default App;

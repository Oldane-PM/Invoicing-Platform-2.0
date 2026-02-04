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
  Calendar,
  Briefcase,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Login } from "./pages/auth/Login";
import { OAuthCallback } from "./pages/auth/OAuthCallback";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { ManagerDashboard } from "./pages/manager/Dashboard";
import { ManagerTeamView } from "./pages/manager/Team";
import { ContractorDashboard } from "./pages/contractor/Dashboard";
import { ContractorProfile } from "./pages/contractor/Profile";
import { SubmitHoursPage } from "./pages/contractor/SubmitHours";
import { EmployeeDirectory } from "./pages/admin/EmployeeDirectory";
import { UserAccessManagement } from "./pages/admin/UserAccessManagement";
import { AdminCalendar } from "./pages/admin/Calendar";
import { AdminProjects } from "./pages/admin/Projects";
import { UnassignedDashboard } from "./pages/unassigned/Dashboard";
import { NotificationBell } from "./components/shared/NotificationBell";
import { NotificationDrawer } from "./components/shared/NotificationDrawer";
import { ContractorDetailDrawer } from "./components/drawers/ContractorDetailDrawer";
import { useAuth } from "./lib/hooks/useAuth";
import type { EmployeeDirectoryRow, ContractorSubmission } from "./lib/types";

type Screen = "dashboard" | "directory" | "access" | "calendar" | "projects";
type ManagerScreen = "dashboard" | "team";
type ContractorScreen =
  | "dashboard"
  | "profile"
  | "submit-hours";
type UserRole = "Admin" | "Manager" | "Contractor" | "Unassigned" | null;
type AppView = "login" | "oauth-callback" | "app";

function App() {
  // Supabase auth for Contractor and Manager
  const { isAuthenticated, user, profile, signIn, signOut, loading: authLoading } = useAuth();

  const [currentUser, setCurrentUser] = React.useState<UserRole>(null);
  const [currentView, setCurrentView] = React.useState<AppView>("login");
  const [currentScreen, setCurrentScreen] = React.useState<Screen>("dashboard");
  const [managerScreen, setManagerScreen] =
    React.useState<ManagerScreen>("dashboard");
  const [contractorScreen, setContractorScreen] =
    React.useState<ContractorScreen>("dashboard");
  const [editingSubmission, setEditingSubmission] =
    React.useState<ContractorSubmission | null>(null);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [contractorDrawerOpen, setContractorDrawerOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    React.useState<EmployeeDirectoryRow | null>(null);
  const [employees, setEmployees] = React.useState<EmployeeDirectoryRow[]>([]);

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
  
  const displayName = profile?.fullName 
    || user?.user_metadata?.full_name 
    || user?.email?.split('@')[0] 
    || 'User';
  
  const userInitials = getInitials(displayName);

  // Sync Supabase auth state with currentUser and fetch role from database
  React.useEffect(() => {
    async function fetchUserRole() {
      if (isAuthenticated && user) {
        // User is authenticated via Supabase - fetch their role and is_active status from profiles table
        const { getSupabaseClient } = await import('./lib/supabase/client');
        const supabase = getSupabaseClient();
        
        const { data: appUser, error } = await supabase
          .from('profiles')
          .select('role, is_active')
          .eq('email', user.email)  // Use email instead of ID since Better Auth IDs don't match generated UUIDs
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          // Sign out and show error
          await signOut();
          alert('Unable to fetch user role. Please try again.');
        } else if (appUser) {
          // Double-check is_active status (belt and suspenders approach)
          // This catches any disabled users who briefly got authenticated
          if (appUser.is_active === false) {
            console.log('[App] Disabled user detected, signing out');
            await signOut();
            // Don't set currentUser - keep them on login page
            return;
          }
          
          // Map database role to app role
          const roleMap: Record<string, UserRole> = {
            'unassigned': 'Unassigned',
            'admin': 'Admin',
            'manager': 'Manager',
            'contractor': 'Contractor',
          };
          // Handle both uppercase (DB) and lowercase - default to Unassigned for unknown roles
          const userRole = roleMap[appUser.role.toLowerCase()] || 'Unassigned';
          
          // Validate that user is logging in through the correct option
          // This prevents admins from logging in through "Contractor" and vice versa
          // Allow unassigned users to log in through any option - they'll be redirected appropriately
          const loginIntent = sessionStorage.getItem('loginIntent');
          if (loginIntent && loginIntent !== userRole && userRole !== 'Unassigned') {
            // User tried to log in through wrong option
            await signOut();
            alert(`You cannot log in as ${loginIntent}. Please use the ${userRole} login option.`);
            sessionStorage.removeItem('loginIntent');
          } else {
            setCurrentUser(userRole);
            sessionStorage.removeItem('loginIntent');
          }
        }
      } else if (!authLoading && currentUser && !isAuthenticated) {
        // User was logged out from Supabase
        setCurrentUser(null);
      }
    }

    fetchUserRole();
  }, [isAuthenticated, user, authLoading, signOut]);

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

  // Handle logout for all user types
  const handleLogout = async () => {
    if (currentUser === "Contractor" || currentUser === "Manager" || currentUser === "Unassigned" || currentUser === "Admin") {
      // Sign out from Supabase for all authenticated users
      await signOut();
    }
    setCurrentUser(null);
    setCurrentScreen("dashboard");
    setManagerScreen("dashboard");
    setContractorScreen("dashboard");
  };
  
  // Refresh status for unassigned users - refetch role from database
  const [isRefreshingStatus, setIsRefreshingStatus] = React.useState(false);
  
  const handleRefreshStatus = async () => {
    if (!user) return;
    
    setIsRefreshingStatus(true);
    try {
      const { getSupabaseClient } = await import('./lib/supabase/client');
      const supabase = getSupabaseClient();
      
      const { data: appUser, error } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('email', user.email)  // Use email instead of ID
        .single();
      
      if (error) {
        console.error('Error refreshing user role:', error);
        return;
      }
      
      if (appUser) {
        // Check if role has changed from unassigned
        const roleMap: Record<string, UserRole> = {
          'unassigned': 'Unassigned',
          'admin': 'Admin',
          'manager': 'Manager',
          'contractor': 'Contractor',
        };
        const newRole = roleMap[appUser.role.toLowerCase()] || 'Unassigned';
        
        if (newRole !== 'Unassigned') {
          setCurrentUser(newRole);
        }
      }
    } catch (err) {
      console.error('Error refreshing status:', err);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleEmployeeClick = (employee: EmployeeDirectoryRow) => {
    setSelectedEmployee(employee);
    setContractorDrawerOpen(true);
  };

  const handleSaveEmployee = (updatedEmployee: EmployeeDirectoryRow) => {
    setEmployees(
      employees.map((emp) =>
        emp.contractor_id === updatedEmployee.contractor_id ? updatedEmployee : emp
      )
    );
  };

  // handleUserUpdate removed - not currently used

  const getPageInfo = () => {
    switch (currentScreen) {
      case "dashboard":
        return {
          title: `Welcome, ${displayName}`,
          subtitle: "Admin Dashboard — System overview and financial monitoring",
        };
      case "directory":
        return {
          title: "Employee Directory",
          subtitle: "Manage contractor information and contracts",
        };
      case "access":
        return {
          title: "User Access",
          subtitle: "Control user roles and permissions",
        };
      case "calendar":
        return {
          title: "Calendar",
          subtitle:
            "Manage holidays and special time off that affect employee submissions",
        };
      case "projects":
        return {
          title: "Projects",
          subtitle: "Manage projects and track resources",
        };
      default:
        return { title: "", subtitle: "" };
    }
  };

  const pageInfo = getPageInfo();

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
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">
                  Welcome, {displayName}
                </h1>
                <p className="text-xs md:text-sm text-gray-600">
                  Manager Portal — Review and approve team submissions
                </p>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <NotificationBell onClick={() => setNotificationsOpen(true)} />
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
            <div className="flex gap-1 overflow-x-auto">
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
                  My Team
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Manager Content */}
        <main className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {managerScreen === "dashboard" && <ManagerDashboard />}
          {managerScreen === "team" && <ManagerTeamView />}
        </main>

        {/* Drawers */}
        <NotificationDrawer
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          onNavigateToSubmission={(submissionId) => {
            // Admin: Navigate to dashboard (submission details handled by AdminDashboard component)
            setCurrentScreen('dashboard');
            console.log('[Admin] Navigate to submission:', submissionId);
          }}
        />
      </div>
    );
  }

  // Contractor Portal - Simple View
  if (currentUser === "Contractor") {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <Toaster position="top-right" />

        {/* Contractor Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-[#EAEAEA]">
          <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-16 md:h-[72px] flex items-center justify-between">
            {/* Left Section */}
            <div>
              <p className="font-semibold text-gray-900 text-sm md:text-base">
                Welcome, {displayName}
              </p>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Contractor Profile Button */}
              <Button
                variant="ghost"
                onClick={() =>
                  setContractorScreen(
                    contractorScreen === "profile" ? "dashboard" : "profile"
                  )
                }
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
                    onClick={() => setContractorScreen("profile")}
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
        </main>

        {/* Drawers */}
        <NotificationDrawer
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          onNavigateToSubmission={(submissionId) => {
            // Manager: Navigate to dashboard
            setManagerScreen('dashboard');
            console.log('[Manager] Navigate to submission:', submissionId);
          }}
        />
      </div>
    );
  }

  // Admin Portal - Full Access
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Toaster position="top-right" />

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">
                {pageInfo.title}
              </h1>
              <p className="text-xs md:text-sm text-gray-600">
                {pageInfo.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <NotificationBell onClick={() => setNotificationsOpen(true)} />
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
                    <Avatar className="w-7 h-7 md:w-8 md:h-8 bg-purple-100">
                      <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold text-xs md:text-sm">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setCurrentScreen("dashboard")}
              className={`flex items-center gap-2 px-3 md:px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                currentScreen === "dashboard"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="font-medium text-sm md:text-base">
                Dashboard
              </span>
            </button>
            <button
              onClick={() => setCurrentScreen("directory")}
              className={`flex items-center gap-2 px-3 md:px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                currentScreen === "directory"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="font-medium text-sm md:text-base">
                <span className="hidden sm:inline">Employee </span>Directory
              </span>
            </button>
            <button
              onClick={() => setCurrentScreen("access")}
              className={`flex items-center gap-2 px-3 md:px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                currentScreen === "access"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="font-medium text-sm md:text-base">
                <span className="hidden sm:inline">User </span>Access
              </span>
            </button>
            <button
              onClick={() => setCurrentScreen("calendar")}
              className={`flex items-center gap-2 px-3 md:px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                currentScreen === "calendar"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="font-medium text-sm md:text-base">Calendar</span>
            </button>
            <button
              onClick={() => setCurrentScreen("projects")}
              className={`flex items-center gap-2 px-3 md:px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                currentScreen === "projects"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span className="font-medium text-sm md:text-base">Projects</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {currentScreen === "dashboard" && (
          <AdminDashboard />
        )}
        {currentScreen === "directory" && (
          <EmployeeDirectory onEmployeeClick={handleEmployeeClick} />
        )}
        {currentScreen === "access" && <UserAccessManagement />}
        {currentScreen === "calendar" && <AdminCalendar />}
        {currentScreen === "projects" && <AdminProjects />}
      </main>

      {/* Drawers */}
      <NotificationDrawer
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        onNavigateToSubmission={(submissionId) => {
          // Contractor: Navigate to dashboard
          setContractorScreen('dashboard');
          console.log('[Contractor] Navigate to submission:', submissionId);
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

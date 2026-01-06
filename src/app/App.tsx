import * as React from "react";
import { Button } from "./components/ui/button";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Toaster } from "sonner";
import {
  Bell,
  Settings,
  LayoutDashboard,
  Users,
  Shield,
  Calendar,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Login } from "./components/pages/Login";
import { AdminDashboard } from "./components/pages/AdminDashboard";
import { ManagerDashboard } from "./components/pages/ManagerDashboard";
import { ManagerTeamView } from "./components/pages/ManagerTeamView";
import { ContractorDashboard } from "./components/pages/ContractorDashboard";
import { ContractorProfile } from "./components/pages/ContractorProfile";
import { SubmitHoursPage } from "./components/pages/SubmitHoursPage";
import { EmployeeDirectory } from "./components/pages/EmployeeDirectory";
import { UserAccessManagement } from "./components/pages/UserAccessManagement";
import { AdminCalendar } from "./components/pages/AdminCalendar";
import { NotificationsDrawer } from "./components/pages/NotificationsDrawer";
import { ContractorDetailDrawer } from "./components/pages/ContractorDetailDrawer";
import {
  mockMetrics,
  mockSubmissions,
  projects,
  managers,
  months,
  mockEmployees,
  mockUsers,
  mockNotifications,
} from "./data/mockData";
import type { Employee, User } from "./types";

type Screen = "dashboard" | "directory" | "access" | "calendar";
type ManagerScreen = "dashboard" | "team";
type ContractorScreen = "dashboard" | "profile" | "submit-hours";
type UserRole = "Admin" | "Manager" | "Contractor" | null;

function App() {
  const [currentUser, setCurrentUser] = React.useState<UserRole>(null);
  const [currentScreen, setCurrentScreen] = React.useState<Screen>("dashboard");
  const [managerScreen, setManagerScreen] = React.useState<ManagerScreen>("dashboard");
  const [contractorScreen, setContractorScreen] = React.useState<ContractorScreen>("dashboard");
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [contractorDrawerOpen, setContractorDrawerOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [employees, setEmployees] = React.useState(mockEmployees);
  const [users, setUsers] = React.useState(mockUsers);

  const unreadCount = mockNotifications.filter((n) => !n.read).length;
  const currentUserId = "USER-004"; // John Administrator

  const handleLogin = (username: string) => {
    setCurrentUser(username as UserRole);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen("dashboard");
  };

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setContractorDrawerOpen(true);
  };

  const handleSaveEmployee = (updatedEmployee: Employee) => {
    setEmployees(
      employees.map((emp) =>
        emp.id === updatedEmployee.id ? updatedEmployee : emp
      )
    );
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
  };

  const getPageInfo = () => {
    switch (currentScreen) {
      case "dashboard":
        return {
          title: "Admin Dashboard",
          subtitle: "System overview and financial monitoring",
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
          subtitle: "Manage holidays and special time off that affect employee submissions",
        };
      default:
        return { title: "", subtitle: "" };
    }
  };

  const pageInfo = getPageInfo();

  // Show login screen if not authenticated
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
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
                  Manager Portal
                </h1>
                <p className="text-xs md:text-sm text-gray-600">Review and approve team submissions</p>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hover:bg-gray-100 rounded-lg w-9 h-9 md:w-10 md:h-10"
                  onClick={() => setNotificationsOpen(true)}
                >
                  <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-600" strokeWidth={2} />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs border-2 border-white">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-gray-100 rounded-lg w-9 h-9 md:w-10 md:h-10"
                >
                  <Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-600" strokeWidth={2} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 md:h-10 px-2 md:px-3 hover:bg-gray-100 rounded-lg"
                    >
                      <Avatar className="w-7 h-7 md:w-8 md:h-8 bg-blue-100">
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs md:text-sm">
                          MG
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
                <span className="font-medium text-sm md:text-base">Dashboard</span>
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
                <span className="font-medium text-sm md:text-base">My Team</span>
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
        <NotificationsDrawer
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          notifications={mockNotifications}
        />
      </div>
    );
  }

  // Contractor Portal - Simple View
  if (currentUser === "Contractor") {
    const lastLogin = "Jan 31, 2026 at 9:14 AM";
    
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <Toaster position="top-right" />

        {/* Contractor Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-[#EAEAEA]">
          <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-16 md:h-[72px] flex items-center justify-between">
            {/* Left Section */}
            <div>
              <p className="font-semibold text-gray-900 text-sm md:text-base">Welcome, Sarah</p>
              <p className="text-xs md:text-sm text-gray-500 hidden sm:block">Last login: {lastLogin}</p>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Contractor Profile Button */}
              <Button
                variant="ghost"
                onClick={() => setContractorScreen(contractorScreen === "profile" ? "dashboard" : "profile")}
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
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-gray-100 rounded-lg w-9 h-9 md:w-10 md:h-10"
                onClick={() => setNotificationsOpen(true)}
              >
                <Bell className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs border-2 border-white">
                    {unreadCount}
                  </Badge>
                )}
              </Button>

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
                        SJ
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setContractorScreen("profile")}>
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
            <ContractorDashboard onNavigateToSubmit={() => setContractorScreen("submit-hours")} />
          )}
          {contractorScreen === "profile" && (
            <ContractorProfile onCancel={() => setContractorScreen("dashboard")} />
          )}
          {contractorScreen === "submit-hours" && (
            <SubmitHoursPage onCancel={() => setContractorScreen("dashboard")} />
          )}
        </main>

        {/* Drawers */}
        <NotificationsDrawer
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          notifications={mockNotifications}
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
              <p className="text-xs md:text-sm text-gray-600">{pageInfo.subtitle}</p>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-gray-100 rounded-lg w-9 h-9 md:w-10 md:h-10"
                onClick={() => setNotificationsOpen(true)}
              >
                <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-600" strokeWidth={2} />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs border-2 border-white">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-gray-100 rounded-lg w-9 h-9 md:w-10 md:h-10"
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-600" strokeWidth={2} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 md:h-10 px-2 md:px-3 hover:bg-gray-100 rounded-lg"
                  >
                    <Avatar className="w-7 h-7 md:w-8 md:h-8 bg-purple-100">
                      <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold text-xs md:text-sm">
                        JA
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
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
              <span className="font-medium text-sm md:text-base">Dashboard</span>
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
              <span className="font-medium text-sm md:text-base"><span className="hidden sm:inline">Employee </span>Directory</span>
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
              <span className="font-medium text-sm md:text-base"><span className="hidden sm:inline">User </span>Access</span>
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {currentScreen === "dashboard" && (
          <AdminDashboard
            metrics={mockMetrics}
            submissions={mockSubmissions}
            projects={projects}
            managers={managers}
            months={months}
          />
        )}
        {currentScreen === "directory" && (
          <EmployeeDirectory
            employees={employees}
            onEmployeeClick={handleEmployeeClick}
          />
        )}
        {currentScreen === "access" && (
          <UserAccessManagement
            users={users}
            currentUserId={currentUserId}
            onUserUpdate={handleUserUpdate}
          />
        )}
        {currentScreen === "calendar" && <AdminCalendar />}
      </main>

      {/* Drawers */}
      <NotificationsDrawer
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        notifications={mockNotifications}
      />
      <ContractorDetailDrawer
        open={contractorDrawerOpen}
        onOpenChange={setContractorDrawerOpen}
        employee={selectedEmployee}
        submissions={mockSubmissions}
        onSave={handleSaveEmployee}
      />
    </div>
  );
}

export default App;
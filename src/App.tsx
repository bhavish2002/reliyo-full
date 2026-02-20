import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import VerifyOtp from "./pages/VerifyOtp";
import Dashboard from "./pages/Dashboard";
import CreateTask from "./pages/CreateTask";
import MyTasks from "./pages/MyTasks";
import BrowseTasks from "./pages/BrowseTasks";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import TaskDetail from "./pages/TaskDetail";
import NotFound from "./pages/NotFound";
import PaymentGateway from "./pages/PaymentGateway";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAllTasks from "./pages/admin/AdminAllTasks";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDisputes from "./pages/admin/AdminDisputes";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-task" element={<CreateTask />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/browse-tasks" element={<BrowseTasks />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/task/:id" element={<TaskDetail />} />
          <Route path="/payment" element={<PaymentGateway />} />
          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/tasks" element={<AdminAllTasks />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/disputes" element={<AdminDisputes />} />
          <Route path="/admin/revenue" element={<AdminRevenue />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import ReadMe from './pages/ReadMe';
import Login from './pages/Login';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import { Shell } from '@/components/layout/Shell';
import { useCurrentUser } from '@/hooks/useCurrentUser';

import Dashboard from '@/pages/Dashboard';
import CollegeSearch from '@/pages/colleges/CollegeSearch';
import CollegeDetail from '@/pages/colleges/CollegeDetail';
import SubjectSearch from '@/pages/subjects/SubjectSearch';
import ProposalsList from '@/pages/proposals/ProposalsList';
import ProposalDetail from '@/pages/proposals/ProposalDetail';
import EmailHistory from '@/pages/email-history/EmailHistory';

const queryClient = new QueryClient();

function AuthedRoutes() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <Shell user={user}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/colleges" component={CollegeSearch} />
        <Route path="/colleges/:id" component={CollegeDetail} />
        <Route path="/subjects" component={SubjectSearch} />
        <Route path="/proposals" component={ProposalsList} />
        <Route path="/proposals/:id" component={ProposalDetail} />
        <Route path="/email-history" component={EmailHistory} />
        <Route path="/readme" component={ReadMe} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <AuthedRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
        <Toaster />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;

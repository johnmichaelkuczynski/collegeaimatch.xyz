import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import ReadMe from './pages/ReadMe';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import { Shell } from '@/components/layout/Shell';

import Dashboard from '@/pages/Dashboard';
import CollegeSearch from '@/pages/colleges/CollegeSearch';
import CollegeDetail from '@/pages/colleges/CollegeDetail';
import SubjectSearch from '@/pages/subjects/SubjectSearch';
import ProposalsList from '@/pages/proposals/ProposalsList';
import ProposalDetail from '@/pages/proposals/ProposalDetail';
import EmailHistory from '@/pages/email-history/EmailHistory';

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;

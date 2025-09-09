import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FileUpload from './components/FileUpload';
import Word2VecTraining from './components/Word2VecTraining';
import TermsOfInterest from './components/TermsOfInterest';
import HomePage from './components/HomePage';
import SessionHeader from './components/SessionHeader';
import DashboardLayout from './components/DashboardLayout';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-white">
          <SessionHeader />
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/upload" element={<FileUpload />} />
              <Route path="/terms" element={<TermsOfInterest />} />
              <Route path="/shifts" element={<Word2VecTraining />} />
            </Routes>
          </DashboardLayout>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserLookup from './components/UserLookup';
import DraftAssistant from './components/DraftAssistant';

const queryClient = new QueryClient();

function App() {
  const [view, setView] = useState('lookup');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  function handleLeagueSelect(league, user) {
    setSelectedLeague(league);
    setCurrentUser(user);
    setView('draft');
  }

  function handleBack() {
    setView('lookup');
    setSelectedLeague(null);
  }

  return (
    <QueryClientProvider client={queryClient}>
      {view === 'lookup' && <UserLookup onLeagueSelect={handleLeagueSelect} />}
      {view === 'draft' && (
        <DraftAssistant
          league={selectedLeague}
          user={currentUser}
          onBack={handleBack}
        />
      )}
    </QueryClientProvider>
  );
}

export default App;

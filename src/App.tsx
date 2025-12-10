import { ToastProvider } from './components/Providers/ToastProvider';
import { Sprout, Github, Twitter, BookOpen, Home } from 'lucide-react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { About } from './pages/about';
import GameDashboard from './components/GameDashboard';
import { WalletConnectButton } from './components/Wallet/WalletConnectButton';
import { WalletSelectModal } from './components/Modals/WalletSelectModal';
import { SporeLogo } from './components/Logo/SporeLogo';

function App() {

  return (
    <BrowserRouter>
      <ToastProvider />
      <WalletSelectModal />

      <div className="min-h-screen bg-background">

        {/* HEADER */}
        <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">

              {/* Logo */}
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <SporeLogo size={60} />

                <div className='hidden md:block'>
                  <h1 className="text-2xl font-bold text-text">SporeFates</h1>
                  <p className="text-xs text-textSecondary">Evolve Your Mushroom NFTs</p>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1 bg-surface border border-border rounded-full px-2 py-1">
                <Link to="/" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text hover:text-primary rounded-full hover:bg-background transition-all">
                  <Home size={16} /> Colony
                </Link>
                <Link to="/about" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text hover:text-primary rounded-full hover:bg-background transition-all">
                  <BookOpen size={16} /> Rules & Mechanics
                </Link>
              </nav>

              {/* Socials & Connect */}
              <div className="flex items-center gap-4">
                <div className="hidden md:flex gap-2">
                  <a href="https://github.com/danvaneijck/spore-fates" target="_blank" rel="noreferrer" className="p-2 hover:bg-background rounded-lg transition-colors">
                    <Github size={20} className="text-textSecondary hover:text-text" />
                  </a>
                  <a href="https://x.com/trippy_inj" target="_blank" rel="noreferrer" className="p-2 hover:bg-background rounded-lg transition-colors">
                    <Twitter size={20} className="text-textSecondary hover:text-text" />
                  </a>
                </div>
                <WalletConnectButton />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto px-4 sm:px-6 lg:px-10 ">
          <Routes>
            <Route path="/about" element={<About />} />
            <Route path="/*" element={<GameDashboard />} />
          </Routes>
        </main>

        <footer className="border-t border-border mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-sm text-textSecondary">
              <p>Built on Injective Protocol • Powered by CosmWasm</p>
              <p className="mt-2">© 2025 SporeFates. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
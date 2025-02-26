
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Moon, Sun, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [isDark, setIsDark] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const navigate = useNavigate();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        setIsWalletConnected(true);
      } catch (error) {
        console.error('User denied wallet connection');
      }
    } else {
      window.open('https://metamask.io/download.html', '_blank');
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-purple-700">
              Udyamita
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="text-foreground hover:text-primary"
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-foreground hover:text-primary"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="outline"
              className="flex items-center space-x-2 bg-primary/10 hover:bg-primary/20"
              onClick={connectWallet}
            >
              <Wallet className="h-5 w-5" />
              <span>{isWalletConnected ? 'Connected' : 'Connect Wallet'}</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

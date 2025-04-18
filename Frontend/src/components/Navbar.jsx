import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Wallet, Github } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";

export default function Navbar() {
  const [isDark, setIsDark] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Load wallet from localStorage
    const savedWallet = localStorage.getItem("wallet_address");
    if (savedWallet) setWalletAddress(savedWallet);

    // Check GitHub authentication status
    checkGitHubAuthStatus();
  }, []);

  // Check if user is authenticated with GitHub
  const checkGitHubAuthStatus = async () => {
    try {
      // First check if we have stored token from previous authentication
      const savedGithubToken = localStorage.getItem("github_token");

      if (savedGithubToken) {
        // Verify token is still valid by making a test API call
        try {
          const response = await fetch("https://api.github.com/user", {
            headers: { Authorization: `token ${savedGithubToken}` },
          });

          if (response.ok) {
            setIsGithubConnected(true);
            return;
          } else {
            // Token is invalid, remove it
            localStorage.removeItem("github_token");
          }
        } catch (error) {
          console.error("GitHub token validation failed:", error);
          localStorage.removeItem("github_token");
        }
      }

      // Try to get user from session
      const sessionResponse = await axios.get('http://localhost:5000/user', {
        withCredentials: true
      });

      if (sessionResponse.data && sessionResponse.data.accessToken) {
        localStorage.setItem("github_token", sessionResponse.data.accessToken);
        setIsGithubConnected(true);
      } else {
        setIsGithubConnected(false);
      }
    } catch (error) {
      // User is not authenticated with the server
      setIsGithubConnected(false);

      // Check for OAuth callback code in URL (for client-side flow)
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get("code");

      if (code) {
        handleGitHubCallback(code);
      }
    }
  };

  const handleGitHubCallback = async (code) => {
    try {
      const response = await axios.get(`http://localhost:5000/auth/github/callback?code=${code}`);

      if (response.data && response.data.accessToken) {
        localStorage.setItem("github_token", response.data.accessToken);
        setIsGithubConnected(true);
        toast({
          title: "GitHub Connected",
          description: "GitHub login successful!"
        });

        // Clean up the URL
        const cleanUrl = window.location.pathname;
        navigate(cleanUrl);
      }
    } catch (error) {
      console.error("GitHub authentication failed:", error);
      toast({
        variant: "destructive",
        title: "GitHub Login Failed",
        description: "Please try again."
      });
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setWalletAddress(accounts[0]);
        localStorage.setItem("wallet_address", accounts[0]);

        toast({
          title: "Wallet Connected",
          description: `Connected address: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
      } catch (error) {
        console.error("Wallet connection failed:", error);
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: "Failed to connect MetaMask.",
        });
      }
    } else {
      window.open("https://metamask.io/download.html", "_blank");
    }
  };

  const connectGithub = () => {
    if (isGithubConnected) {
      // If already connected, disconnect
      disconnectGithub();
    } else {
      // Use server-side OAuth flow
      window.location.href = 'http://localhost:5000/auth/github';
    }
  };

  const disconnectGithub = async () => {
    try {
      // Clear local token
      localStorage.removeItem("github_token");

      // Logout from server session
      await axios.get('http://localhost:5000/logout', {
        withCredentials: true
      });

      setIsGithubConnected(false);

      toast({
        title: "GitHub Disconnected",
        description: "Your GitHub account has been disconnected."
      });
    } catch (error) {
      console.error("Failed to disconnect GitHub:", error);
      toast({
        variant: "destructive",
        title: "Disconnect Failed",
        description: "Failed to disconnect GitHub account."
      });
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-purple-700">
              Udyamita
            </h1>
          </div>

          {/* Main Navbar Buttons */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/Leaderboard")}
              className="text-foreground hover:text-primary"
            >
              Leaderboard
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
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
                <span>{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect Wallet"}</span>
              </Button>

              <Button
                variant="outline"
                className="flex items-center space-x-2 bg-primary/10 hover:bg-primary/20"
                onClick={connectGithub}
              >
                <Github className="h-5 w-5" />
                <span>{isGithubConnected ? "Disconnect GitHub" : "Connect GitHub"}</span>
              </Button>
          </div> {/* Closing properly */}
        </div>
      </div>
    </nav>

  );
}
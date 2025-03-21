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
    const savedWallet = localStorage.getItem("wallet_address");
    if (savedWallet) setWalletAddress(savedWallet);

    const savedGithubToken = localStorage.getItem("github_token");
    if (savedGithubToken) {
      setIsGithubConnected(true);
    } else {
      checkGitHubAuth();
    }
  }, []);

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
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = "http://localhost:8080/auth/github/callback";
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user`;

    window.location.href = githubUrl; // Redirect to GitHub OAuth
    localStorage.setItem("github_connecting", "true");
  };

  // Check for GitHub OAuth Callback
  const checkGitHubAuth = async () => {
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get("code");

    if (code) {
      try {
        const response = await axios.get("http://localhost:8080/auth/github/callback", { code });
        localStorage.setItem("github_token", response.data.token);
        setIsGithubConnected(true);
        toast({ title: "GitHub Connected", description: "GitHub login successful!" });
        navigate("/dashboard"); // Redirect user to dashboard
      } catch (error) {
        console.error("GitHub authentication failed:", error);
        toast({ variant: "destructive", title: "GitHub Login Failed", description: "Please try again." });
      }
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

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
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
              <span>{isGithubConnected ? "Connected" : "Connect GitHub"}</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, Github } from "lucide-react";

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const { toast } = useToast();

  // 🔹 Load wallet from localStorage
  useEffect(() => {
    const savedWallet = localStorage.getItem("wallet_address");
    if (savedWallet) setWalletAddress(savedWallet);

    fetchGithubData();
  }, []);

  // 🔹 Fetch GitHub Data (if connected)
  const fetchGithubData = async () => {
    const token = localStorage.getItem("github_token");
    if (!token) return;

    try {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` },
      });
      const data = await res.json();
      setUserData(data);
    } catch (error) {
      console.error("GitHub API Error:", error);
    }
  };

  // 🔹 Connect MetaMask Wallet
  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        // Request permissions to prompt MetaMask for password
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });

        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        const wallet = accounts[0];
        setWalletAddress(wallet);
        localStorage.setItem("wallet_address", wallet);

        toast({
          title: "Wallet Connected",
          description: `Connected to ${wallet}`,
        });
      } catch (error) {
        console.error("MetaMask Connection Error:", error);
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: "Failed to connect to MetaMask wallet.",
        });
      }
    } else {
      window.open("https://metamask.io/download.html", "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 px-4 max-w-7xl mx-auto">
        {/* 🔹 Existing Dashboard Components */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Your Contribution Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={70} />
              <p className="text-muted-foreground">Level Progress: 70%</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">You have contributed to 5 projects.</p>
            </CardContent>
          </Card>
        </div>

        {/* 🔹 New Section: Wallet & GitHub Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Wallet Info */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-6 w-6" /> Wallet Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {walletAddress ? (
                <p className="text-lg">{walletAddress}</p>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md"
                >
                  Connect Wallet
                </button>
              )}
            </CardContent>
          </Card>

          {/* GitHub Profile Info */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-6 w-6" /> GitHub Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <img
                src={userData?.avatar_url || "https://github.com/github.png"}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h3 className="text-xl font-bold">
                  {userData?.name || userData?.login || "Not connected"}
                </h3>
                <p className="text-muted-foreground">
                  {userData?.bio || "No bio available"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🔹 More Existing Components Below (if any) */}
        <div className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You recently reviewed a pull request on Project X.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

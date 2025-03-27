import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, Github, Star, GitFork, Code, ExternalLink, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

// Utility Functions for Contribution Tracking
const calculateLevelAndTitle = (xps) => {
  let level = 0;
  let requiredXps = 0;
  while (requiredXps <= xps) {
    level++;
    requiredXps = (level * (level + 1) * 50);
  }
  level--; // Adjust to the correct level

  const titles = [
    'Apprentice', 'Aspiring', 'Novice', 
    'Enthusiastic', 'Explorer', 'Code Craftsman', 
    'Skilled', 'Proficient', 'Champion', 'Quality',
    'Expert', 'Professional', 'Innovative', 'Veteran', 
    'Rising', 'Master', 'Conquerer', 'Top Tier', 
    'Insightful', 'Legendary', 'SUPREME'
  ];

  const titleIndex = Math.min(Math.floor(level / 5), titles.length - 1);

  return {
    level,
    title: titles[titleIndex],
    nextLevelXps: (level + 1) * ((level + 1) + 1) * 50
  };
};

const determineRole = (totalContributions) => {
  if (totalContributions > 100) return 'Maintainer';
  if (totalContributions > 50) return 'Reviewer';
  return 'Contributor';
};

const calculateStreak = (events) => {
  if (!events || events.length === 0) return 0;

  // Sort events by date (newest first)
  const sortedEvents = events
    .map((event) => new Date(event.created_at).setHours(0, 0, 0, 0)) // Normalize to midnight
    .sort((a, b) => b - a);

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Normalize current date to midnight

  for (let eventDate of sortedEvents) {
    if (eventDate === currentDate.getTime()) {
      // Contribution on the same day → Continue streak
      streak++;
    } else if (eventDate === currentDate.getTime() - 86400000) {
      // Contribution on the previous day → Continue streak
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // Gap detected → End streak
      break;
    }
  }

  return streak;
};


const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [contributionStats, setContributionStats] = useState({
    totalContributions: 0,
    recentContributions: [],
    streak: 0,
    xps: 0,
    role: 'Contributor',
    level: 1,
    title: 'Novice Contributor',
    nextLevelXps: 50
  });

  // 🔹 Utility function to process GitHub user
const processGitHubUser = (user) => {
  if (user && user.accessToken) {
    localStorage.setItem("github_token", user.accessToken);
    
    const processedUserData = {
      name: user.displayName || user.username,
      login: user.username,
      avatar_url: user.photos?.[0]?.value || user._json?.avatar_url,
      bio: user._json?.bio || "No bio available",
      public_repos: user._json?.public_repos || 0,
      followers: user._json?.followers || 0,
      following: user._json?.following || 0,
      html_url: user.profileUrl
    };

    setUserData(processedUserData);
    fetchRepos(user.accessToken);
    fetchContributionStats(user.accessToken);
  }
};

// 🔹 useEffect for GitHub Authentication & Data Fetching
useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search);
  const userParam = searchParams.get("user");

  if (userParam) {
    try {
      const user = JSON.parse(decodeURIComponent(userParam));
      processGitHubUser(user);
      window.history.replaceState({}, document.title, "/dashboard");
    } catch (error) {
      console.error("Failed to parse GitHub user data:", error);
    }
  } else {
    const tokenFromURL = searchParams.get("token");
    if (tokenFromURL) {
      localStorage.setItem("github_token", tokenFromURL);
      window.history.replaceState({}, document.title, "/dashboard");
    }
  }

  loadWallet();
  fetchGithubData();
}, []);

  /*const fetchContributionStats = async (token) => {
    try {
      const query = `
        {
          viewer {
            login
            contributionsCollection {
              contributionCalendar {
                totalContributions
              }
            }
          }
        }
      `;
  
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch contribution stats");
      }
  
      const result = await response.json();
      const totalContributions = result.data.viewer.contributionsCollection.contributionCalendar.totalContributions;
      
      // Calculate XP
      const xps = totalContributions * 50;
  
      // Determine Level and Title
      const { level, title, nextLevelXps } = calculateLevelAndTitle(xps);
  
      // Determine Role
      const role = determineRole(totalContributions);
  
      // Set contribution stats
      setContributionStats({
        xps,
        level,
        title,
        nextLevelXps,
        totalContributions,
        streak: 0, // GitHub API does not provide streaks directly
        role,
        recentContributions: [],
      });
    } catch (error) {
      console.error("GitHub contribution fetch error:", error);
      toast({
        variant: "destructive",
        title: "GitHub Error",
        description: "Failed to fetch contribution data.",
      });
    }
  };*/
  
  const fetchContributionStats = async (token) => {
    try {
        const query = `
        {
            viewer {
                login
                contributionsCollection {
                    contributionCalendar {
                        totalContributions
                    }
                    commitContributionsByRepository {
                        repository {
                            name
                        }
                        contributions {
                            totalCount
                        }
                    }
                }
            }
        }`;

        const response = await fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch contribution stats");
        }

        const result = await response.json();
        const data = result.data.viewer.contributionsCollection;

        // Extract total contributions
        const totalContributions = data.contributionCalendar.totalContributions;

        // Extract recent contributions
        const recentContributions = data.commitContributionsByRepository.map((repo) => ({
            type: `Committed to ${repo.repository.name}`,
            created_at: new Date().toISOString(),
        }));

        // Calculate XP
        const xps = totalContributions * 50;

        // Determine Level and Title
        const { level, title, nextLevelXps } = calculateLevelAndTitle(xps);

        // Determine Role
        const role = determineRole(totalContributions);

        //Determine streak
        const streak = calculateStreak(recentContributions);

        // Set contribution stats
        setContributionStats({
            xps,
            level,
            title,
            nextLevelXps,
            totalContributions,
            streak, // GitHub API does not provide streaks directly
            role,
            recentContributions, // Added recent contributions
        });
    } catch (error) {
        console.error("GitHub contribution fetch error:", error);
        toast({
            variant: "destructive",
            title: "GitHub Error",
            description: "Failed to fetch contribution data.",
        });
    }
};

  const loadWallet = () => {
    const savedWallet = localStorage.getItem("wallet_address");
    if (savedWallet) setWalletAddress(savedWallet);
  };

  const fetchGithubData = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem("github_token");
      if (token) {
        await fetchUserWithToken(token);
        return;
      }
      
      await fetchUserWithSession();
    } catch (error) {
      console.error("GitHub API Error:", error);
      setIsLoading(false);
    }
  };

  const fetchUserWithToken = async (token) => {
    try {
      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` },
      });

      if (!userRes.ok) {
        throw new Error("Failed to fetch GitHub data with token");
      }

      const userData = await userRes.json();
      setUserData(userData);
      
      fetchRepos(token);
      fetchContributions(token);
    } catch (error) {
      console.error("GitHub token auth error:", error);
      localStorage.removeItem("github_token");
      toast({ 
        variant: "destructive", 
        title: "GitHub Session Expired", 
        description: "Please reconnect your GitHub account." 
      });
      setIsLoading(false);
    }
  };

  const fetchUserWithSession = async () => {
    try {
      const response = await axios.get('http://localhost:5000/user', { 
        withCredentials: true 
      });
      
      if (response.data && response.data.accessToken) {
        localStorage.setItem("github_token", response.data.accessToken);
        processGitHubUser(response.data);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("GitHub session auth error:", error);
      setIsLoading(false);
    }
  };

  const fetchRepos = async (token) => {
    try {
      const reposRes = await fetch("https://api.github.com/user/repos", {
        headers: { Authorization: `token ${token}` }
      });

      if (!reposRes.ok) {
        throw new Error("Failed to fetch repositories");
      }

      const reposData = await reposRes.json();
      setRepos(reposData.slice(0, 3));
      setIsLoading(false);
    } catch (error) {
      console.error("GitHub repos fetch error:", error);
      toast({ 
        variant: "destructive", 
        title: "GitHub Error", 
        description: "Failed to fetch repository data." 
      });
      setIsLoading(false);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });

        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

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
        {/* 🔹 Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Your Contribution Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={(contributionStats.xps / contributionStats.nextLevelXps) * 100} />
              <p className="text-muted-foreground">
                Level Progress: {((contributionStats.xps / contributionStats.nextLevelXps) * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">You have contributed to {contributionStats.totalContributions} projects.</p>
            </CardContent>
          </Card>
        </div>

        {/* 🔹 Wallet & GitHub Profile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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
                <button onClick={connectWallet} className="bg-blue-500 text-white px-4 py-2 rounded-md">
                  Connect Wallet
                </button>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-6 w-6" /> GitHub Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-16">
                  <p>Loading GitHub data...</p>
                </div>
              ) : userData ? (
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center gap-6">
                    <img src={userData.avatar_url || "https://github.com/github.png"} className="w-16 h-16 rounded-full" alt="GitHub Avatar" />
                    <div>
                      <h3 className="text-xl font-bold">{userData.name || userData.login}</h3>
                      <p className="text-muted-foreground">{userData.bio || "No bio available"}</p>
                      <div className="flex gap-3 mt-2">
                        <Badge variant="outline">{userData.public_repos || 0} repos</Badge>
                        <Badge variant="outline">{userData.followers || 0} followers</Badge>
                        <Badge variant="outline">{userData.following || 0} following</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 gap-2">
                  <p className="text-muted-foreground">No GitHub account connected</p>
                  <a href="http://localhost:5000/auth/github" className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800">
                    <Github className="h-4 w-4" />
                    <span>Connect GitHub</span>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 🔹 Contribution Insights */}
        <div className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Contribution Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Award className="h-5 w-5" /> XPs & Level
                  </h3>
                  <p>Current XPs: {contributionStats?.xps || 0}</p>
                  <p>Level: {contributionStats?.level || 1}</p>
                  <p>Title: {contributionStats?.title || "Newbie"}</p>
                  <p>Next Level XPs: {contributionStats?.nextLevelXps || 5000}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Contributions</h3>
                  <p>Total Contributions: {contributionStats?.totalContributions || 0}</p>
                  <p>Streak: {contributionStats?.streak || 0} days</p>
                  <p>Role: {contributionStats?.role || "Contributor"}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Recent Contributions</h3>
                  {contributionStats?.recentContributions?.length > 0 ?(
                    contributionStats.recentContributions.map((contrib, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      {contrib.type} on {new Date(contrib.created_at).toLocaleDateString()}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent contributions</p>
                )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🔹 GitHub Repositories */}
        {userData && repos.length > 0 && (
          <div className="mt-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Recent GitHub Repositories</CardTitle>
                <CardDescription>Your most recently updated repositories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {repos.map(repo => (
                    <div key={repo.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                              {repo.name}
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {repo.description || 'No description available'}
                          </p>
                        </div>
                        <Badge>{repo.private ? 'Private' : 'Public'}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3">
                        {repo.language && (
                          <div className="flex items-center gap-1">
                            <Code className="h-4 w-4" />
                            <span className="text-xs">{repo.language}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          <span className="text-xs">{repo.stargazers_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GitFork className="h-4 w-4" />
                          <span className="text-xs">{repo.forks_count}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Updated: {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 🔹 Recent Activity */}
        <div className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">You recently reviewed a pull request on Project X.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Github } from 'lucide-react';

interface GithubUser {
  login: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
  contributions?: number;
}

const Dashboard = () => {
  const [userData, setUserData] = useState<GithubUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGithubData = async () => {
      try {
        const response = await fetch('https://api.github.com/users/example');
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Error fetching GitHub data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGithubData();
  }, []);

  const userStats = {
    xp: 4000,
    contributions: 120,
    streak: 60,
    level: 23,
    title: 'Explorer',
    roles: ['Contributor', 'Reviewer']
  };

  const calculateProgress = (xp: number) => {
    const nextLevel = 15000; // XP needed for reviewer
    return (xp / nextLevel) * 100;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-3 glass animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-6 w-6" />
                Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden">
                <img
                  src={userData?.avatar_url || 'https://github.com/github.png'}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">{userData?.login || 'Username'}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {userStats.roles.map(role => (
                    <span key={role} className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                      {role}
                    </span>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Progress to Reviewer</p>
                  <Progress value={calculateProgress(userStats.xp)} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <StatCard title="Total XP" value={userStats.xp.toString()} suffix="XP" />
          <StatCard title="Contributions" value={userStats.contributions.toString()} />
          <StatCard title="Current Streak" value={userStats.streak.toString()} suffix="days" />
          <StatCard title="Level" value={userStats.level.toString()} />
          <StatCard title="Title" value={userStats.title} />
          <StatCard title="Public Repos" value={userData?.public_repos?.toString() || '0'} />
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, suffix = '' }: { title: string; value: string; suffix?: string }) => (
  <Card className="glass animate-fade-in hover:scale-105 transition-transform">
    <CardHeader>
      <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">
        {value} {suffix}
      </p>
    </CardContent>
  </Card>
);

export default Dashboard;

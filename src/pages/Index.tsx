
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent" />
          <div className="text-center z-10 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600">
              Decentralized Open Source
              <br />
              Contribution Platform
            </h1>
            <p className="text-lg md:text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
              Earn rewards for your open source contributions through our blockchain-powered platform.
              Join the community and start contributing today.
            </p>
            <Button
              onClick={() => navigate('/dashboard')}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg flex items-center gap-2 group"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Platform Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-lg glass backdrop-blur-lg hover:scale-105 transition-transform"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const features = [
  {
    title: "Contribution Tracking",
    description: "Track your open source contributions and earn rewards through our blockchain-based system."
  },
  {
    title: "Role-Based Hierarchy",
    description: "Progress from Contributor to Reviewer to Maintainer as you gain experience and XP."
  },
  {
    title: "Token Rewards",
    description: "Earn tokens for your contributions, reviews, and project maintenance activities."
  }
];

export default Index;

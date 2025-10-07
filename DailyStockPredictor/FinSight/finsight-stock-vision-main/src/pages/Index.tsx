import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, Brain, Shield } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <TrendingUp className="h-12 w-12 text-primary mr-4" />
              <h1 className="text-5xl font-bold text-foreground">FinSight</h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Advanced AI-powered stock market prediction platform. Make informed investment decisions with our cutting-edge machine learning models.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/signup">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose FinSight?</h2>
            <p className="text-xl text-muted-foreground">Powerful features for smarter trading</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Brain className="h-12 w-12 text-primary mb-4" />
                <CardTitle>AI-Powered Predictions</CardTitle>
                <CardDescription>
                  Advanced machine learning models analyze market patterns to provide accurate buy/sell/hold recommendations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Real-Time Analytics</CardTitle>
                <CardDescription>
                  Live market data and comprehensive analysis for Apple, Google, and Microsoft stocks with instant insights
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Secure Trading</CardTitle>
                <CardDescription>
                  Bank-level security with portfolio tracking, search history, and personalized investment recommendations
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Trading?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of investors using AI to make smarter decisions in the stock market.
            </p>
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/signup">Start Trading with AI</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary mr-2" />
            <span className="text-muted-foreground">© 2024 FinSight. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

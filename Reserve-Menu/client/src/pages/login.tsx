import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
});

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login, register, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", name: "", email: "" },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (user.isAdmin) {
        navigate("/admin/menu");
      } else {
        navigate("/reservations");
      }
    }
  }, [user, authLoading, navigate]);

  async function onLogin(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setError("");
    try {
      await login(values.email, values.password);
      
      toast({ 
        title: "Welcome back!", 
        description: "You've been successfully logged in.",
      });

      // Navigation will be handled by useEffect above
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onRegister(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    setError("");
    try {
      await register(values);
      
      toast({ 
        title: "Account created!", 
        description: "Welcome to Lumière! You've been automatically logged in.",
      });

      // Navigation will be handled by useEffect above
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Registration failed";
      setError(errorMessage);
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <button 
            onClick={() => navigate("/")}
            className="inline-block font-serif text-3xl font-bold tracking-tight text-foreground mb-4 hover:text-primary transition-colors"
          >
            Lumière<span className="text-primary">.</span>
          </button>
          <h1 className="font-serif text-3xl font-bold mb-2">
            {activeTab === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground italic">
            {activeTab === "login" ? "Sign in to manage your reservations" : "Join us for an exceptional experience"}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
            <TabsTrigger value="login" className="text-sm font-medium">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="text-sm font-medium">Register</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="login" className="mt-0">
                <Card className="border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="font-serif">Login</CardTitle>
                    <CardDescription>Enter your email and password to access your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="you@example.com" 
                                  {...field} 
                                  disabled={isLoading} 
                                  className="h-11"
                                  autoComplete="email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="••••••••" 
                                  {...field} 
                                  disabled={isLoading} 
                                  className="h-11"
                                  autoComplete="current-password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {error && activeTab === "login" && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                            {error}
                          </div>
                        )}
                        <Button 
                          type="submit" 
                          className="w-full h-11 text-lg bg-primary hover:bg-primary/90" 
                          disabled={isLoading}
                        >
                          {isLoading ? "Signing in..." : "Sign In"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <Card className="border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="font-serif">Register</CardTitle>
                    <CardDescription>Create a new account to book and manage tables</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                        <FormField
                          control={registerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="John Doe" 
                                  {...field} 
                                  disabled={isLoading} 
                                  className="h-11"
                                  autoComplete="name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="john@example.com" 
                                  {...field} 
                                  disabled={isLoading} 
                                  className="h-11"
                                  autoComplete="email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="johndoe" 
                                  {...field} 
                                  disabled={isLoading} 
                                  className="h-11"
                                  autoComplete="username"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="••••••••" 
                                  {...field} 
                                  disabled={isLoading} 
                                  className="h-11"
                                  autoComplete="new-password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {error && activeTab === "register" && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                            {error}
                          </div>
                        )}
                        <Button 
                          type="submit" 
                          className="w-full h-11 text-lg bg-primary hover:bg-primary/90" 
                          disabled={isLoading}
                        >
                          {isLoading ? "Creating account..." : "Create Account"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>

        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
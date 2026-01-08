import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, BookOpen, Loader2, Key } from 'lucide-react';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginSecretCode, setLoginSecretCode] = useState('');

  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupRole, setSignupRole] = useState<'teacher' | 'student'>('teacher');
  const [signupSecretCode, setSignupSecretCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!loginSecretCode.trim()) {
      toast({
        title: 'Secret Code Required',
        description: 'Please enter your secret code to log in.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(loginEmail, loginPassword, loginSecretCode.trim());

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (signupPassword.length < 6) {
      toast({
        title: 'Invalid Password',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Students must provide a valid teacher's secret code
    if (signupRole === 'student' && !signupSecretCode.trim()) {
      toast({
        title: 'Secret Code Required',
        description: 'Students must enter their teacher\'s secret code to sign up.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(
      signupEmail, 
      signupPassword, 
      signupFullName, 
      signupRole, 
      signupSecretCode.trim()
    );

    if (error) {
      toast({
        title: 'Signup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account Created!',
        description: signupRole === 'teacher' 
          ? 'Your unique secret code has been generated. Share it with your students!'
          : 'You can now log in with your credentials.',
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold font-serif text-foreground">ExamPaper Pro</h1>
          <p className="text-muted-foreground mt-2">
            AI-Powered Question Paper Generator
          </p>
        </div>

        <Card className="border-border shadow-lg">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader>
                <CardTitle className="font-serif">Welcome Back</CardTitle>
                <CardDescription>
                  Enter your credentials and Secret Code to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="teacher@school.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-secret-code" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Secret Code
                    </Label>
                    <Input
                      id="login-secret-code"
                      type="text"
                      placeholder="e.g., swift-eagle-42"
                      value={loginSecretCode}
                      onChange={(e) => setLoginSecretCode(e.target.value)}
                      required
                      autoComplete="one-time-code"
                    />
                    <p className="text-xs text-muted-foreground">
                      The secret code is created when you sign up. During login, the system only verifies the code you enter. If you forgot your secret code, please check your profile or registration email.
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader>
                <CardTitle className="font-serif">Create Account</CardTitle>
                <CardDescription>
                  Register as a teacher or student
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>I am a:</Label>
                    <RadioGroup
                      value={signupRole}
                      onValueChange={(value) => setSignupRole(value as 'teacher' | 'student')}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem
                          value="teacher"
                          id="role-teacher"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="role-teacher"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <BookOpen className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">Teacher</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="student"
                          id="role-student"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="role-student"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-accent [&:has([data-state=checked])]:border-accent cursor-pointer"
                        >
                          <GraduationCap className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">Student</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {signupRole === 'student' && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-secret-code" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Teacher's Secret Code
                      </Label>
                      <Input
                        id="signup-secret-code"
                        type="text"
                        placeholder="Enter your teacher's secret code"
                        value={signupSecretCode}
                        onChange={(e) => setSignupSecretCode(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Ask your teacher for their secret code to join their class.
                      </p>
                    </div>
                  )}

                  {signupRole === 'teacher' && (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm text-primary flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        A unique Secret Code will be generated for you upon registration.
                      </p>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link to="/" className="hover:text-primary underline">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
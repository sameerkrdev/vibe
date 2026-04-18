import { Link } from "react-router";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <span className="text-4xl">⚡</span>
          <h1 className="text-2xl font-bold text-primary mt-2">StakeStreak</h1>
          <p className="text-muted-foreground text-sm">Start your accountability journey</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Join and get 500 free tokens to start betting on yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleAuthButton label="Sign up with Google" />
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
            <RegisterForm />
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground w-full text-center">
              Already have an account?{" "}
              <Link to="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;

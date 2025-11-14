import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, Sparkles } from 'lucide-react';

const LoginPrompt = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="glass w-full max-w-md gradient-border" data-testid="login-prompt">
        <div>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Sparkles className="w-16 h-16 text-pink-400 float" />
            </div>
            <CardTitle className="text-3xl font-bold gradient-text mb-2">
              Kallie's Dashboard
            </CardTitle>
            <CardDescription className="text-base text-gray-300">
              Connect your Twitch account to unlock advanced features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 text-sm text-gray-300">
              <p className="flex items-center gap-2">
                <span className="text-pink-400">✓</span> Real subscriber count
              </p>
              <p className="flex items-center gap-2">
                <span className="text-pink-400">✓</span> Create Twitch clips
              </p>
              <p className="flex items-center gap-2">
                <span className="text-pink-400">✓</span> Update stream title
              </p>
              <p className="flex items-center gap-2">
                <span className="text-pink-400">✓</span> Create stream markers
              </p>
            </div>

            <Button
              onClick={login}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-6 text-lg"
              data-testid="btn-login-twitch"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Login with Twitch
            </Button>

            <p className="text-xs text-gray-500 text-center">
              You'll be redirected to Twitch to authorize this application
            </p>
          </CardContent>
        </div>
      </Card>
    </div>
  );
};

export default LoginPrompt;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Database, CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DatabaseConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

interface DatabaseConfig {
  type: 'postgresql' | 'mysql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export function DatabaseConnection({ onConnectionChange }: DatabaseConnectionProps) {
  const [config, setConfig] = useState<DatabaseConfig>({
    type: 'postgresql',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: false
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleConfigChange = (field: keyof DatabaseConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/database/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to your database!",
        });
      } else {
        setError(result.error || 'Connection failed');
        toast({
          title: "Connection Failed",
          description: result.error || 'Unable to connect to database',
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      setError(errorMessage);
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectDatabase = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/database/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        setIsConnected(true);
        onConnectionChange?.(true);
        toast({
          title: "Database Connected",
          description: "Now using your external database for queries!",
        });
      } else {
        setError(result.error || 'Connection failed');
        toast({
          title: "Connection Failed",
          description: result.error || 'Unable to connect to database',
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectDatabase = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/database/disconnect', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setIsConnected(false);
        onConnectionChange?.(false);
        toast({
          title: "Database Disconnected",
          description: "Switched back to sample database",
        });
      }
    } catch (err) {
      toast({
        title: "Disconnection Error",
        description: "Failed to disconnect from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Connection
        </CardTitle>
        <CardDescription>
          Connect to your own database to build queries with your data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Connected to external database ({config.type})
              </AlertDescription>
            </Alert>
            <Button 
              onClick={disconnectDatabase} 
              disabled={isLoading}
              variant="outline" 
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Disconnect & Use Sample Data
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Database Type</Label>
              <Select 
                value={config.type} 
                onValueChange={(value) => handleConfigChange('type', value as 'postgresql' | 'mysql')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  placeholder="localhost"
                  value={config.host}
                  onChange={(e) => handleConfigChange('host', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="5432"
                  value={config.port}
                  onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || 5432)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="database">Database Name</Label>
              <Input
                id="database"
                placeholder="mydatabase"
                value={config.database}
                onChange={(e) => handleConfigChange('database', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="postgres"
                value={config.username}
                onChange={(e) => handleConfigChange('username', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={config.password}
                onChange={(e) => handleConfigChange('password', e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ssl"
                checked={config.ssl}
                onCheckedChange={(checked) => handleConfigChange('ssl', checked)}
              />
              <Label htmlFor="ssl">Use SSL</Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2">
              <Button 
                onClick={testConnection} 
                disabled={isLoading || !config.host || !config.database}
                variant="outline" 
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Test
              </Button>
              <Button 
                onClick={connectDatabase} 
                disabled={isLoading || !config.host || !config.database}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Connect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
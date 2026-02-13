import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface HeaderProps {
  lastRefreshed: Date | null;
  successMessage: string | null;
  errorMessage: string | null;
  fetchAllData: () => void;
  sessionId: string;
  onRegenerateSession: () => void;
}

export const Header = ({
  lastRefreshed,
  successMessage,
  errorMessage,
  fetchAllData,
  sessionId,
  onRegenerateSession,
}: HeaderProps) => {
  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Software Architecture Project</h1>
          <p className="text-gray-400">
            Distributed transaction management with RabbitMQ and the Saga pattern
          </p>
        </div>

        <div className="hidden md:block">
          {successMessage && (
            <Alert className="" variant="default">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>
                Session ID: <span className="font-mono">{sessionId}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerateSession}
                className="h-6 px-2"
                title="Generate new session ID"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <div className="h-8 w-px bg-gray-600"></div>
            <Button variant="outline" onClick={fetchAllData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh tables
            </Button>
          </div>
          {lastRefreshed && (
            <div className="mt-2">
              <p className="text-xs text-gray-400">(Auto-refreshes every 10 seconds)</p>
              <p className="text-xs text-gray-400">
                Last refreshed: {lastRefreshed.toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      </div>
      {errorMessage && (
        <Alert className="my-6" variant="destructive">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <div className="block sm:hidden">
        {successMessage && (
          <Alert className="my-6" variant="default">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

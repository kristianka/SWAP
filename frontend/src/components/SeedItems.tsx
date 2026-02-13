import { Button } from "./ui/button";

export const SeedItems = () => {
  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          fetch("/api/seed", { method: "POST" });
        }}
      >
        Seed Data
      </Button>
    </div>
  );
};

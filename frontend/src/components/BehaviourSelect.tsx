import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface BehaviourSelectProps {
  label: string;
  value: "success" | "failure" | "random";
  onChange: (value: "success" | "failure" | "random") => void;
  tooltip: string;
}

export const BehaviourSelect = ({ label, value, onChange, tooltip }: BehaviourSelectProps) => {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center gap-1.5">
        <label className="text-sm text-gray-300 whitespace-nowrap">{label}:</label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="size-3.5 text-gray-400 hover:text-gray-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "success" | "failure" | "random")}
        className="ml-auto h-8 rounded-lg border border-gray-700 bg-card px-3 py-1 text-sm text-white hover:border-gray-600 focus:outline-none focus:ring-1 [&>option]:bg-card [&>option]:text-white"
      >
        <option value="success">Success</option>
        <option value="failure">Fails</option>
        <option value="random">Random</option>
      </select>
    </div>
  );
};

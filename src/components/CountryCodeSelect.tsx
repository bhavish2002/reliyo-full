import { countries, type Country } from "@/lib/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

const CountryCodeSelect = ({ value, onChange, disabled }: CountryCodeSelectProps) => {
  const selected = countries.find((c) => c.code === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-12 w-[110px] shrink-0 rounded-lg border-none bg-muted text-foreground">
        <SelectValue>
          {selected ? `${selected.flag} ${selected.dialCode}` : "Code"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-60 bg-popover">
        {countries.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.flag} {c.name} ({c.dialCode})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CountryCodeSelect;

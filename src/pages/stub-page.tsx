import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { InfoIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function StubPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div className="bg-surface-bg-l2 rounded-2xl border border-a10-b p-8">
        <p className="text-secondary-t text-sm">
          This page is a placeholder for <strong className="text-primary-t">{title}</strong>.
        </p>
        <p className="text-tertiary-t text-xs mt-2">
          Content will be implemented in a future iteration.
        </p>
      </div>
      <div>
        <h2>UI components</h2>
        <div>
          <p>Badge:</p>
          <div className="flex gap-x-2 items-center">
            <Badge size="lg" color="red" variant="filled">
              Badge
            </Badge>
            <Badge size="lg" color="red" variant="ghost">
              Badge
            </Badge>
          </div>
        </div>
        <div>
          <p>Button:</p>
          <div className="flex gap-x-2 items-center flex-wrap">
            <p>Default</p>
            <Button size="lg">Button</Button>
            <Button size="lg">
              <InfoIcon />
            </Button>
            <Button size="lg">
              Button
              <InfoIcon />
            </Button>
            <p>secondary</p>
            <Button variant="secondary" size="lg">
              Button
            </Button>
            <Button variant="secondary" size="lg">
              <InfoIcon />
            </Button>
            <Button variant="secondary" size="lg">
              Button
              <InfoIcon />
            </Button>
            <p>tertiary</p>
            <Button variant="tertiary" size="lg">
              Button
            </Button>
            <Button variant="tertiary" size="lg">
              <InfoIcon />
            </Button>
            <Button variant="tertiary" size="lg">
              Button
              <InfoIcon />
            </Button>
            <p>link</p>
            <Button variant="link" size="lg">
              Button
            </Button>
            <Button variant="link" size="lg">
              Button
              <InfoIcon />
            </Button>
          </div>
        </div>
        <div>
          <p>Checkbox</p>
          <Label htmlFor="Checkbox">label</Label>
          <Checkbox id="Checkbox" />
        </div>
        <div>
          <p>Input</p>
          <Input placeholder="placeholder" />
        </div>
        <div>
          <p>RadioGroupDemo</p>
          <RadioGroup defaultValue="comfortable" className="w-fit">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="default" id="r1" />
              <Label htmlFor="r1">Default</Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="comfortable" id="r2" />
              <Label htmlFor="r2">Comfortable</Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="compact" id="r3" />
              <Label htmlFor="r3">Compact</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { InfoIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem } from "@/components/ui/form.tsx";
import { TokenBigInput } from "@/components/ui/token-big-input.tsx";
import { useToken } from "@/lib/hooks/useToken.tsx";
import { useAccount } from "wagmi";
import { TokenName } from "@/lib/tokens.ts";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
];

export function StubPage({ title }: { title: string }) {
  const { address: userAddress } = useAccount();
  const usdsToken = useToken(TokenName.USDS, userAddress);
  const formTest = useForm<{ amount: string }>({
    defaultValues: { amount: "" },
  });

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
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.invoice}>
                  <TableCell className="font-medium">{invoice.invoice}</TableCell>
                  <TableCell>{invoice.paymentStatus}</TableCell>
                  <TableCell>{invoice.paymentMethod}</TableCell>
                  <TableCell className="text-right">{invoice.totalAmount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-6">
          <Tabs defaultValue="recent" className="w-[400px]">
            <TabsList>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            <TabsContent value="recent">Recent content</TabsContent>
            <TabsContent value="all">All content</TabsContent>
          </Tabs>
        </div>
        <div className="mt-6">
          <Tabs variant="underline" defaultValue="recent" className="w-[400px]">
            <TabsList variant="underline">
              <TabsTrigger variant="underline" value="recent">
                Recent
              </TabsTrigger>
              <TabsTrigger variant="underline" value="all">
                All
              </TabsTrigger>
            </TabsList>
            <TabsContent value="recent">Recent content</TabsContent>
            <TabsContent value="all">All content</TabsContent>
          </Tabs>
        </div>
        <div className="mt-6 max-w-100">
          <Form {...formTest}>
            <form>
              <FormField
                control={formTest.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <TokenBigInput label="Amount" {...field} token={usdsToken} />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <div className="flex items-center space-x-2 mt-5">
          <Switch size="lg" id="airplane-mode" />
          <Label htmlFor="airplane-mode">Airplane Mode</Label>
        </div>
        <div>
          <Tooltip title="Tooltip">
            <p>Tooltip</p>
          </Tooltip>
        </div>
        <div>
          <Accordion defaultValue={["shipping"]} className="max-w-lg">
            <AccordionItem value="shipping">
              <AccordionTrigger>What are your shipping options?</AccordionTrigger>
              <AccordionContent>
                We offer standard (5-7 days), express (2-3 days), and overnight shipping. Free
                shipping on international orders.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns">
              <AccordionTrigger>What is your return policy?</AccordionTrigger>
              <AccordionContent>
                Returns accepted within 30 days. Items must be unused and in original packaging.
                Refunds processed within 5-7 business days.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="support">
              <AccordionTrigger>How can I contact customer support?</AccordionTrigger>
              <AccordionContent>
                Reach us via email, live chat, or phone. We respond within 24 hours during business
                days.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}

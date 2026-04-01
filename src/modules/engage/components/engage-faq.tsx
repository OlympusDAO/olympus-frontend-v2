import { Card } from "@/components/ui/card.tsx";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion.tsx";

const FAQ_ITEMS = [
  {
    value: "rewards",
    question: "Where do the rewards come from?",
    answer:
      "The Points Program is a liquidity-driven rewards system designed to incentivize using Olympus CDs. Participants earn points based on their activity across protocol features.",
  },
  {
    value: "multiple-wallets",
    question: "Can I use multiple wallets?",
    answer:
      "Each wallet address accumulates Drachmas independently. You can use multiple wallets, but rewards are tracked per address.",
  },
  {
    value: "max-benefit",
    question: "How to max benefit?",
    answer:
      "Maximize your Drachma accumulation by depositing into CDs, borrowing against your CD position, and converting CD positions. Each action carries its own multiplier.",
  },
  {
    value: "redeem",
    question: "When can they be redeemed / how to redeem?",
    answer:
      "iOHM can be claimed at the end of each epoch. Navigate to the Claim tab to see your available iOHM and click the Claim button to receive your allocation.",
  },
];

export function EngageFaq() {
  return (
    <Card className="p-3">
      <Accordion>
        {FAQ_ITEMS.map((item) => (
          <AccordionItem key={item.value} value={item.value}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}

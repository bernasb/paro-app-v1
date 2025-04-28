import { CatholicPrayer } from '@/utils/magisterium';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Book, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PrayerAccordionProps {
  prayers: CatholicPrayer[];
}

export const PrayerAccordion = ({ prayers }: PrayerAccordionProps) => {
  const { toast } = useToast();

  const copyPrayer = (text: string, title: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: 'Copied',
          description: `${title} copied to clipboard`,
        });
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        toast({
          title: 'Error',
          description: 'Failed to copy to clipboard',
          variant: 'destructive',
        });
      });
  };

  if (prayers.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">No prayers found.</div>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {prayers.map((prayer, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Book className="h-4 w-4 text-clergy-primary" />
              <span>{prayer.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-4 bg-muted/30 rounded-md relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                onClick={() => copyPrayer(prayer.content, prayer.title)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <div className="whitespace-pre-line">{prayer.content}</div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

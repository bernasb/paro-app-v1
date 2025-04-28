import { CatholicPrayer } from '@/utils/magisterium';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrayerAccordion } from './PrayerAccordion';

interface PrayerTabsProps {
  prayers: CatholicPrayer[];
}

export const PrayerTabs = ({ prayers }: PrayerTabsProps) => {
  // Group prayers by category
  const creeds = prayers.filter((prayer) => prayer.title.toLowerCase().includes('creed'));
  const novenas = prayers.filter((prayer) => prayer.title.toLowerCase().includes('novena'));
  const devotions = prayers.filter(
    (prayer) =>
      !prayer.title.toLowerCase().includes('creed') &&
      !prayer.title.toLowerCase().includes('novena'),
  );

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="all">All Prayers</TabsTrigger>
        <TabsTrigger value="creeds">Creeds</TabsTrigger>
        <TabsTrigger value="novenas">Novenas</TabsTrigger>
        <TabsTrigger value="devotions">Devotions</TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <div className="space-y-1">
          <PrayerAccordion prayers={prayers} />
        </div>
      </TabsContent>

      <TabsContent value="creeds">
        <div className="space-y-1">
          <PrayerAccordion prayers={creeds} />
        </div>
      </TabsContent>

      <TabsContent value="novenas">
        <div className="space-y-1">
          <PrayerAccordion prayers={novenas} />
        </div>
      </TabsContent>

      <TabsContent value="devotions">
        <div className="space-y-1">
          <PrayerAccordion prayers={devotions} />
        </div>
      </TabsContent>
    </Tabs>
  );
};

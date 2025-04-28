import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Circle } from 'lucide-react';
import { ColorCard } from './ColorCard';

interface ColorGuideProps {
  getColorClass: (color: string) => string;
}

export const ColorGuide = ({ getColorClass }: ColorGuideProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Circle className="h-5 w-5 text-clergy-primary" />
          Liturgical Colors Guide
        </CardTitle>
        <CardDescription>Understanding liturgical colors and their significance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorCard
            color="white"
            title="White"
            description="Symbolizes purity, innocence, and joy. Used for feasts of Our Lord (except those of His Passion), Blessed Virgin Mary, angels, and non-martyr saints."
            getColorClass={getColorClass}
          />
          <ColorCard
            color="red"
            title="Red"
            description="Represents love, the Holy Spirit, and martyrdom. Used for Pentecost, feasts of martyrs and apostles, Good Friday, and Palm Sunday."
            getColorClass={getColorClass}
          />
          <ColorCard
            color="green"
            title="Green"
            description="Symbolizes hope and life. Used during Ordinary Time, which occurs between the liturgical seasons."
            getColorClass={getColorClass}
          />
          <ColorCard
            color="violet"
            title="Violet (Purple)"
            description="Represents penance, preparation, and mourning. Used during Advent and Lent, vigils, and Masses for the dead."
            getColorClass={getColorClass}
          />
          <ColorCard
            color="black"
            title="Black"
            description="Symbolizes mourning and sorrow. Used for funerals, Masses for the dead, and sometimes Good Friday."
            getColorClass={getColorClass}
          />
          <ColorCard
            color="rose"
            title="Rose"
            description="Represents joy and anticipation. Used for Gaudete Sunday (Third Sunday of Advent) and Laetare Sunday (Fourth Sunday of Lent)."
            getColorClass={getColorClass}
          />
        </div>
      </CardContent>
    </Card>
  );
};

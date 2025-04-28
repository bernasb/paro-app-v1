import { Card, CardContent } from '@/components/ui/card';

interface ColorCardProps {
  color: string;
  title: string;
  description: string;
  getColorClass: (color: string) => string;
}

export const ColorCard = ({ color, title, description, getColorClass }: ColorCardProps) => {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={`h-6 w-6 rounded-full flex-shrink-0 ${getColorClass(color)}`}></div>
          <div>
            <h4 className="font-medium mb-1">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import { LiturgicalReading } from './types';

// Extract JSON from a string response
export const parseJsonFromResponse = (text: string, defaultShape: '[]' | '{}'): any => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/```json\n([\s\S]*)\n```/) || 
                    text.match(/\[([\s\S]*)\]/) ||
                    text.match(/\{([\s\S]*)\}/);
    
    if (jsonMatch) {
      try {
        // If we found JSON-like content, parse it
        const jsonStr = jsonMatch[0].startsWith('[') || jsonMatch[0].startsWith('{') 
          ? jsonMatch[0] 
          : jsonMatch[1];
        
        if (defaultShape === '[]') {
          return JSON.parse(`${jsonStr.startsWith('[') ? '' : '['}${jsonStr}${jsonStr.endsWith(']') ? '' : ']'}`);
        } else {
          return JSON.parse(`${jsonStr.startsWith('{') ? '' : '{'}${jsonStr}${jsonStr.endsWith('}') ? '' : '}'}`);
        }
      } catch (e) {
        console.error("Error parsing JSON from response:", e);
        return defaultShape === '[]' ? [] : {};
      }
    }
    return defaultShape === '[]' ? [] : {};
  } catch (error) {
    console.error("Error in parseJsonFromResponse:", error);
    return defaultShape === '[]' ? [] : {};
  }
};

// Helper function to parse readings if JSON parsing fails
export const parseReadingsFromText = (text: string): LiturgicalReading[] => {
  const readings: LiturgicalReading[] = [];
  const readingBlocks = text.split(/Reading \d+:|Gospel:|Responsorial Psalm:|First Reading:|Second Reading:/).filter(block => block.trim().length > 0);
  
  readingBlocks.forEach(block => {
    const lines = block.trim().split('\n').filter(line => line.trim().length > 0);
    if (lines.length >= 2) {
      const citationMatch = lines[0].match(/\((.*?)\)/);
      readings.push({
        title: lines[0].replace(/\(.*?\)/, '').trim(),
        citation: citationMatch ? citationMatch[1] : '',
        content: lines.slice(1).join('\n')
      });
    }
  });
  
  return readings;
};

// Format date to a string like "January 1"
export const formatDate = (date: Date): string => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

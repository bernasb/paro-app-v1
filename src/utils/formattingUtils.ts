// src/utils/formattingUtils.ts

// --- Function for formatting detailed explanations ---
export const formatDetailedExplanation = (text: string): string => {
  if (!text) return '';

  // Split the text into sections based on double asterisks (bold headings)
  const sections = text.split(/\*\*([^*]+)\*\*/g).filter(Boolean);

  let formattedHtml = '';
  let inSection = false;
  let inSubsection = false;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();

    // Skip empty sections
    if (!section) continue;

    // Check if this is a heading (not preceded by bullet points or other content)
    const isHeading = i % 2 === 0 && section.match(/^[A-Z]/) && !section.startsWith('*');

    if (isHeading) {
      // Close previous section if needed
      if (inSubsection) {
        formattedHtml += '</div>\n';
        inSubsection = false;
      }

      if (inSection) {
        formattedHtml += '</div>\n';
      }

      // Start new section with heading
      formattedHtml += `<div class="mb-4">\n<h3 class="font-bold text-lg mb-2">${section}</h3>\n`;
      inSection = true;
    } else if (section.includes('* ')) {
      // This is a bullet point list

      // Check if this is a subsection (has a colon at the end)
      if (section.endsWith(':')) {
        if (inSubsection) {
          formattedHtml += '</div>\n';
        }

        formattedHtml += `<div class="mb-3">\n<h4 class="font-semibold mb-2">${section}</h4>\n`;
        inSubsection = true;
      } else {
        // Regular bullet point list
        const bulletPoints = section.split('* ').filter(Boolean);

        formattedHtml += '<ul class="list-disc pl-5 space-y-2 mb-3">\n';

        bulletPoints.forEach((point) => {
          const trimmedPoint = point.trim();
          if (trimmedPoint) {
            // Apply line breaking to each bullet point for better readability
            const formattedPoint = breakTextIntoLines(trimmedPoint, 40, 60);
            formattedHtml += `<li>${formattedPoint.replace(/\n/g, '<br />')}</li>\n`;
          }
        });

        formattedHtml += '</ul>\n';
      }
    } else {
      // Regular paragraph - apply line breaking for better readability
      const formattedParagraph = breakTextIntoLines(section, 40, 60);
      formattedHtml += `<p class="mb-3">${formattedParagraph.replace(/\n/g, '<br />')}</p>\n`;
    }
  }

  // Close any open sections
  if (inSubsection) {
    formattedHtml += '</div>\n';
  }

  if (inSection) {
    formattedHtml += '</div>\n';
  }

  return formattedHtml;
};

// --- Function for formatting reading summaries ---
export const formatSummary = (text: string): string => {
  if (!text) return '';

  // Remove parenthetical terms like (*metanoia*) and (kerygma)
  const cleanText = text.replace(/\(\*[^*]+\*\)|\([^)]+\)/g, '');

  // Extract the title (first line up to "because it:")
  const titleMatch = cleanText.match(/^(.*?because it:)/);
  let title = titleMatch ? titleMatch[1].trim() : '';

  // Remove "For Catholics, " from the beginning
  title = title.replace(/^For Catholics,\s*/i, '');

  // Extract the conclusion (last sentence after the bullet points)
  const conclusionMatch = cleanText.match(/([^•]+)$/);
  let conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';

  // Add "This passage" to the beginning of the conclusion if it doesn't already start with it
  if (conclusion && !conclusion.startsWith('This passage')) {
    // Check if it starts with a lowercase letter (indicating it's continuing a sentence)
    if (/^[a-z]/.test(conclusion)) {
      conclusion = 'This passage ' + conclusion;
    } else {
      conclusion = 'This passage ' + conclusion.charAt(0).toLowerCase() + conclusion.slice(1);
    }
  }

  // Extract bullet points
  const bulletPointsMatch = cleanText.match(/•(.*?)(?=•|[^•]+$)/gs);
  let bulletPoints = bulletPointsMatch
    ? bulletPointsMatch.map((point) => point.replace(/^•\s*/, '').trim())
    : [];

  // Filter out empty or malformed bullet points
  bulletPoints = bulletPoints.filter((point) => point && point.length > 1);

  // Clean up any double spaces that might have been created by removing parenthetical terms
  bulletPoints = bulletPoints.map((point) => point.replace(/\s{2,}/g, ' '));

  // Apply line breaking to bullet points for better readability
  bulletPoints = bulletPoints.map((point) => breakTextIntoLines(point, 40, 60));

  // Apply line breaking to conclusion
  if (conclusion) {
    conclusion = conclusion.replace(/\s{2,}/g, ' '); // Clean up double spaces
    conclusion = breakTextIntoLines(conclusion, 40, 60);
  }

  // Build HTML with proper formatting
  let formattedHtml = '';

  if (title) {
    formattedHtml += `<strong>${title}</strong>\n\n<br />\n\n`;
  }

  if (bulletPoints.length > 0) {
    formattedHtml += '<blockquote class="pl-4 border-l-2 border-muted-foreground/30">\n';
    bulletPoints.forEach((point) => {
      formattedHtml += `<div class="flex mb-3">
        <span class="mr-2 flex-shrink-0">•</span>
        <span>${point.replace(/\n/g, '<br />')}</span>
      </div>\n`;
    });
    formattedHtml += '</blockquote>\n\n<br />\n\n';
  }

  if (conclusion) {
    formattedHtml += `<strong>${conclusion.replace(/\n/g, '<br />')}</strong>`;
  }

  return formattedHtml;
};

// --- Types for Structured Psalm Formatting ---
export type PsalmLine =
  | { type: 'response'; text: string }
  | { type: 'verse_part1'; text: string }
  | { type: 'verse_part2'; text: string }
  | { type: 'blank'; text?: string };

// --- Types for Gospel Acclamation Formatting ---
export type GospelAcclamationLine =
  | { type: 'main_sentence'; text: string }
  | { type: 'verse_part1'; text: string }
  | { type: 'verse_part2'; text: string }
  | { type: 'blank'; text?: string };

// Helper function to remove character counts from text
export const removeCharacterCounts = (text: string | undefined): string | undefined => {
  if (!text) return text;
  return text.replace(/\s*[\(]?\d+\s+characters?[\)]?\s*$/i, '').trim();
};

// *** Helper function for line breaking within verse blocks ***
// Adapted from the core logic of formatReadingContent's segment processing
const breakTextIntoLines = (text: string, minChars = 50, maxChars = 65): string => {
  if (!text) return '';
  const lines: string[] = [];
  let currentPosition = 0;
  const len = text.length;

  // Simple pre-processing for this block
  text = text.replace(/\s+/g, ' ').trim(); // Consolidate whitespace

  while (currentPosition < len) {
    // If the remaining text fits within maxChars, just add it as the last line
    if (len - currentPosition <= maxChars) {
      lines.push(text.substring(currentPosition));
      break; // Exit the loop
    }

    let breakPoint = -1;
    const idealEnd = Math.min(currentPosition + maxChars, len);
    const minimumEnd = currentPosition + minChars;

    // 1. Prioritize sentence-ending punctuation within the ideal range [min, ideal]
    for (let i = idealEnd - 1; i >= minimumEnd; i--) {
      if (/[.!?]/.test(text[i])) {
        // Include potential closing quote
        if (i + 1 < len && /['"’”‘“]/.test(text[i + 1])) {
          breakPoint = i + 2;
        } else {
          breakPoint = i + 1;
        }
        break;
      }
    }

    // 2. If no sentence end, look for other punctuation [, ; :] in [min, ideal]
    if (breakPoint === -1) {
      for (let i = idealEnd - 1; i >= minimumEnd; i--) {
        if (/[,;:]/.test(text[i])) {
          breakPoint = i + 1;
          break;
        }
      }
    }

    // 3. If still no break, find the last space in [min, ideal]
    if (breakPoint === -1) {
      for (let i = idealEnd - 1; i >= minimumEnd; i--) {
        if (/\s/.test(text[i])) {
          breakPoint = i + 1; // Break *after* the space
          break;
        }
      }
    }

    // 4. If no suitable space found in [min, ideal] (e.g., very long word)
    // Find the *first* space *after* minChars position or force break at idealEnd
    if (breakPoint === -1) {
      let firstSpaceAfterMin = -1;
      for (let i = minimumEnd; i < idealEnd; i++) {
        if (/\s/.test(text[i])) {
          firstSpaceAfterMin = i + 1;
          break;
        }
      }

      if (firstSpaceAfterMin !== -1) {
        breakPoint = firstSpaceAfterMin;
      } else {
        // No space found at all in the window, just break at idealEnd (might break word)
        // Or, try finding last space *before* minimumEnd as a last resort?
        const lastSpaceBeforeMin = text.lastIndexOf(' ', minimumEnd - 1);
        if (lastSpaceBeforeMin > currentPosition) {
          breakPoint = lastSpaceBeforeMin + 1;
        } else {
          // Absolute last resort: force break at ideal end
          breakPoint = idealEnd;
        }
      }
    }

    // Safety check to ensure loop progresses
    if (breakPoint <= currentPosition) {
      const nextSpace = text.indexOf(' ', currentPosition + 1);
      if (nextSpace !== -1 && nextSpace < currentPosition + maxChars * 1.5) {
        // Look a bit further
        breakPoint = nextSpace + 1;
      } else {
        // Force break after maxChars if no space found reasonably soon
        breakPoint = Math.min(currentPosition + maxChars, len);
      }
      // Ensure we always move forward
      if (breakPoint <= currentPosition) breakPoint = currentPosition + 1;
    }

    const lineText = text.substring(currentPosition, breakPoint).trim();
    if (lineText) {
      // Avoid adding empty lines
      lines.push(lineText);
    }
    currentPosition = breakPoint;
    // Skip potential leading whitespace for the next line segment
    while (currentPosition < len && /\s/.test(text[currentPosition])) {
      currentPosition++;
    }
  }

  return lines.join('\n');
};

// --- NEW FUNCTION for Psalm Display Formatting ---
export const formatPsalmForDisplay = (text: string, minChars = 50, maxChars = 65): string => {
  if (!text) return '';

  // 1. Pre-processing: Fix common issues like orphaned punctuation and normalize whitespace
  let processedText = text.trim();
  // Join word and punctuation separated ONLY by whitespace/newlines
  processedText = processedText.replace(/(\S)\s+([.!?,;:'"’”])/g, '$1$2');
  // Join punctuation/quote and following word separated ONLY by whitespace/newlines
  processedText = processedText.replace(/([.!?,'";:'"’])\s+(\w)/g, '$1 $2'); // Ensure space after punctuation before next word
  // Normalize remaining whitespace (including original newlines) to single spaces
  processedText = processedText.replace(/\s+/g, ' ');

  // 2. Identify the response line (first sentence)
  const responseEndIndex = processedText.search(/[.!?]/);
  if (responseEndIndex === -1) {
    console.warn('Could not reliably determine psalm response:', processedText.substring(0, 100));
    // Fallback: Apply line breaking to the whole text without bolding
    return breakTextIntoLines(processedText, minChars, maxChars);
  }
  const responseLine = processedText.substring(0, responseEndIndex + 1).trim();
  if (!responseLine) {
    console.warn('Determined response line is empty:', processedText.substring(0, 100));
    return breakTextIntoLines(processedText, minChars, maxChars);
  }

  // 3. Split the text by the response line, keeping the response line as a delimiter
  // Escape regex special characters in the response line
  const escapedResponse = responseLine.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&');
  // Use capturing group in split to keep the delimiter
  const segments = processedText.split(new RegExp(`(${escapedResponse})`));

  // 4. Format each segment
  const formattedParts: string[] = [];
  segments.forEach((segment) => {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) {
      return; // Skip empty segments resulting from split
    }

    if (trimmedSegment === responseLine) {
      // This is the response line, format it as bold
      formattedParts.push(`**${trimmedSegment}**`);
    } else {
      // This is a verse block, apply line breaking
      const formattedBlock = breakTextIntoLines(trimmedSegment, minChars, maxChars);
      if (formattedBlock) {
        // Only add if there's content
        formattedParts.push(formattedBlock);
      }
    }
  });

  // 5. Join the formatted parts with double newlines
  // Filter out any potentially empty strings that might remain before joining
  return formattedParts.filter((part) => part).join('\n\n');
};

// --- Your existing functions below ---

// *** REFINED HELPER for Line Breaking (Original for Readings/Gospel) ***
export const formatReadingContent = (text: string, minChars = 50, maxChars = 70): string => {
  // ... (keep your original implementation here) ...
  // NOTE: The logic inside breakTextIntoLines above is adapted from this.
  if (!text) return '';

  // For First Reading, Second Reading, and Gospel passages:
  // Split the text at semicolons and process each segment separately
  const segments = text.split(/;/g);

  // Process each segment with the line breaking algorithm
  const processedSegments = segments.map((segment, index) => {
    // Add the semicolon back to all segments except the last one
    const segmentWithSemicolon = index < segments.length - 1 ? segment + ';' : segment;

    // Use the standalone line breaking helper
    return breakTextIntoLines(segmentWithSemicolon, minChars, maxChars);
  });

  // Join the processed segments with double line breaks
  return processedSegments
    .map((segment) => segment.replace(/<div style="text-indent: -3em; margin-left: 3em;">/g, '\n'))
    .join('\n\n'); // Or maybe single if semicolon indicates closer connection? Adjust as needed.
};

// --- Completely revised formatPsalmContent returning structured data ---
// Keep this if you need the structured {type: ..., text: ...} output elsewhere
export const formatPsalmContentStructured = (text: string): PsalmLine[] => {
  // ... (keep your original implementation here) ...
  if (!text) return [];

  // Pre-process the text to fix common formatting issues
  let processedText = text.trim();

  // 1. Fix orphaned punctuation and quotes by removing newlines between text and punctuation/quotes
  processedText = processedText.replace(/(\S)\s*\n+\s*([.!?;,])/g, '$1$2');
  processedText = processedText.replace(/([.!?;,])\s*\n+\s*([''"”])/g, '$1$2'); // Adjusted quote chars

  // Find the response line (first sentence ending with period, question mark, or exclamation)
  const responseEndIndex = processedText.search(/[.!?]/);
  if (responseEndIndex === -1) {
    console.warn('Could not reliably determine psalm response:', processedText);
    // Fallback: return the whole text as a single verse part?
    return [{ type: 'verse_part1', text: breakTextIntoLines(processedText) }]; // Apply line breaks even here?
  }

  const responseLine = processedText.substring(0, responseEndIndex + 1).trim();
  if (!responseLine) return [{ type: 'verse_part1', text: breakTextIntoLines(processedText) }];

  // Split the text into segments based on the response line
  const escapedResponse = responseLine.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&');
  const regexSplitter = new RegExp(`(${escapedResponse})`, 'g');
  const segments = processedText.split(regexSplitter).filter((s) => s && s.trim());
  const outputLines: PsalmLine[] = [];

  segments.forEach((segment) => {
    const currentSegment = segment.trim();

    // If this segment is the response line, add it as a response
    if (currentSegment === responseLine) {
      if (outputLines.length > 0 && outputLines[outputLines.length - 1].type !== 'blank') {
        outputLines.push({ type: 'blank' });
      }
      // Response itself doesn't need internal line breaks usually
      outputLines.push({ type: 'response', text: responseLine });
      outputLines.push({ type: 'blank' });
    } else {
      // For non-response segments (verse blocks)
      // Apply line breaking first
      const verseBlockWithBreaks = breakTextIntoLines(currentSegment); // Use the helper
      const verseLines = verseBlockWithBreaks.split('\n');

      verseLines.forEach((verseLine, verseIndex) => {
        if (!verseLine) return;

        // Original logic tried to split into part1/part2, but maybe just add as verse_part1?
        // Or, maybe the goal IS part1/part2, but based on the line breaks?
        // Let's stick closer to the *original* intent for this structured function,
        // but use the broken lines. Maybe assign alternating types?

        // Simplification: Just add each line-broken part as 'verse_part1' for now.
        // If you need part1/part2 distinction based on breaking, that's more complex.
        outputLines.push({ type: 'verse_part1', text: verseLine });

        /* // --- Alternative: Try to recreate part1/part2 based on lines ---
            // This might not align well with the original semantic split goal
            if (verseIndex % 2 === 0 || verseLines.length === 1) {
                 outputLines.push({ type: 'verse_part1', text: verseLine });
            } else {
                 // If previous was part1, make this part2
                 if (outputLines.length > 0 && outputLines[outputLines.length-1].type === 'verse_part1') {
                     outputLines.push({ type: 'verse_part2', text: verseLine });
                 } else {
                     // Otherwise, just make it another part1 (e.g., after a blank)
                     outputLines.push({ type: 'verse_part1', text: verseLine });
                 }
            }
            // --- End Alternative --- */
      });
      // Add a blank line *after* processing a verse block, before the next response
      if (outputLines.length > 0 && outputLines[outputLines.length - 1].type !== 'blank') {
        // outputLines.push({ type: 'blank' }); // This might add too many blanks, handled by response logic?
      }
    }
  });

  // Clean up blank lines (similar to original)
  const cleanedOutput = outputLines.reduce((acc, line, index, arr) => {
    // Avoid consecutive blanks
    if (!(line.type === 'blank' && index > 0 && arr[index - 1].type === 'blank')) {
      acc.push(line);
    }
    return acc;
  }, [] as PsalmLine[]);

  // Remove leading/trailing blanks
  if (cleanedOutput.length > 0 && cleanedOutput[0].type === 'blank') {
    cleanedOutput.shift();
  }
  if (cleanedOutput.length > 0 && cleanedOutput[cleanedOutput.length - 1].type === 'blank') {
    cleanedOutput.pop();
  }

  return cleanedOutput;
};

// --- Formatting for Gospel Acclamation (Refined) ---
// Consider using breakTextIntoLines helper here too if needed for verse parts
export const formatGospelAcclamationStructured = (text: string): GospelAcclamationLine[] => {
  // ... (keep your original implementation, but potentially use breakTextIntoLines on part1/part2)
  if (!text) return [];
  const originalText = text.trim();
  const mainSentenceEndIndex = originalText.search(/[.!?]/);
  if (mainSentenceEndIndex === -1) {
    console.warn('Could not reliably determine Acclamation main sentence:', originalText);
    return [{ type: 'main_sentence', text: originalText }];
  }
  const mainSentence = originalText.substring(0, mainSentenceEndIndex + 1).trim();
  if (!mainSentence) return [{ type: 'main_sentence', text: originalText }];

  const escapedMainSentence = mainSentence.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&');
  const verseRegex = new RegExp(`^${escapedMainSentence}\\s*(.*?)\\s*${escapedMainSentence}$`, 's');
  const verseMatch = originalText.match(verseRegex);
  let verseText = '';

  if (verseMatch && verseMatch[1]) {
    verseText = verseMatch[1].trim();
  } else if (!originalText.endsWith(mainSentence)) {
    verseText = originalText.substring(mainSentence.length).trim();
    if (verseText.endsWith(mainSentence)) {
      verseText = verseText.substring(0, verseText.length - mainSentence.length).trim();
    }
  } else if (
    originalText.startsWith(mainSentence) &&
    originalText.endsWith(mainSentence) &&
    originalText !== mainSentence
  ) {
    // Handle case where verse is missing but response repeats
    verseText = ''; // Explicitly set verseText to empty
  }

  if (!verseText && !originalText.endsWith(mainSentence) && originalText !== mainSentence) {
    console.warn('Could not reliably extract Acclamation verse:', originalText);
    return [{ type: 'main_sentence', text: mainSentence }];
  }
  // Allow case where only main sentence exists or repeats without verse
  // else if (!verseText && originalText.endsWith(mainSentence) && originalText !== mainSentence) {
  //    console.warn("Only main sentence found:", originalText);
  //    // This case is handled below now
  // }

  const outputLines: GospelAcclamationLine[] = [];
  outputLines.push({ type: 'main_sentence', text: mainSentence });

  if (verseText) {
    outputLines.push({ type: 'blank' });
    // Apply line breaking to the whole verse first
    const formattedVerse = breakTextIntoLines(verseText); // Use the helper!
    const verseLines = formattedVerse.split('\n');

    // Simple split: first half lines vs second half lines? Or just use existing split logic?
    // Let's stick to the original semantic split attempt for now, but apply line breaks AFTER splitting.
    const midPoint = Math.floor(verseText.length / 2);
    let breakIndex = -1,
      bestBreakScore = -1;
    // ... (keep the complex break finding logic for semantic split) ...
    for (let i = 1; i < verseText.length - 1; i++) {
      let currentScore = 0;
      if (verseText[i] === ':' || verseText[i] === ';') currentScore = 4;
      else if (verseText[i] === ',') currentScore = 3;
      else if (/\s/.test(verseText[i]) && !/\s/.test(verseText[i - 1])) currentScore = 1;
      if (currentScore > 0) {
        const proximityScore = midPoint > 0 ? 1 - Math.abs(i - midPoint) / midPoint : 1;
        const totalScore = currentScore + proximityScore;
        if (totalScore > bestBreakScore) {
          bestBreakScore = totalScore;
          breakIndex = i + 1;
        }
      }
    }
    if (breakIndex === -1) {
      for (let i = midPoint; i > 0; i--) {
        if (/\s/.test(verseText[i])) {
          breakIndex = i + 1;
          break;
        }
      }
      if (breakIndex === -1) {
        for (let i = midPoint + 1; i < verseText.length; i++) {
          if (/\s/.test(verseText[i])) {
            breakIndex = i + 1;
            break;
          }
        }
      }
      if (breakIndex === -1) {
        breakIndex = midPoint > 0 ? midPoint : 1;
      }
    }
    breakIndex = Math.max(1, breakIndex);
    if (breakIndex >= verseText.length) {
      breakIndex = verseText.length > 1 ? verseText.length - 1 : 1;
    }

    const part1Raw = verseText.substring(0, breakIndex).trim();
    const part2Raw = verseText.substring(breakIndex).trim();

    // Apply line breaking to each part *after* the semantic split
    if (part1Raw) outputLines.push({ type: 'verse_part1', text: breakTextIntoLines(part1Raw) });
    if (part2Raw) outputLines.push({ type: 'verse_part2', text: breakTextIntoLines(part2Raw) });
    else if (!part1Raw && verseText) {
      // If split failed but verse exists
      outputLines.push({ type: 'verse_part1', text: breakTextIntoLines(verseText) });
    }
  }

  // Add the second main sentence if there was a verse OR if it explicitly repeated
  if (verseText || (originalText.endsWith(mainSentence) && originalText !== mainSentence)) {
    if (outputLines.length > 0 && outputLines[outputLines.length - 1]?.type !== 'blank') {
      outputLines.push({ type: 'blank' });
    }
    outputLines.push({ type: 'main_sentence', text: mainSentence });
  }
  const finalOutput = outputLines.reduce((acc, line, index, arr) => {
    if (!(line.type === 'blank' && index > 0 && arr[index - 1].type === 'blank')) {
      acc.push(line);
    }
    return acc;
  }, [] as GospelAcclamationLine[]);
  // Clean leading/trailing blanks
  if (finalOutput.length > 0 && finalOutput[0].type === 'blank') {
    finalOutput.shift();
  }
  if (finalOutput.length > 0 && finalOutput[finalOutput.length - 1].type === 'blank') {
    finalOutput.pop();
  }
  return finalOutput;
};

// Helper function to split prose into paragraphs based on quoted sentences
export const formatProseWithQuotes = (text: string): string[] => {
  // ... (keep your original implementation here) ...
  if (!text) return [];
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?]['"’”]?)\s+/)
    .map((s) => s.trim())
    .filter((s) => s);
  if (sentences.length === 0) return [text];
  const paragraphs: string[] = [];
  let currentParagraphSentences: string[] = [];
  for (const sentence of sentences) {
    const hasQuote = /['"‘“]/.test(sentence);
    if (hasQuote) {
      if (currentParagraphSentences.length > 0) {
        paragraphs.push(currentParagraphSentences.join(' '));
        currentParagraphSentences = [];
      }
      paragraphs.push(sentence);
    } else {
      currentParagraphSentences.push(sentence);
    }
  }
  if (currentParagraphSentences.length > 0) {
    paragraphs.push(currentParagraphSentences.join(' '));
  }
  return paragraphs;
};

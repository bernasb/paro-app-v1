import { collection, doc, getDoc, setDoc, updateDoc, increment, getDocs, deleteDoc, writeBatch, query, limit } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { MagisteriumMessage } from '@/types/magisterium';

// Debug flag - set to true in production for better performance
const DEBUG_MODE = true;

// Collection reference
const COLLECTION_NAME = 'readingSummaries';
const summariesCollection = collection(db, COLLECTION_NAME);

// Cache expiration time (10 days in milliseconds)
const CACHE_EXPIRATION_MS = 10 * 24 * 60 * 60 * 1000;

// Interface for the cached summary document
interface CachedSummary {
  summary: string; // Concise bullet-point summary
  detailedExplanation?: string; // Detailed markdown explanation
  lastUpdated: number; // timestamp
  fetchCount: number;
}

/**
 * Creates a unique ID for a reading based on its title and citation
 * @param title The reading title
 * @param citation The reading citation
 * @returns A unique ID for the reading
 */
export const createReadingId = (title: string, citation: string): string => {
  // Remove special characters and spaces, replace with underscores
  const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  const cleanCitation = citation.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  return `${cleanTitle}_${cleanCitation}`;
};

/**
 * Cleans a summary text by removing footnote references and other problematic content
 * @param summary The summary text to clean
 * @returns The cleaned summary text
 */
export const cleanSummaryText = (summary: string): string => {
  // Remove footnote references like [^1], [^2], etc.
  return summary.replace(/\[\^[0-9]+\]/g, '');
};

/**
 * Gets a summary from the cache
 * @param title The reading title
 * @param citation The reading citation
 * @returns An object with the cached summary and detailed explanation, or null if not found or expired
 */
export const getCachedSummary = async (title: string, citation: string): Promise<{summary: string, detailedExplanation?: string} | null> => {
  try {
    const readingId = createReadingId(title, citation);
    const docRef = doc(summariesCollection, readingId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as CachedSummary;
      const now = Date.now();
      
      // Check if the cache is expired
      if (now - data.lastUpdated > CACHE_EXPIRATION_MS) {
        if (DEBUG_MODE) console.log(`Cache expired for reading: ${title} (${citation})`);
        return null;
      }
      
      // Increment the fetch count asynchronously
      updateDoc(docRef, {
        fetchCount: increment(1)
      }).catch(err => console.error('Error updating fetch count:', err));
      
      if (DEBUG_MODE) console.log(`Cache hit for reading: ${title} (${citation})`);
      
      // Return both summary and detailed explanation if available
      return {
        summary: data.summary,
        detailedExplanation: data.detailedExplanation
      };
    }
    
    if (DEBUG_MODE) console.log(`Cache miss for reading: ${title} (${citation})`);
    return null;
  } catch (error) {
    if (DEBUG_MODE) console.error('Error getting cached summary:', error);
    return null;
  }
};

/**
 * Saves a summary to the cache
 * @param title The reading title
 * @param citation The reading citation
 * @param summary The summary text
 * @param detailedExplanation Optional detailed explanation text
 * @returns A promise that resolves when the summary is saved
 */
export const saveSummaryToCache = async (
  title: string, 
  citation: string, 
  summary: string, 
  detailedExplanation?: string
): Promise<void> => {
  if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Starting saveSummaryToCache for "${title}" (${citation})`);
  
  try {
    // Step 1: Create reading ID
    const readingId = createReadingId(title, citation);
    if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Created reading ID: "${readingId}"`);
    
    const docRef = doc(summariesCollection, readingId);
    if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Created document reference for collection "${COLLECTION_NAME}"`);
    
    // Step 2: Clean the summary text
    const cleanedSummary = cleanSummaryText(summary);
    if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Cleaned summary (${cleanedSummary.length} chars): "${cleanedSummary.substring(0, 50)}..."`);
    
    // Step 3: Create the cache document
    const cacheDoc: CachedSummary = {
      summary: cleanedSummary,
      lastUpdated: Date.now(),
      fetchCount: 1
    };
    
    // Add detailed explanation if provided
    if (detailedExplanation) {
      const cleanedExplanation = cleanSummaryText(detailedExplanation);
      if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Cleaned detailed explanation (${cleanedExplanation.length} chars)`);
      cacheDoc.detailedExplanation = cleanedExplanation;
    }
    
    // Log the document we're about to save
    if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: About to save document to Firestore:`, {
      collection: COLLECTION_NAME,
      id: readingId,
      summaryLength: cleanedSummary.length,
      timestamp: new Date().toISOString()
    });
    
    // Step 4: Save to Firestore with explicit error handling
    try {
      if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Calling setDoc...`);
      await setDoc(docRef, cacheDoc);
      if (DEBUG_MODE) console.log(`✅ CACHE DEBUG: Successfully saved summary to cache: "${title}" (${citation})`);
    } catch (innerError) {
      console.error(`❌ CACHE DEBUG: Error during setDoc operation:`, innerError);
      if (innerError instanceof Error) {
        console.error(`CACHE DEBUG: Inner error details - Name: ${innerError.name}, Message: ${innerError.message}`);
        console.error(`CACHE DEBUG: Stack trace: ${innerError.stack}`);
      }
      throw innerError; // Re-throw to be caught by outer try/catch
    }
    
    // Step 5: Verify the document was saved (only in debug mode)
    if (DEBUG_MODE) {
      try {
        console.log(`🔍 CACHE DEBUG: Verifying document was saved...`);
        const savedDoc = await getDoc(docRef);
        if (savedDoc.exists()) {
          console.log(`✅ CACHE DEBUG: Verification successful! Document exists in Firestore.`);
        } else {
          console.error(`❌ CACHE DEBUG: Verification failed! Document does not exist in Firestore after save.`);
        }
      } catch (verifyError) {
        console.error(`❌ CACHE DEBUG: Error verifying document save:`, verifyError);
      }
    }
    
  } catch (error) {
    console.error('❌ CACHE DEBUG: Error in saveSummaryToCache:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error(`CACHE DEBUG: Error details - Name: ${error.name}, Message: ${error.message}`);
      console.error(`CACHE DEBUG: Stack trace: ${error.stack}`);
    }
    // Don't throw the error - just log it and continue
    // This way, even if caching fails, the app can continue functioning
    console.log(`🔍 CACHE DEBUG: Suppressing error to allow app to continue`);
  }
};

/**
 * Gets a summary for a reading, either from cache or by calling the API
 * @param title The reading title
 * @param citation The reading citation
 * @param fetchFromApi Function to call the API if needed
 * @returns An object with the summary and optional detailed explanation
 */
export const getSummaryWithCache = async (
  title: string, 
  citation: string,
  fetchFromApi: (reading: { title: string, citation: string }) => Promise<{summary: string, detailedExplanation?: string} | string>
): Promise<{summary: string, detailedExplanation?: string}> => {
  if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Starting getSummaryWithCache for "${title}" (${citation})`);
  const readingId = createReadingId(title, citation);
  if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Generated reading ID: "${readingId}"`);
  
  try {
    // Step 1: Try to get from cache first
    if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Checking cache for summary...`);
    const cachedData = await getCachedSummary(title, citation);
    
    if (cachedData) {
      if (DEBUG_MODE) console.log(`✅ CACHE DEBUG: Cache hit! Using cached summary for: "${title}" (${citation})`);
      return cachedData;
    }
    
    // Step 2: If not in cache, fetch from API
    if (DEBUG_MODE) console.log(`🔄 CACHE DEBUG: Cache miss. Fetching summary from API for: "${title}" (${citation})`);
    let apiResult;
    try {
      apiResult = await fetchFromApi({ title, citation });
      if (DEBUG_MODE) {
        if (typeof apiResult === 'string') {
          console.log(`✅ CACHE DEBUG: API returned summary string (${apiResult.length} chars)`);
        } else {
          console.log(`✅ CACHE DEBUG: API returned summary object with summary (${apiResult.summary.length} chars)`);
        }
      }
    } catch (apiError) {
      console.error(`❌ CACHE DEBUG: Error fetching from API:`, apiError);
      throw apiError; // Re-throw to be caught by outer try/catch
    }
    
    // Step 3: Save to cache for future use
    if (DEBUG_MODE) console.log(`💾 CACHE DEBUG: Saving summary to cache for: "${title}" (${citation})`);
    
    // Process the API result based on its type
    let summary: string;
    let detailedExplanation: string | undefined;
    
    if (typeof apiResult === 'string') {
      // Legacy format - just a summary string
      summary = apiResult;
    } else {
      // New format - object with summary and optional detailed explanation
      summary = apiResult.summary;
      detailedExplanation = apiResult.detailedExplanation;
    }
    
    try {
      // Save synchronously - don't use setTimeout
      if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Saving to cache synchronously`);
      await saveSummaryToCache(title, citation, summary, detailedExplanation);
      if (DEBUG_MODE) console.log(`✅ CACHE DEBUG: Successfully saved summary to cache synchronously`);
    } catch (cacheError) {
      // Log the error but don't throw it - we still want to return the summary
      console.error(`❌ CACHE DEBUG: Error saving to cache:`, cacheError);
      if (DEBUG_MODE) console.log(`🔍 CACHE DEBUG: Continuing despite cache error`);
    }
    
    // Step 4: Return the cleaned summary and detailed explanation
    const cleanedSummary = cleanSummaryText(summary);
    const cleanedExplanation = detailedExplanation ? cleanSummaryText(detailedExplanation) : undefined;
    
    if (DEBUG_MODE) console.log(`✅ CACHE DEBUG: Returning cleaned summary to caller`);
    return {
      summary: cleanedSummary,
      detailedExplanation: cleanedExplanation
    };
  } catch (error) {
    console.error(`❌ CACHE DEBUG: Error in getSummaryWithCache:`, error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error(`CACHE DEBUG: Error details - Name: ${error.name}, Message: ${error.message}`);
      console.error(`CACHE DEBUG: Stack trace: ${error.stack}`);
    }
    throw error;
  }
};

/**
 * Hardcoded summaries for Easter Vigil readings
 */
export const easterVigilSummaries: Record<string, string> = {
  'Reading_I_Genesis_1_1_2_2': 'The Creation account from Genesis describes God creating the heavens and earth in six days and resting on the seventh. This reading emphasizes God as the creator of all things, establishing the foundation of our existence and relationship with Him. It reminds us that all creation is good and that humans are made in God\'s image, with a special dignity and purpose.',
  
  'Psalm_I_Psalm_104_1_2_5_6_10_12_13_14_24_35': 'Psalm 104 is a hymn of praise to God as creator and sustainer of all life. It celebrates the wisdom with which God ordered creation and continues to care for it. This psalm reminds us of our dependence on God\'s providence and invites us to join all creation in praising the Lord.',
  
  'Reading_II_Genesis_22_1_18': 'The story of Abraham\'s willingness to sacrifice his son Isaac demonstrates complete faith and obedience to God. This prefigures God\'s sacrifice of His own Son, Jesus Christ. Abraham\'s faithfulness is rewarded with God\'s promise of abundant blessing, foreshadowing the universal salvation that would come through Christ.',
  
  'Psalm_II_Psalm_16_5_8_9_10_11': 'Psalm 16 expresses confidence in God\'s protection and the joy of living in relationship with Him. The psalmist declares that God is his inheritance and cup, showing complete trust in God\'s providence. Christians see in this psalm a prophecy of Christ\'s resurrection, as it speaks of not abandoning one\'s soul to the netherworld.',
  
  'Reading_III_Exodus_14_15_15_1': 'The Exodus account of the Israelites crossing the Red Sea represents God\'s definitive liberation of His people from slavery in Egypt. This pivotal salvation event prefigures Christian baptism, through which believers pass from the slavery of sin to new life in Christ. The dramatic defeat of Pharaoh\'s army demonstrates God\'s power and commitment to saving His people.',
  
  'Psalm_III_Exodus_15_1_2_3_4_5_6_17_18': 'The Song of Moses celebrates God\'s triumph over the Egyptian forces at the Red Sea. This canticle praises God as a mighty warrior who has thrown the horse and chariot into the sea. It rejoices in God\'s strength, salvation, and eternal kingship, themes that find their fulfillment in Christ\'s victory over sin and death.',
  
  'Reading_IV_Isaiah_54_5_14': 'Isaiah\'s prophecy speaks of God as the redeemer who reclaims His people after a period of abandonment. Using the image of marriage, it describes God\'s eternal love and mercy toward Israel. This reading points to the Church as the new Jerusalem, the bride of Christ, established in justice and peace.',
  
  'Psalm_IV_Psalm_30_2_4_5_6_11_12_13': 'Psalm 30 is a song of thanksgiving for healing and restoration. The psalmist praises God for bringing him up from the netherworld and turning mourning into dancing. This psalm reflects the Easter joy of moving from death to life and anticipates the resurrection of Christ.',
  
  'Reading_V_Isaiah_55_1_11': 'Isaiah invites all who thirst to come to the waters, offering God\'s abundant gifts freely. This reading emphasizes God\'s generosity and the power of His word, which accomplishes His purpose. It prefigures the sacraments, especially Baptism and Eucharist, and calls us to seek the Lord while he may be found.',
  
  'Psalm_V_Isaiah_12_2_3_4_5_6': 'This canticle from Isaiah expresses joy in God\'s salvation. It speaks of drawing water from the springs of salvation, a powerful baptismal image. The song calls all to proclaim God\'s name and sing His praises, reflecting the Easter joy of the Church.',
  
  'Reading_VI_Baruch_3_9_15_32_4_4': 'Baruch reflects on Israel\'s exile as a consequence of abandoning God\'s wisdom. It praises divine wisdom, which God has revealed to Israel through the Law. This reading highlights the importance of following God\'s commandments and recognizes that true wisdom comes from God alone.',
  
  'Psalm_VI_Psalm_19_8_9_10_11': 'Psalm 19 praises God\'s perfect law that refreshes the soul and gives wisdom to the simple. It celebrates God\'s commandments as more desirable than gold and sweeter than honey. This psalm reminds us that God\'s law is not a burden but a gift that brings light and joy.',
  
  'Reading_VII_Ezekiel_36_16_17a_18_28': 'Ezekiel prophesies God\'s promise to cleanse His people from their impurities and give them a new heart and spirit. This reading directly prefigures Christian baptism, in which God purifies believers with clean water and places His Spirit within them. It emphasizes God\'s initiative in salvation and His desire to restore relationship with His people.',
  
  'Psalm_VII_Psalm_42_3_5_43_3_4': 'Psalms 42-43 express a deep longing for God, comparing it to a deer that longs for flowing streams. The psalmist yearns to appear before God and be led by His light and truth. This reflects the catechumen\'s desire for baptism and the Christian\'s ongoing thirst for deeper communion with God.',
  
  'Epistle_Romans_6_3_11': 'Paul explains that in baptism, Christians are united with Christ in His death and resurrection. This reading is central to the Easter Vigil as it explicitly connects baptism with Easter, teaching that through this sacrament we die to sin and rise to new life in Christ. It calls the baptized to consider themselves dead to sin and alive to God in Christ Jesus.',
  
  'Responsorial_Psalm_Psalm_118_1_2_16_17_22_23': '"The stone that the builders rejected has become the chief cornerstone" is a central theme during the Easter Vigil, symbolizing Christ\'s resurrection. This psalm signifies the triumph over death and the enduring love of God, which resonates deeply with Catholics as they celebrate Jesus\' victory and the promise of eternal life. It emphasizes that what was once rejected and deemed worthless has become the foundation of salvation.',
  
  'Epistle_Psalm_Psalm_118_1_2_16_17_22_23': '"The stone that the builders rejected has become the chief cornerstone" is a central theme during the Easter Vigil, symbolizing Christ\'s resurrection. This psalm signifies the triumph over death and the enduring love of God, which resonates deeply with Catholics as they celebrate Jesus\' victory and the promise of eternal life. It emphasizes that what was once rejected and deemed worthless has become the foundation of salvation.',
  
  'Gospel_Luke_24_1_12': 'Luke\'s account of the resurrection begins with women discovering the empty tomb and encountering angels who announce that Jesus has risen. When they tell the apostles, Peter runs to the tomb and finds it empty, with only the burial cloths remaining. This Gospel proclaims the central mystery of our faith: Christ is risen from the dead, conquering sin and death for all humanity.'
};

/**
 * Gets a hardcoded summary for Easter Vigil readings if available
 * @param title The reading title
 * @param citation The reading citation
 * @returns The hardcoded summary or null if not found
 */
export const getEasterVigilSummary = (title: string, citation: string): string | null => {
  if (DEBUG_MODE) console.log(`🔍 Looking for Easter Vigil summary for: "${title}" (${citation})`);
  
  // Generate the standard reading ID
  const readingId = createReadingId(title, citation);
  if (DEBUG_MODE) console.log(`Generated reading ID: ${readingId}`);
  
  // Try to find the summary with the standard ID
  let summary = easterVigilSummaries[readingId];
  
  // If not found, try some alternative formats
  if (!summary) {
    if (DEBUG_MODE) console.log(`No summary found with ID: ${readingId}`);
    
    // Try with "Responsorial" instead of "Epistle_Responsorial"
    if (title.includes("Epistle Responsorial")) {
      const altTitle = title.replace("Epistle Responsorial", "Responsorial");
      const altId = createReadingId(altTitle, citation);
      if (DEBUG_MODE) console.log(`Trying alternative ID: ${altId}`);
      summary = easterVigilSummaries[altId];
    }
    
    // Try with "Epistle_Responsorial" instead of "Responsorial"
    if (!summary && title.includes("Responsorial")) {
      const altTitle = title.replace("Responsorial", "Epistle Responsorial");
      const altId = createReadingId(altTitle, citation);
      if (DEBUG_MODE) console.log(`Trying alternative ID: ${altId}`);
      summary = easterVigilSummaries[altId];
    }
  }
  
  // Log all available keys for debugging
  if (!summary && DEBUG_MODE) {
    console.log('Available keys in easterVigilSummaries:');
    Object.keys(easterVigilSummaries).forEach(key => {
      console.log(`- ${key}`);
    });
  }
  
  if (DEBUG_MODE) console.log(summary ? `✅ Found Easter Vigil summary!` : `❌ No Easter Vigil summary found for this reading`);
  return summary || null;
};

/**
 * Clears all reading summaries from the cache
 * This is useful when you want to force a refresh of all summaries
 * @returns A promise that resolves with the number of documents deleted
 */
export const clearCache = async (): Promise<number> => {
  console.log('🧹 Starting cache clearing operation...');
  
  try {
    // Get all documents in the collection
    const querySnapshot = await getDocs(summariesCollection);
    console.log(`Found ${querySnapshot.size} documents in cache`);
    
    // Use batched writes for better performance
    const batchSize = 500; // Firestore batch limit is 500
    let totalDeleted = 0;
    let batch = writeBatch(db);
    let batchCount = 0;
    
    // Add delete operations to the batch
    querySnapshot.forEach((docSnapshot) => {
      batch.delete(doc(summariesCollection, docSnapshot.id));
      batchCount++;
      totalDeleted++;
      
      // If we've reached the batch limit, commit and start a new batch
      if (batchCount >= batchSize) {
        console.log(`Committing batch of ${batchCount} deletes...`);
        batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    });
    
    // Commit any remaining deletes
    if (batchCount > 0) {
      console.log(`Committing final batch of ${batchCount} deletes...`);
      await batch.commit();
    }
    
    console.log(`✅ Successfully cleared ${totalDeleted} documents from cache`);
    return totalDeleted;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, Message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  }
};

/**
 * Gets cache statistics
 * @returns A promise that resolves with cache statistics
 */
export const getCacheStats = async (): Promise<{
  totalDocuments: number;
  oldestDocument?: { id: string; lastUpdated: Date };
  newestDocument?: { id: string; lastUpdated: Date };
  mostAccessed?: { id: string; fetchCount: number };
}> => {
  console.log('📊 Getting cache statistics...');
  
  try {
    // Get all documents in the collection
    const querySnapshot = await getDocs(summariesCollection);
    console.log(`Found ${querySnapshot.size} documents in cache`);
    
    let oldestTimestamp = Date.now();
    let oldestId = '';
    let newestTimestamp = 0;
    let newestId = '';
    let highestFetchCount = 0;
    let mostAccessedId = '';
    
    // Process each document
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as CachedSummary;
      
      // Check for oldest document
      if (data.lastUpdated < oldestTimestamp) {
        oldestTimestamp = data.lastUpdated;
        oldestId = docSnapshot.id;
      }
      
      // Check for newest document
      if (data.lastUpdated > newestTimestamp) {
        newestTimestamp = data.lastUpdated;
        newestId = docSnapshot.id;
      }
      
      // Check for most accessed document
      if (data.fetchCount > highestFetchCount) {
        highestFetchCount = data.fetchCount;
        mostAccessedId = docSnapshot.id;
      }
    });
    
    // Prepare the result
    const result: {
      totalDocuments: number;
      oldestDocument?: { id: string; lastUpdated: Date };
      newestDocument?: { id: string; lastUpdated: Date };
      mostAccessed?: { id: string; fetchCount: number };
    } = {
      totalDocuments: querySnapshot.size
    };
    
    // Add oldest document if found
    if (oldestId) {
      result.oldestDocument = {
        id: oldestId,
        lastUpdated: new Date(oldestTimestamp)
      };
    }
    
    // Add newest document if found
    if (newestId) {
      result.newestDocument = {
        id: newestId,
        lastUpdated: new Date(newestTimestamp)
      };
    }
    
    // Add most accessed document if found
    if (mostAccessedId && highestFetchCount > 0) {
      result.mostAccessed = {
        id: mostAccessedId,
        fetchCount: highestFetchCount
      };
    }
    
    console.log('✅ Successfully retrieved cache statistics');
    return result;
  } catch (error) {
    console.error('❌ Error getting cache statistics:', error);
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, Message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  }
};

/**
 * Pre-fetches readings for a specific date
 * This is useful for preparing the cache in advance
 * @param date The date to pre-fetch readings for
 * @param getDailyReadings Function to get the readings for a date
 * @param getReadingSummary Function to get the summary for a reading
 * @returns A promise that resolves with the number of readings pre-fetched
 */
export const preFetchReadingsForDate = async (
  date: Date,
  getDailyReadings: (date: Date) => Promise<Array<{ title: string; citation: string }>>,
  getReadingSummary: (reading: { title: string; citation: string }) => Promise<{summary: string, detailedExplanation?: string}>
): Promise<number> => {
  console.log(`🔄 Pre-fetching readings for ${date.toISOString().split('T')[0]}...`);
  
  try {
    // Get the readings for the date
    const readings = await getDailyReadings(date);
    console.log(`Found ${readings.length} readings for ${date.toISOString().split('T')[0]}`);
    
    // Fetch summaries for each reading
    let successCount = 0;
    let errorCount = 0;
    
    for (const reading of readings) {
      try {
        console.log(`Pre-fetching summary for ${reading.title} (${reading.citation})...`);
        await getReadingSummary(reading);
        console.log(`✅ Successfully pre-fetched summary for ${reading.title} (${reading.citation})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error pre-fetching summary for ${reading.title} (${reading.citation}):`, error);
        errorCount++;
      }
    }
    
    console.log(`✅ Pre-fetch complete: ${successCount} successful, ${errorCount} failed`);
    return successCount;
  } catch (error) {
    console.error('❌ Error pre-fetching readings:', error);
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, Message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  }
};

/**
 * Test function to verify Firestore connection
 * This function writes a test document to Firestore
 * @returns A promise that resolves when the test is complete
 */
export const testFirestoreConnection = async (): Promise<void> => {
  try {
    if (DEBUG_MODE) console.log('🧪 Testing Firestore connection...');
    
    // Create a test document
    const testDoc = {
      summary: 'This is a test summary to verify Firestore connection.',
      lastUpdated: Date.now(),
      fetchCount: 0,
      isTest: true
    };
    
    // Save to Firestore
    const docRef = doc(summariesCollection, 'test_connection');
    await setDoc(docRef, testDoc);
    
    if (DEBUG_MODE) console.log('✅ Successfully wrote test document to Firestore!');
    
    // Verify we can read it back
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      if (DEBUG_MODE) console.log('✅ Successfully read test document from Firestore!');
      if (DEBUG_MODE) console.log('Test document data:', docSnap.data());
    } else {
      console.error('❌ Test document not found after writing!');
    }
  } catch (error) {
    console.error('❌ Error testing Firestore connection:', error);
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, Message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  }
};

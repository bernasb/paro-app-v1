import * as admin from 'firebase-admin';
import axios from 'axios';
import { errorResponse, successResponse, requireAuth } from './shared/utils';
import { MagisteriumMessage, MagisteriumProxyResponse } from './shared/types';
import { onCall } from 'firebase-functions/v2/https';

admin.initializeApp();

import { dailyReadingsProxy } from './proxies/dailyReadingsProxy';
import { readingSummaryProxy } from './proxies/readingSummaryProxy';
import { magisteriumProxy } from './proxies/magisteriumProxy';

export { dailyReadingsProxy, readingSummaryProxy, magisteriumProxy };

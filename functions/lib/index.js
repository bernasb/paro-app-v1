"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.magisteriumProxy = exports.readingSummaryProxy = exports.dailyReadingsProxy = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const dailyReadingsProxy_1 = require("./proxies/dailyReadingsProxy");
Object.defineProperty(exports, "dailyReadingsProxy", { enumerable: true, get: function () { return dailyReadingsProxy_1.dailyReadingsProxy; } });
const readingSummaryProxy_1 = require("./proxies/readingSummaryProxy");
Object.defineProperty(exports, "readingSummaryProxy", { enumerable: true, get: function () { return readingSummaryProxy_1.readingSummaryProxy; } });
const magisteriumProxy_1 = require("./proxies/magisteriumProxy");
Object.defineProperty(exports, "magisteriumProxy", { enumerable: true, get: function () { return magisteriumProxy_1.magisteriumProxy; } });

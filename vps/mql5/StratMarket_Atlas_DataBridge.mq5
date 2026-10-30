//+------------------------------------------------------------------+
//|                                   StratMarket_Atlas_DataBridge.mq5 |
//|                                  Copyright 2026, Elvaris Capital |
//|                                   https://strat-market-chi.vercel.app |
//+------------------------------------------------------------------+
#property copyright   "Elvaris Capital"
#property link        "https://strat-market-chi.vercel.app"
#property version     "1.00"
#property description "Streams real-time Atlas Funded tick and bar data to StratMarket VPS"

//--- Inputs
input string   InpVpsUrl       = "http://130.210.35.246:8080/api/vps/ticks"; // VPS Tick Ingestion URL
input int      InpThrottleMs   = 1000;                                        // Minimum interval between sends (ms)
input bool     InpLogEvents    = true;                                        // Log sends to Experts journal

//--- State variables
ulong  g_last_send_time = 0;
string g_symbol;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   g_symbol = _Symbol;
   PrintFormat("[StratMarket Bridge] Initialized on %s. Target VPS: %s", g_symbol, InpVpsUrl);
   Print("[StratMarket Bridge] IMPORTANT: Ensure InpVpsUrl is added to Tools -> Options -> Expert Advisors -> Allow WebRequest for listed URL");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   Print("[StratMarket Bridge] Stopped.");
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   ulong now = GetTickCount64();
   if(now - g_last_send_time < (ulong)InpThrottleMs)
      return; // Throttle to prevent network congestion

   g_last_send_time = now;

   MqlTick tick;
   if(!SymbolInfoTick(g_symbol, tick))
      return;

   // Construct JSON payload
   string json = StringFormat(
      "{\"symbol\":\"%s\",\"bid\":%.5f,\"ask\":%.5f,\"last\":%.5f,\"spread\":%d,\"time\":%I64d,\"broker\":\"AtlasFunded\"}",
      g_symbol,
      tick.bid,
      tick.ask,
      tick.last,
      (int)SymbolInfoInteger(g_symbol, SYMBOL_SPREAD),
      (long)tick.time_msc
   );

   // Prepare HTTP POST request
   char   post_data[];
   char   result_data[];
   string result_headers;
   StringToCharArray(json, post_data, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post_data, ArraySize(post_data) - 1); // Remove null terminator

   string headers = "Content-Type: application/json\r\nUser-Agent: StratMarket-MT5-Bridge/1.0\r\n";

   ResetLastError();
   int res = WebRequest("POST", InpVpsUrl, headers, 3000, post_data, result_data, result_headers);

   if(res == 200)
     {
      if(InpLogEvents && (now % 30000 < InpThrottleMs))
        {
         PrintFormat("[StratMarket Bridge] Ingested tick on %s: Bid=%.2f Ask=%.2f -> VPS 200 OK", g_symbol, tick.bid, tick.ask);
        }
     }
   else
     {
      int err = GetLastError();
      if(err == 4014) // ERR_WEBREQUEST_NOT_ALLOWED
        {
         Print("[StratMarket Bridge] ERROR: WebRequest not allowed! Add 'http://130.210.35.246:8080' to MT5 WebRequest whitelist in Tools -> Options -> Expert Advisors.");
        }
      else
        {
         PrintFormat("[StratMarket Bridge] Send error: code=%d err=%d", res, err);
        }
     }
  }
//+------------------------------------------------------------------+

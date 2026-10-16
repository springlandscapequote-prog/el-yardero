// El Yardero settings (plain JS, no build step).
// ASK_API_URL: leave '' to answer from the lessons on the device (no network). Later you can put the address of a small proxy
//   that calls a real AI service; js/ask.js will POST {question, lang, context:[top lessons]} to it and expects {answer, sources:[ids]}.
//   If the proxy fails or is slow (9 s), the app falls back to the local answer automatically. NEVER put an API key here.
var ASK_API_URL='';
// BOOKING_URL: address of the booking page for the one-hour consultation. The "Reservar / Book" button only appears when this is set.
var BOOKING_URL='';
// Footer links
var STORE_URL='https://fermilionaire.gumroad.com';
var SOCIAL_HANDLE='@fermillonetas';

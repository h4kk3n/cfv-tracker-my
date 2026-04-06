export const APP_NAME = 'CFV Tracker MY';
export const APP_DESCRIPTION = 'Cardfight!! Vanguard Card Tracker for Malaysian Players';
export const CARDS_PER_PAGE = 24;
export const MESSAGES_PER_PAGE = 50;
export const TRADES_PER_PAGE = 20;

export const TRADE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  discussing: 'In Discussion',
  accepted: 'Accepted',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

export const TRADE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  discussing: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  disputed: 'bg-orange-100 text-orange-800',
};

export const CONDITION_LABELS: Record<string, string> = {
  Mint: 'Mint (M)',
  NM: 'Near Mint (NM)',
  LP: 'Lightly Played (LP)',
  MP: 'Moderately Played (MP)',
  HP: 'Heavily Played (HP)',
};

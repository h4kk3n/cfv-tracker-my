import { CollectionItem } from '../types/collection';
import { WishlistItem, TradeMatch } from '../types/trade';

interface UserTradeData {
  userId: string;
  displayName: string;
  forTrade: CollectionItem[];
  wishlist: WishlistItem[];
}

export function findTradeMatches(
  myForTrade: CollectionItem[],
  myWishlist: WishlistItem[],
  otherUsers: UserTradeData[]
): TradeMatch[] {
  const myForTradeIds = new Set(myForTrade.filter((c) => c.forTrade > 0).map((c) => c.cardId));
  const myWishlistIds = new Set(myWishlist.map((w) => w.cardId));

  const matches: TradeMatch[] = [];

  for (const user of otherUsers) {
    const theirForTradeIds = new Set(user.forTrade.filter((c) => c.forTrade > 0).map((c) => c.cardId));
    const theirWishlistIds = new Set(user.wishlist.map((w) => w.cardId));

    const theyCanGiveMe = [...theirForTradeIds].filter((id) => myWishlistIds.has(id));
    const iCanGiveThem = [...myForTradeIds].filter((id) => theirWishlistIds.has(id));

    if (theyCanGiveMe.length > 0 || iCanGiveThem.length > 0) {
      matches.push({
        userId: user.userId,
        displayName: user.displayName,
        theyCanGiveMe,
        iCanGiveThem,
        score: theyCanGiveMe.length + iCanGiveThem.length,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

import type { PricingResult } from '@/types';

export function calculateRentalPrice(
  dailyRate: number,
  days: number,
  startingPrice: number,
  capPrice: number
): PricingResult {
  const baseAmount = dailyRate * days;

  if (baseAmount < startingPrice) {
    return {
      baseAmount,
      finalAmount: startingPrice,
      pricingType: 'starting',
    };
  }

  if (baseAmount > capPrice) {
    return {
      baseAmount,
      finalAmount: capPrice,
      pricingType: 'cap',
    };
  }

  return {
    baseAmount,
    finalAmount: baseAmount,
    pricingType: 'normal',
  };
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function getPricingTypeLabel(type: 'normal' | 'starting' | 'cap'): string {
  const labels = {
    normal: '标准计费',
    starting: '起步价',
    cap: '封顶价',
  };
  return labels[type];
}

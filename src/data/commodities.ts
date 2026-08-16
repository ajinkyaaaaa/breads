import type { Commodity } from './types';

/**
 * Illustrative ₹/quintal base ranges, loosely modelled on typical Agmarknet
 * reporting for these commodities, plus an illustrative default trade-lot
 * size (bulkier/lower-value vegetables move in bigger lots than compact,
 * higher-value pulses/spices). Mock data only, not sourced.
 */
export const COMMODITIES: Commodity[] = [
  { id: 'tomato', name: 'Tomato', nameHi: 'टमाटर', unit: 'quintal', baseMin: 800, baseMax: 2500, defaultLotQuintals: 40 },
  { id: 'onion', name: 'Onion', nameHi: 'प्याज़', unit: 'quintal', baseMin: 1000, baseMax: 3000, defaultLotQuintals: 50 },
  { id: 'potato', name: 'Potato', nameHi: 'आलू', unit: 'quintal', baseMin: 800, baseMax: 1800, defaultLotQuintals: 50 },
  { id: 'orange', name: 'Orange', nameHi: 'संतरा', unit: 'quintal', baseMin: 1500, baseMax: 4000, defaultLotQuintals: 25 },
  { id: 'chilli', name: 'Green Chilli', nameHi: 'हरी मिर्च', unit: 'quintal', baseMin: 2000, baseMax: 5000, defaultLotQuintals: 15 },
  { id: 'soybean', name: 'Soybean', nameHi: 'सोयाबीन', unit: 'quintal', baseMin: 4000, baseMax: 4800, defaultLotQuintals: 80 },
  { id: 'cotton', name: 'Cotton', nameHi: 'कपास', unit: 'quintal', baseMin: 6500, baseMax: 7500, defaultLotQuintals: 60 },
  { id: 'wheat', name: 'Wheat', nameHi: 'गेहूं', unit: 'quintal', baseMin: 2200, baseMax: 2600, defaultLotQuintals: 100 },
  { id: 'gram', name: 'Gram', nameHi: 'चना', unit: 'quintal', baseMin: 4800, baseMax: 5500, defaultLotQuintals: 60 },
  { id: 'tur', name: 'Tur (Arhar)', nameHi: 'अरहर', unit: 'quintal', baseMin: 9000, baseMax: 10500, defaultLotQuintals: 20 },
  { id: 'brinjal', name: 'Brinjal', nameHi: 'बैंगन', unit: 'quintal', baseMin: 600, baseMax: 1500, defaultLotQuintals: 30 },
  { id: 'cauliflower', name: 'Cauliflower', nameHi: 'फूलगोभी', unit: 'quintal', baseMin: 800, baseMax: 2000, defaultLotQuintals: 35 },
];

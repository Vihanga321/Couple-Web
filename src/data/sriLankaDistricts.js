export const SRI_LANKA_DISTRICTS = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
];

export const DISTRICT_OPTIONS = ['All Sri Lanka', ...SRI_LANKA_DISTRICTS];

const AREA_TO_DISTRICT = {
  negombo: 'Gampaha',
  wattala: 'Gampaha',
  'ja-ela': 'Gampaha',
  jaela: 'Gampaha',
  katunayake: 'Gampaha',
  kelaniya: 'Gampaha',
  kadawatha: 'Gampaha',
  colombo: 'Colombo',
  dehiwala: 'Colombo',
  'mount lavinia': 'Colombo',
  mountlavinia: 'Colombo',
  moratuwa: 'Colombo',
  nugegoda: 'Colombo',
  maharagama: 'Colombo',
  kaduwela: 'Colombo',
  homagama: 'Colombo',
  kandy: 'Kandy',
  peradeniya: 'Kandy',
  galle: 'Galle',
  hikkaduwa: 'Galle',
  unawatuna: 'Galle',
  matara: 'Matara',
  weligama: 'Matara',
  mirissa: 'Matara',
  ella: 'Badulla',
  bandarawela: 'Badulla',
  badulla: 'Badulla',
  'nuwara eliya': 'Nuwara Eliya',
  kurunegala: 'Kurunegala',
  anuradhapura: 'Anuradhapura',
  polonnaruwa: 'Polonnaruwa',
  jaffna: 'Jaffna',
  trincomalee: 'Trincomalee',
  batticaloa: 'Batticaloa',
  kalutara: 'Kalutara',
  bentota: 'Kalutara',
  hambantota: 'Hambantota',
  tangalle: 'Hambantota',
  ratnapura: 'Ratnapura',
  kegalle: 'Kegalle',
  matale: 'Matale',
  puttalam: 'Puttalam',
  chilaw: 'Puttalam',
  mannar: 'Mannar',
  vavuniya: 'Vavuniya',
  kilinochchi: 'Kilinochchi',
  mullaitivu: 'Mullaitivu',
  ampara: 'Ampara',
  monaragala: 'Monaragala',
};

export function normalizeDistrict(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Gampaha';
  if (raw === 'All Sri Lanka') return raw;
  const direct = SRI_LANKA_DISTRICTS.find((district) => district.toLowerCase() === raw.toLowerCase());
  if (direct) return direct;
  return AREA_TO_DISTRICT[raw.toLowerCase()] || raw;
}

export function matchesDistrict(itemLocation, selectedDistrict) {
  if (!selectedDistrict || selectedDistrict === 'All Sri Lanka') return true;
  return normalizeDistrict(itemLocation) === normalizeDistrict(selectedDistrict);
}

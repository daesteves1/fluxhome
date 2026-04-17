export type Bank = {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  color: string;
};

export const banks: Bank[] = [
  {
    id: 'cgd',
    name: 'Caixa Geral de Depósitos',
    shortName: 'CGD',
    logoUrl: null,
    color: '#00704A',
  },
  {
    id: 'bcp',
    name: 'Millennium BCP',
    shortName: 'BCP',
    logoUrl: null,
    color: '#CC0000',
  },
  {
    id: 'santander',
    name: 'Banco Santander',
    shortName: 'Santander',
    logoUrl: null,
    color: '#EC0000',
  },
  {
    id: 'bpi',
    name: 'Banco Português de Investimento',
    shortName: 'BPI',
    logoUrl: null,
    color: '#002E6D',
  },
  {
    id: 'novobanco',
    name: 'Novo Banco',
    shortName: 'Novo Banco',
    logoUrl: null,
    color: '#E30613',
  },
  {
    id: 'bankinter',
    name: 'Bankinter',
    shortName: 'Bankinter',
    logoUrl: null,
    color: '#FF6900',
  },
  {
    id: 'uci',
    name: 'Banco de Crédito Imobiliário',
    shortName: 'UCI',
    logoUrl: null,
    color: '#0066CC',
  },
  {
    id: 'credibom',
    name: 'Credibom',
    shortName: 'Credibom',
    logoUrl: null,
    color: '#003DA5',
  },
  {
    id: 'montepio',
    name: 'Banco Montepio',
    shortName: 'Montepio',
    logoUrl: null,
    color: '#006633',
  },
  {
    id: 'bbic',
    name: 'Banco BIC',
    shortName: 'BIC',
    logoUrl: null,
    color: '#003399',
  },
  {
    id: 'abanca',
    name: 'Abanca',
    shortName: 'Abanca',
    logoUrl: null,
    color: '#0066FF',
  },
  {
    id: 'cofidis',
    name: 'Cofidis',
    shortName: 'Cofidis',
    logoUrl: null,
    color: '#FF6600',
  },
  {
    id: 'ceca',
    name: 'Caixa Econômica e de Crédito Agrícola',
    shortName: 'CECA',
    logoUrl: null,
    color: '#1B5E3F',
  },
  {
    id: 'credicash',
    name: 'Credicash',
    shortName: 'Credicash',
    logoUrl: null,
    color: '#004B99',
  },
  {
    id: 'carrefourbank',
    name: 'Carrefour Bank',
    shortName: 'Carrefour Bank',
    logoUrl: null,
    color: '#E40000',
  },
  {
    id: 'activobank',
    name: 'ActivoBank',
    shortName: 'ActivoBank',
    logoUrl: null,
    color: '#0066CC',
  },
];

export function getBankById(id: string): Bank | undefined {
  return banks.find((bank) => bank.id === id);
}

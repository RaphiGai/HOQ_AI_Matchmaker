import type { House, Need, Strength } from '../types';
import { relKey, roofKey } from '../lib/hoq';

/**
 * Template House of Quality, taken from the team's Excel draft
 * "House_of_Quality_Meili.xlsx" (needs, importance, characteristics, directions, roof, competitors).
 *
 * The Excel relationship matrix is still empty, so the relationships below are
 * illustrative team estimates for the mockup. Competitor ratings stay empty until
 * Meili has rated them.
 */

const needs: Need[] = [
  { id: 'n1', text: 'Different robots share the space without collisions or blocking', importance: 4, origin: 'template' },
  { id: 'n2', text: 'Works with the robots I have and plan to buy', importance: 5, origin: 'template' },
  { id: 'n3', text: 'Adds value to the existing processes', importance: 5, origin: 'template' },
  { id: 'n4', text: 'A competitive pricing point', importance: 5, origin: 'template' },
  { id: 'n5', text: 'The technology is adaptable for future upgrades', importance: 3, origin: 'template' },
  { id: 'n6', text: 'Reliable', importance: 4, origin: 'template' },
  { id: 'n7', text: 'Fits our existing IT setup', importance: 3, origin: 'template' },
  { id: 'n8', text: 'Our data stays secure', importance: 4, origin: 'template' },
  { id: 'n9', text: 'Able to handle a change in fleet size', importance: 3, origin: 'template' },
  { id: 'n10', text: 'Easy for our operators to use', importance: 4, origin: 'template' },
  { id: 'n11', text: 'Customer service / support availability', importance: 4, origin: 'template' },
  { id: 'n12', text: 'Market consolidation', importance: 3, origin: 'template' },
];

const characteristics: House['characteristics'] = [
  { id: 'c1', text: 'Robot brands / models supported', direction: 'up' },
  { id: 'c2', text: 'Interoperability standards (e.g. VDA 5050)', direction: 'up' },
  { id: 'c3', text: '3rd-party integrations (lifts, doors, WMS)', direction: 'up' },
  { id: 'c4', text: 'Time from planning to deploying the software (weeks)', direction: 'down' },
  { id: 'c5', text: 'Time to onboard a new robot type (days)', direction: 'down' },
  { id: 'c6', text: 'Licence cost per robot / year (€)', direction: 'down' },
  { id: 'c7', text: 'Deployment options (cloud / on-prem)', direction: 'up' },
  { id: 'c8', text: 'Capacity of the software (robots per fleet)', direction: 'up' },
  { id: 'c9', text: 'Traffic incidents per 1,000 missions', direction: 'down' },
  { id: 'c10', text: 'Support response time (hours)', direction: 'down' },
];

// Illustrative team estimates (9 strong, 3 medium, 1 weak); Excel matrix not filled yet.
const matrix: Record<string, Partial<Record<string, Strength>>> = {
  n1: { c1: 3, c2: 9, c3: 1, c8: 3, c9: 9 },
  n2: { c1: 9, c2: 9, c3: 3, c5: 9 },
  n3: { c2: 1, c3: 9, c4: 3, c8: 1 },
  n4: { c4: 3, c5: 1, c6: 9, c7: 1 },
  n5: { c1: 3, c2: 9, c3: 3, c7: 3, c8: 3 },
  n6: { c7: 1, c8: 3, c9: 9, c10: 3 },
  n7: { c2: 3, c3: 9, c4: 3, c7: 9 },
  n8: { c7: 9, c10: 1 },
  n9: { c1: 3, c5: 3, c6: 3, c8: 9 },
  n10: { c3: 1, c4: 3, c5: 3, c10: 3 },
  n11: { c4: 1, c10: 9 },
  n12: { c1: 3, c2: 9, c7: 1 },
};

export const COMPETITORS: House['competitors'] = [
  { id: 'meili', name: 'Meili Robots' },
  { id: 'kinexon', name: 'KINEXON' },
  { id: 'synaos', name: 'SYNAOS' },
  { id: 'sinove', name: 'SIEMENS SINOVE' },
];

export function createTemplateHouse(): House {
  const relationships: House['relationships'] = {};
  for (const [needId, row] of Object.entries(matrix)) {
    for (const [charId, value] of Object.entries(row)) {
      if (value) relationships[relKey(needId, charId)] = value;
    }
  }
  return {
    needs: needs.map((n) => ({ ...n })),
    characteristics: characteristics.map((c) => ({ ...c })),
    relationships,
    // Roof as in the Excel draft
    roof: {
      [roofKey('c1', 'c2')]: '++',
      [roofKey('c3', 'c4')]: '-',
      [roofKey('c6', 'c7')]: '-',
      [roofKey('c8', 'c9')]: '-',
    },
    competitors: COMPETITORS.map((c) => ({ ...c })),
    ratings: {},
  };
}

import type { DocumentRef, Project } from '../types';
import { buildDraft } from '../ai/mockProvider';
import { cloneHouse, draftInputsKey, relKey } from '../lib/hoq';
import { createTemplateHouse } from './template';

/** Fictitious example projects. No real customer data. */

const demoDoc = (id: string, name: string, size: number, type: string): DocumentRef => ({
  id,
  name,
  size,
  type,
  addedAt: '2026-11-02T09:00:00.000Z',
  demo: true,
});

export function createSeedProjects(): Project[] {
  const hospital: Project = {
    id: 'demo-a',
    name: 'Hospital logistics, 3 buildings',
    customer: 'Customer A (fictitious)',
    vertical: 'Hospital',
    region: 'Germany',
    description:
      'University hospital plans autonomous transport of meals, linen and lab samples across three buildings. ' +
      'Robots from two vendors must share corridors with staff and patients and use lifts and automatic doors. ' +
      'Patient data protection: the software must run on-premise.',
    createdAt: '2026-11-02T09:00:00.000Z',
    updatedAt: '2026-11-05T14:30:00.000Z',
    documents: [
      demoDoc('d-a1', 'RFI_Customer_A_AMR_fleet_management.pdf', 1_460_000, 'application/pdf'),
      demoDoc('d-a2', 'Site_plan_buildings_1-3.pdf', 3_210_000, 'application/pdf'),
      demoDoc('d-a3', 'IT_security_requirements.docx', 182_000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ],
    answers: {
      fleet: '12 robots at go-live, up to 30 in three years',
      brands: 'Vendor X tugger robots, Vendor Y delivery robots',
      onprem: 'Yes',
      integrations: 'Lifts in all three buildings, automatic doors, SAP for transport orders',
      pricing: 'OpEx (subscription)',
      golive: 'Q3 2027',
    },
    example: true,
  };

  const automotive: Project = {
    id: 'demo-b',
    name: 'Assembly plant intralogistics',
    customer: 'Customer B (fictitious)',
    vertical: 'Manufacturing',
    region: 'Denmark',
    description:
      'Automotive supplier wants to run AMRs and automated forklifts in one assembly hall, three shifts. ' +
      'VDA 5050 is required; transport orders come from the existing MES.',
    createdAt: '2026-11-04T08:15:00.000Z',
    updatedAt: '2026-11-04T08:40:00.000Z',
    documents: [
      demoDoc('d-b1', 'Customer_B_RFI_questionnaire_120_questions.xlsx', 96_000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      demoDoc('d-b2', 'Layout_assembly_hall.pdf', 2_050_000, 'application/pdf'),
    ],
    answers: { brands: 'AMR vendor P, forklift AGVs from vendor Q' },
    example: true,
  };

  const warehouse: Project = {
    id: 'demo-c',
    name: '3PL warehouse expansion',
    customer: 'Customer C (fictitious)',
    vertical: 'Warehousing',
    region: 'Netherlands',
    description: 'Third-party logistics provider, budget-sensitive. Ramp-up from 20 to 80 robots in peak season.',
    createdAt: '2026-11-06T10:00:00.000Z',
    updatedAt: '2026-11-06T10:00:00.000Z',
    documents: [],
    answers: {},
    example: true,
  };

  for (const p of [hospital, automotive]) {
    p.draft = buildDraft({ project: p, documents: p.documents, answers: p.answers, template: createTemplateHouse() });
    p.draft.createdAt = p.updatedAt;
    p.draft.inputsKey = draftInputsKey(p);
    p.house = cloneHouse(p.draft.house);
  }

  // Example of the team overriding the AI draft
  if (hospital.house) {
    const pricing = hospital.house.needs.find((n) => n.id === 'n4');
    if (pricing) pricing.importance = 4;
    hospital.house.relationships[relKey('n-lifts', 'c7')] = 1;
    hospital.house.relationships[relKey('n8', 'c10')] = 3;
  }

  return [hospital, automotive, warehouse];
}

import { useCallback, useEffect, useState } from 'react';
import type { Project } from '../types';
import { createSeedProjects } from '../data/seed';
import { uid } from './hoq';

/**
 * Projects live in the browser's localStorage: no backend in the mockup.
 * Every viewer has their own copy; share projects via JSON export/import.
 */
const STORAGE_KEY = 'hoq-matchmaker:v1';

function load(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Project[];
    }
  } catch {
    // storage blocked or corrupt: fall back to demo data
  }
  return createSeedProjects();
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(load);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      setSaveError(null);
    } catch {
      setSaveError('Changes could not be saved in this browser (storage full or blocked). Export your project as JSON to keep it.');
    }
  }, [projects]);

  const update = useCallback((id: string, fn: (p: Project) => Project) => {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...fn(p), updatedAt: new Date().toISOString() } : p)));
  }, []);

  const add = useCallback((project: Project) => setProjects((ps) => [project, ...ps]), []);

  const remove = useCallback((id: string) => setProjects((ps) => ps.filter((p) => p.id !== id)), []);

  const importProject = useCallback((data: unknown): Project => {
    const p = data as Project;
    if (!p || typeof p !== 'object' || typeof p.name !== 'string' || !Array.isArray(p.documents)) {
      throw new Error('This file is not a HoQ Matchmaker project export.');
    }
    const imported: Project = { ...p, id: uid('p'), example: false, updatedAt: new Date().toISOString() };
    setProjects((ps) => [imported, ...ps]);
    return imported;
  }, []);

  const resetDemo = useCallback(() => setProjects(createSeedProjects()), []);

  return { projects, update, add, remove, importProject, resetDemo, saveError };
}

export type ProjectStore = ReturnType<typeof useProjects>;

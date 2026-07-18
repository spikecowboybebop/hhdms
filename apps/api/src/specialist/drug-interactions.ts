export interface InteractionWarning {
  drug_a: string;
  drug_b: string;
  severity: 'major' | 'moderate' | 'minor';
  description: string;
}

const INTERACTION_DB: [string, string, string, 'major' | 'moderate' | 'minor'][] = [
  ['Amlodipine', 'Simvastatin', 'Increased risk of myopathy/rhabdomyolysis. Limit simvastatin to 20mg daily.', 'major'],
  ['Warfarin', 'Aspirin', 'Increased bleeding risk. Monitor INR closely.', 'major'],
  ['Warfarin', 'Ibuprofen', 'Increased bleeding risk. Consider alternative NSAID.', 'major'],
  ['Metformin', 'Iodinated Contrast', 'Risk of lactic acidosis. Hold metformin 48h before procedure.', 'major'],
  ['ACE Inhibitors', 'Potassium Supplements', 'Risk of hyperkalemia. Monitor serum potassium.', 'moderate'],
  ['ACE Inhibitors', 'Spironolactone', 'Risk of hyperkalemia. Monitor serum potassium.', 'moderate'],
  ['Ciprofloxacin', 'Tizanidine', 'Increased tizanidine concentration. Avoid concurrent use.', 'major'],
  ['Clarithromycin', 'Simvastatin', 'Increased statin concentration. Risk of rhabdomyolysis.', 'major'],
  ['Lithium', 'NSAIDs', 'Increased lithium levels. Monitor lithium concentration.', 'moderate'],
  ['Methotrexate', 'Trimethoprim', 'Increased methotrexate toxicity. Avoid combination.', 'major'],
  ['Theophylline', 'Ciprofloxacin', 'Increased theophylline levels. Monitor levels.', 'moderate'],
  ['Digoxin', 'Amiodarone', 'Increased digoxin levels. Reduce digoxin dose by 50%.', 'major'],
  ['SSRIs', 'MAOIs', 'Risk of serotonin syndrome. Allow 14-day washout.', 'major'],
  ['Clopidogrel', 'Omeprazole', 'Reduced clopidogrel effectiveness. Use pantoprazole instead.', 'moderate'],
  ['Levofloxacin', 'QT-prolonging agents', 'Increased risk of QT prolongation. Monitor ECG.', 'moderate'],
];

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

const BRAND_ALIASES: Record<string, string[]> = {
  'atorvastatin': ['lipitor'],
  'simvastatin': ['zocor'],
  'amlodipine': ['norvasc'],
  'metformin': ['glucophage', 'glumetza'],
  'warfarin': ['coumadin', 'jantoven'],
  'ibuprofen': ['advil', 'motrin'],
  'ciprofloxacin': ['cipro'],
  'clarithromycin': ['biaxin'],
  'omeprazole': ['prilosec'],
  'pantoprazole': ['protonix'],
  'digoxin': ['lanoxin'],
  'amiodarone': ['cordarone', 'pacerone'],
  'spironolactone': ['aldactone'],
  'furosemide': ['lasix'],
  'lisinopril': ['zestril', 'prinivil'],
  'enalapril': ['vasotec'],
};

function resolveAliases(name: string): string[] {
  const n = normalize(name);
  const results = [n];
  for (const [generic, aliases] of Object.entries(BRAND_ALIASES)) {
    if (n === generic || aliases.includes(n)) {
      results.push(generic, ...aliases);
    }
  }
  return [...new Set(results)];
}

export function checkInteractions(
  newMeds: { drug_name?: string; generic_name?: string }[],
  activeMeds: { drug_name?: string; generic_name?: string }[],
): InteractionWarning[] {
  const allNames = (med: { drug_name?: string; generic_name?: string }): string[] =>
    resolveAliases(med.drug_name || med.generic_name || '');

  const existingNames = activeMeds.flatMap(allNames);
  const newNames = newMeds.flatMap(allNames);

  const warnings: InteractionWarning[] = [];
  const seen = new Set<string>();

  const addWarning = (a: string, b: string, severity: 'major' | 'moderate' | 'minor', description: string) => {
    const key = [normalize(a), normalize(b)].sort().join('||');
    if (!seen.has(key)) {
      seen.add(key);
      warnings.push({ drug_a: a, drug_b: b, severity, description });
    }
  };

  for (const [drugA, drugB, desc, severity] of INTERACTION_DB) {
    const normA = normalize(drugA);
    const normB = normalize(drugB);

    const aInNew = newNames.includes(normA);
    const bInNew = newNames.includes(normB);
    const aInExisting = existingNames.includes(normA);
    const bInExisting = existingNames.includes(normB);

    if ((aInNew && bInExisting) || (bInNew && aInExisting)) {
      addWarning(drugA, drugB, severity, desc);
    }

    if (aInNew && bInNew) {
      addWarning(drugA, drugB, severity, desc);
    }
  }

  return warnings;
}

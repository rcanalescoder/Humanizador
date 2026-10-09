import { rules, sources } from './rules.mjs';
import { referenceCatalogue } from './reference-catalogue.mjs';
export { evidence } from './reference-catalogue.mjs';
// An audit of references, separate from the frozen rules of saved analyses.
const catalogue = referenceCatalogue({ rules, sources });
export const coverage = catalogue.coverage;
export const catalogueValidation = catalogue.validation;

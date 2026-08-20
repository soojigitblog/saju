/** Hook Quality Pass — lightweight checks for behavior-first copy (free result). */

/** Generic praise / Barnum hook patterns to reject. */
export const GENERIC_HOOK_PATTERNS: RegExp[] = [
  /따뜻한\s*(마음|열정).*사람/,
  /섬세한\s*감성.*사람/,
  /책임감.*배려.*사람/,
  /현실감각.*추진력.*사람/,
  /은은하게\s*빛나/,
  /(열정|창의성|표현력|배려심|신중함|현실감각|집념|완벽주의|독립성|매력).*겸비/,
  /(열정|창의성|표현력|배려심|신중함).*가진\s*사람/,
  /(열정|창의성|표현력|배려심|신중함).*뛰어난\s*사람/,
  /부드러워\s*보여도\s*자기\s*기준/, // overused V2 template
  /조용해\s*보여도\s*방향/, // overused V2 template
  /차분한\s*척해도/, // overused V2 template
];

/** Hook should suggest observable behavior, not only adjectives. */
export const BEHAVIOR_MARKERS =
  /(?:하는\s*편|하기\s*쉽|할\s*때|하면|하지만|다고|느끼|말하|선택|결정|넘기|참|확인|챙|맡|듣|정하|미루|손대|말하면|알아차|고민|납득|책임|혼자|상대|일은|일을|답답|귀찮|선을|선\s|표현|관찰|맞추|손댄|끝까지|대충|오래|갑자기|속으로|마지막|정리|머릿속|쉬고|거리|단호|방식|바꾸|좋아|처음|웬만|지나|눈에|오류|피곤|맞춰|기준|있는|정해놓|생각)/;

export function validateHookQuality(hookLine: string): string[] {
  const errors: string[] = [];
  const trimmed = hookLine.trim();
  if (!trimmed) {
    errors.push("hookLine empty");
    return errors;
  }

  for (const re of GENERIC_HOOK_PATTERNS) {
    if (re.test(trimmed)) {
      errors.push(`hookLine generic praise/template: ${re.source}`);
    }
  }

  if (!BEHAVIOR_MARKERS.test(trimmed)) {
    errors.push("hookLine lacks behavior/situation marker");
  }

  return errors;
}

/** Detect overused reversal template across a batch (QA). */
export function countReversalTemplate(hooks: string[]): number {
  return hooks.filter((h) => /겉(으로)?.*(속|실제|본).*?(하지만|인데|면)/.test(h)).length;
}

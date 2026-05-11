type EffectiveRole = {
  effective_from: string | null;
  effective_to: string | null;
};

export function isRoleActiveForDate(role: EffectiveRole, dateIso: string): boolean {
  const startsOk = !role.effective_from || role.effective_from <= dateIso;
  const endsOk = !role.effective_to || role.effective_to >= dateIso;
  return startsOk && endsOk;
}

export function hasAnyActiveRole(roles: EffectiveRole[], dateIso: string): boolean {
  return roles.some((role) => isRoleActiveForDate(role, dateIso));
}

